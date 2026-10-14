module.exports = async (kernel) => {
  const isAmd = kernel.gpu === "amd"
  // Windows systems with an AMD APU expose the integrated Radeon (e.g.
  // gfx1036) alongside the dedicated Radeon. The ROCm wheel only carries
  // kernels for the dedicated GPU's gfx target, and while both devices are
  // visible the dedicated GPU's kernels fail to load
  // (hipErrorInvalidImage / hipErrorInvalidKernelFile). Restrict HIP to the
  // device whose gfx target the installed torch was built for so the iGPU
  // stays available for display.
  const isWinAmd = kernel.platform === "win32" && isAmd
  const env = {}
  if (isAmd) {
    env.TORCH_COMPILE_BACKEND = "eager"
    env.MIOPEN_FIND_MODE = "FAST"
    env.ACESTEP_LM_BACKEND = "pt"
  }
  if (isWinAmd) {
    env.HIP_VISIBLE_DEVICES = "{{local.hip_visible_devices}}"
    env.ACESTEP_ROCM_SHIM = "1"
  }
  return {
    daemon: true,
    run: [
      ...(isWinAmd ? [{
        method: "shell.run",
        params: {
          path: "app",
          message: [
            "uv run --no-sync python -c \"import torch;al=torch.cuda.get_arch_list();d=[i for i in range(torch.cuda.device_count()) if torch.cuda.get_device_properties(i).gcnArchName in al];print('PINOKIO_GPU_INDEX='+str(d[0] if d else 0))\""
          ],
          on: [{
            event: "/PINOKIO_GPU_INDEX=(\\d+)/",
            done: true
          }]
        }
      }, {
        method: "local.set",
        params: {
          hip_visible_devices: "{{input.event[1]}}"
        }
      }] : []),
      {
        method: "shell.run",
        params: {
          env: env,
          path: "app",
          // AMD installs a ROCm torch outside the uv lockfile, so it must not
          // be re-synced (uv run --no-sync).
          message: [
            "uv run {{gpu === 'amd' ? '--no-sync ' : ''}}acestep --port {{port}}{{platform === 'darwin' ? ' --init_service true --init_llm true --backend pt --lm_model_path acestep-5Hz-lm-1.7B' : ''}}"
          ],
          on: [{
            event: "/(http:\\/\\/[0-9.:]+)/",
            done: true
          }]
        }
      },
      {
        method: "local.set",
        params: {
          url: "{{input.event[1]}}"
        }
      }
    ]
  }
}
