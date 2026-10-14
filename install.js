module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/ace-step/ACE-Step-1.5.git app"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv sync"
        ]
      }
    },
    // AMD GPUs need a ROCm build of PyTorch matching the local gfx target.
    // torch.js installs it into the project's uv-managed venv.
    {
      when: "{{gpu === 'amd'}}",
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          path: "app"
        }
      }
    },
    // torchao is incompatible with ROCm on Windows: it imports
    // torch.distributed._functional_collectives, which is not compiled in the
    // Windows ROCm wheels.
    {
      when: "{{platform === 'win32' && gpu === 'amd'}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv pip uninstall torchao"
        ]
      }
    },
    // Windows ROCm wheels ship a stubbed torch.distributed without the
    // ReduceOp/group symbols that vector_quantize_pytorch imports at load time.
    // Install a guarded sitecustomize shim so those imports resolve.
    {
      when: "{{platform === 'win32' && gpu === 'amd'}}",
      method: "fs.write",
      params: {
        path: "app/.venv/Lib/site-packages/sitecustomize.py",
        text: [
          "import os",
          "if os.environ.get(\"ACESTEP_ROCM_SHIM\") == \"1\":",
          "    try:",
          "        import torch.distributed as _dist",
          "    except Exception:",
          "        _dist = None",
          "    if _dist is not None:",
          "        if not hasattr(_dist, \"ReduceOp\"):",
          "            class ReduceOp:",
          "                SUM = 0",
          "                PRODUCT = 1",
          "                MIN = 2",
          "                MAX = 3",
          "                BAND = 4",
          "                BOR = 5",
          "                BXOR = 6",
          "                PREMUL_SUM = 7",
          "                AVG = 8",
          "            _dist.ReduceOp = ReduceOp",
          "        if not hasattr(_dist, \"group\"):",
          "            class group:",
          "                WORLD = -100",
          "            _dist.group = group",
          ""
        ].join("\n")
      }
    },
    // Non-AMD platforms keep the upstream default (CUDA/CPU torch from uv sync).
    {
      when: "{{gpu !== 'amd'}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv pip install torchao"
        ]
      }
    },
    {
      method: "fs.link",
      params: {
        drive: {
          checkpoints: "app/checkpoints"
        },
        peers: [
          "https://github.com/cocktailpeanut/ace-step-ui.pinokio.git",
          "https://github.com/cocktailpeanut/ace-step.pinokio.git"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv run {{gpu === 'amd' ? '--no-sync ' : ''}}acestep-download"
        ]
      }
    }
  ]
}
