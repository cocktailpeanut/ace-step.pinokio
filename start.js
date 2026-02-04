module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        env: { },
        path: "app",
        message: [
          "uv run acestep --port {{port}}{{platform === 'darwin' ? ' --init_service true --init_llm true --backend pt --lm_model_path acestep-5Hz-lm-1.7B' : ''}}"
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
