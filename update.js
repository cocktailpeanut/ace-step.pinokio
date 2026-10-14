module.exports = {
  run: [{
    method: "shell.run",
    params: {
      message: "git pull"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app",
      message: "git pull"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app",
      message: "uv sync"
    }
  }, {
    when: "{{gpu === 'amd'}}",
    method: "script.start",
    params: {
      uri: "torch.js",
      params: {
        path: "app"
      }
    }
  }, {
    when: "{{gpu !== 'amd'}}",
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "uv pip install torchao"
      ]
    }
  }, {
    when: "{{platform === 'win32' && gpu === 'amd'}}",
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "uv pip uninstall torchao"
      ]
    }
  }, {
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
  }]
}
