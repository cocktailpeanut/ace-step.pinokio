module.exports = {
  daemon: true,
  run: [
    {
      when: "{{gpu === 'nvidia' && platform === 'linux'}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "venv",
        message: [
          "uv run python ../get_cuda_arch.py"
        ]
      }
    },
    {
      when: "{{gpu === 'nvidia' && platform === 'linux'}}",
      method: "local.set",
      params: {
        cuda_arch: "{{input.stdout.match(/CUDA_ARCH:(\\d+\\.\\d+)/)?.[1] || '8.9'}}",
        venv: "venv"
      }
    },
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && local.cuda_arch && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        env: { },
        path: "app",
        venv: "venv",
        message: [
          "uv run python acestep/api_server.py --port {{port}}"
        ],
        on: [{
          event: "/(http:\/\/[0-9.:]+)/",
          done: true
        }]
      }
    },
    {
      when: "{{!(gpu === 'nvidia' && platform === 'linux' && local.cuda_arch && Number(local.cuda_arch.split('.')[0]) >= 12)}}",
      method: "shell.run",
      params: {
        env: { },
        path: "app",
        message: [
          "uv run acestep --port {{port}}"
        ],
        on: [{
          event: "/(http:\/\/[0-9.:]+)/",
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
