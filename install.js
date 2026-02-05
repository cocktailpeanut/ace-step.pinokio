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
          "uv sync",
          "uv pip install torchao"
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
