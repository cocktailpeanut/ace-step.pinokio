# ACE-Step 1.5 (Pinokio)

## What it does
ACE-Step 1.5 is a local music generation model with a Gradio web UI and a REST API server.

## How to use (Pinokio)
- Install: Click "Install" to clone the repo into `app/` and run `uv sync`.
- Start: Click "Start" to launch the web UI, then open the "Open Web UI" tab.
- Update: Click "Update" to pull the latest launcher and app changes.
- Reset: Click "Reset" to remove `app/` and reinstall from scratch.
- Save Disk Space: Click "Save Disk Space" to deduplicate Python packages.

Notes:
- The first run may download model checkpoints.
- The launcher auto-assigns a free port; edit `start.js` if you need a fixed port.

## API access
ACE-Step 1.5 supports programmatic access via a REST API server and (optionally) Gradio API.

### Start the REST API server
Run in the `app/` folder:

```
uv run acestep-api
```

By default this serves on `http://127.0.0.1:8001`. You can override the port with `--port <port>`.

### Optional: enable Gradio API on the UI server
You can start the UI server with API enabled (and optional API key):

```
uv run acestep --enable-api --api-key 0000 --port 7860
```

### API examples (templates)
Replace `<endpoint>` and payload keys with the exact values from the upstream API docs.

Curl:
```
curl -X POST http://127.0.0.1:8001/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{"prompt":"your prompt here"}'
```

Python:
```python
import requests

payload = {"prompt": "your prompt here"}
response = requests.post("http://127.0.0.1:8001/<endpoint>", json=payload)
response.raise_for_status()
print(response.json())
```

JavaScript:
```javascript
const payload = { prompt: "your prompt here" }
const res = await fetch("http://127.0.0.1:8001/<endpoint>", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
const data = await res.json()
console.log(data)
```

### Optional model download
If you want to pre-download checkpoints:

```
uv run acestep-download --cache_dir ./checkpoints
```
