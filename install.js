module.exports = {
  run: [
    // 1. Clone the repository
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/ace-step/ACE-Step-1.5.git app"
        ]
      }
    },
    // 1 Create venv with Python 3.11 (Required by pyproject.toml)
    {
      when: "{{gpu === 'nvidia' && platform === 'linux'}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "rm -rf venv",
          "uv venv --python 3.11 venv"
        ]
      }
    },
    // 1.5 Create CUDA detection script for Linux
    {
      when: "{{gpu === 'nvidia' && platform === 'linux'}}",
      method: "fs.write",
      params: {
        path: "get_cuda_arch.py",
        json: false,
        text: "import ctypes, sys\ndef get_arch():\n    try:\n        if sys.platform == 'win32': \n            lib = ctypes.CDLL('nvcuda.dll')\n        else: \n            try:\n                lib = ctypes.CDLL('libcuda.so')\n            except:\n                lib = ctypes.CDLL('libcuda.so.1')\n        if lib.cuInit(0) != 0: return None\n        cnt = ctypes.c_int()\n        lib.cuDeviceGetCount(ctypes.byref(cnt))\n        if cnt.value == 0: return None\n        dev = ctypes.c_int()\n        lib.cuDeviceGet(ctypes.byref(dev), 0)\n        major = ctypes.c_int()\n        minor = ctypes.c_int()\n        lib.cuDeviceGetAttribute(ctypes.byref(major), 75, dev)\n        lib.cuDeviceGetAttribute(ctypes.byref(minor), 76, dev)\n        print(f\"CUDA_ARCH:{major.value}.{minor.value}\")\n    except: pass\nget_arch()"
      }
    },
    // 1.6 Run detection for Linux
    {
      when: "{{gpu === 'nvidia' && platform === 'linux'}}",
      method: "shell.run",
      params: {
        venv: "venv",
        path: ".",
        message: [
          "python get_cuda_arch.py"
        ]
      }
    },
    // 1.7 Set local variable
    {
      method: "local.set",
      params: {
        cuda_arch: "{{input.stdout.match(/CUDA_ARCH:(\\d+\\.\\d+)/)?.[1] || '8.9'}}"
      }
    },
    // 2. Install llvmdev and base build tools (Blackwell/Linux)
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "venv",
        message: [
          "conda install -y -c conda-forge llvmdev=19"
        ]
      }
    },
    // 3. Create venv and install PyTorch nightly FIRST (Blackwell/Linux)
    // This must happen BEFORE uv sync to avoid version conflicts
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "venv",
        env: {
          TORCH_CUDA_ARCH_LIST: "{{local.cuda_arch}}",
          TORCH_CUDNN_V8_API_ENABLED: "1",
          UV_EXTRA_INDEX_URL: "https://download.pytorch.org/whl/nightly/cu128"
        },
        message: [
          "echo 'DEBUG: Pinokio is passing TORCH_CUDA_ARCH_LIST=' $TORCH_CUDA_ARCH_LIST",
          "uv pip install wheel setuptools ninja packaging numpy",
          "uv pip install --upgrade --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128"
        ]
      }
    },

    // 4. Build and install llvmlite + numba (Blackwell/Linux)
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "venv",
        build: true,
        env: {
          TORCH_CUDA_ARCH_LIST: "{{local.cuda_arch}}",
          TORCH_CUDNN_V8_API_ENABLED: "1",
          UV_EXTRA_INDEX_URL: "https://download.pytorch.org/whl/nightly/cu128",
          LLVM_CONFIG: "{{which('llvm-config')}}",
          CMAKE_IGNORE_PATH: "/usr/lib64/cmake/llvm;/usr/lib/cmake/llvm",
          LLVMLITE_SKIP_LLVM_VERSION_CHECK: "1"
        },
        message: [
          "git clone https://github.com/numba/llvmlite.git",
          "sed -i 's/decref->moveBefore(term->getIterator());/decref->moveBefore(\\&*term);/g' ./llvmlite/ffi/custom_passes.cpp",
          "cd llvmlite && uv pip install --upgrade . --no-build-isolation",
          "uv pip install git+https://github.com/numba/numba.git --no-build-isolation"
        ]
      }
    },
    // 6. Build TorchAO from source (Blackwell/Linux)
    // This fixes the torchao 0.15.0 + torch 2.10.0+cu128 incompatibility
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "venv",
        build: true,
        env: {
          TORCH_CUDA_ARCH_LIST: "{{local.cuda_arch}}",
          TORCH_CUDNN_V8_API_ENABLED: "1",
          UV_EXTRA_INDEX_URL: "https://download.pytorch.org/whl/nightly/cu128"
        },
        message: [
          "uv pip install git+https://github.com/pytorch/ao.git --no-build-isolation",
          "uv pip install peft lightning lightning-fabric"
        ]
      }
    },
    // 7. Download models with Blackwell optimizations (Blackwell/Linux)
    {
      when: "{{gpu === 'nvidia' && platform === 'linux' && Number(local.cuda_arch.split('.')[0]) >= 12}}",
      method: "shell.run",
      params: {
        path: "app",
        env: {
          TORCH_CUDNN_V8_API_ENABLED: "1",
          TORCH_CUDA_ARCH_LIST: "{{local.cuda_arch}}"
        },
        message: [
          "uv sync --inexact --active --no-install-package numba --no-install-package llvmlite --no-install-package torchao --no-install-package torch --no-install-package torchvision --no-install-package torchaudio",
          "uv run --no-sync --active acestep-download"
        ]
      }
    },
    // 8. Standard Install (Base dependencies)
    {
      when: "{{!(gpu === 'nvidia' && platform === 'linux' && local.cuda_arch.startsWith('12'))}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv sync --inexact",
          "uv pip install torchao"
        ]
      }
    },

    // 9. Standard Download (Fallback)
    {
      when: "{{!(gpu === 'nvidia' && platform === 'linux' && local.cuda_arch.startsWith('12'))}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "uv run --no-sync acestep-download"
        ]
      }
    }
  ]
}

