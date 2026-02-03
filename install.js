module.exports = {
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
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv run acestep-download"
        ]
      }
    }
  ]
}
