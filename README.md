# ReWordly

A local-first writing assistant for paraphrasing and humanizing your own drafts. ReWordly runs models on your own computer through [Ollama](https://ollama.com), or uses Google Gemini with your own API key. Every change is shown word by word, so you can see exactly what the model altered.

**Live demo:** https://re-wordly-flame.vercel.app/

> **Note:** The live demo is for testing the interface only. The Humanizer model is not hosted there. To get real Humanizer results, download the model and run ReWordly locally with Ollama, as described in [Optional: the Humanizer model](#optional-the-humanizer-model) below.


## Features

- **Two modes:** Paraphraser rewrites for clarity and variety. Humanizer rewrites to read more naturally.
- **Choose your provider:** Ollama (local, private) or Google Gemini (cloud, your API key). Switch at any time without restarting.
- **Tuning controls:** Strength (1–5), Tone (neutral, formal, casual), and Length (shorter, same, longer).
- **Word-level diff:** Removed words are shown in red with a `[-]` marker, and added words in green with a `[+]` marker. Colour is never the only signal.
- **Synonym suggestions:** Select a word or short phrase in either pane and request alternatives that fit its context.
- **Session history:** Recent rewrites are kept in memory and cleared when you reload the page. Nothing is written to disk.
- **Light and dark themes**, with the light theme as the default.

## Hosted demo vs. local use

The Vercel deployment serves only the frontend. It cannot reach Ollama or the Humanizer model, because those run on your own computer. Rewrites in the hosted demo will fail with a "provider unavailable" message unless you point it at a server you control.

For the real Humanizer experience:

1. Install Ollama and the Humanizer model (see the section below).
2. Run the backend and frontend locally.
3. Open the local address, not the demo link.

## Requirements

- Windows 10 or 11
- Python 3.11 or newer
- Node.js 18 or newer
- [Ollama](https://ollama.com), if you want local models
- A Google Gemini API key, if you want Gemini

## Quick start (Windows, PowerShell)

### 1. Get the code

```powershell
git clone https://github.com/Virappan-ops/ReWordly.git
cd ReWordly
```

### 2. Set up the backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Set up the frontend

```powershell
cd frontend
npm install
cd ..
```

### 4. Configure (optional)

Copy `.env.example` to `.env` and fill in only what you need. The app reads these variables from your environment, so set them in PowerShell or your system settings. Never commit a real key.

```powershell
$env:GEMINI_API_KEY = "your-key-here"
```

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Required only for Gemini |
| `REWORDLY_GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `REWORDLY_OLLAMA_URL` | `http://localhost:11434` | Ollama server address |
| `REWORDLY_OLLAMA_MODEL` | `qwen2.5-coder:7b` | Ollama model for rewriting |
| `REWORDLY_OLLAMA_TIMEOUT` | `120` | Seconds to wait for Ollama |

For rewriting, a general instruct model such as `qwen2.5:7b-instruct` works better than the coder model. Pull it first with `ollama pull qwen2.5:7b-instruct`, then set `REWORDLY_OLLAMA_MODEL` to that name.

### 5. Run the app

Open two PowerShell windows.

Backend:

```powershell
cd ReWordly
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd ReWordly\frontend
npm run dev
```

Then open the address the frontend prints, usually http://localhost:5173.

## Optional: the Humanizer model

The Humanizer mode works best with a fine-tuned model. The model file is not in this repo, because it is several gigabytes. It is available from [jialinyyzz/humanizer](https://huggingface.co/jialinyyzz/humanizer) on Hugging Face under Apache 2.0.

Choose a file that fits your memory. On a 6 GB GPU, `humanizer-12b-IQ2_XS-QAT.gguf` or `humanizer-12b-Q3-QAT.gguf` are the realistic options. The model card lists the other sizes.

Build it into Ollama with a Modelfile that uses the author's prompt template:

```powershell
cd ReWordly
mkdir humanizer-model
cd humanizer-model
# Put the downloaded .gguf file in this folder, then create a file named Modelfile:
```

Contents of `Modelfile` (replace the file name with yours):

```
FROM ./humanizer-12b-Q3-QAT.gguf
TEMPLATE """{{- $draft := "" }}{{- range .Messages }}{{- if eq .Role "user" }}{{- $draft = .Content }}{{- end }}{{- end }}Rewrite the text below so it reads like a person wrote it, not a language model.

Reorganize it as you see fit. Vary sentence length on purpose. Cut hedging,
throat-clearing, and any sentence that only announces what comes next.
Prefer the concrete word over the abstract one. It is fine to sound uneven.

Every fact, number, unit, date, name and quotation must survive unchanged.

{{ $draft }}

### Rewritten:{{ "\n\n" }}"""
PARAMETER temperature 1.0
PARAMETER top_p 0.95
PARAMETER top_k 0
PARAMETER min_p 0
PARAMETER repeat_penalty 1.0
PARAMETER num_ctx 8192
PARAMETER num_predict 2048
```

Then build and check it:

```powershell
ollama create humanizer -f Modelfile
ollama list
```

Set it in PowerShell before starting the backend:

```powershell
$env:REWORDLY_OLLAMA_MODEL = "humanizer"
$env:REWORDLY_OLLAMA_TIMEOUT = "300"
```

## Troubleshooting

- **"The selected provider is unavailable":** Open the Ollama app so it runs in the system tray, then check `ollama list`. For Gemini, confirm `GEMINI_API_KEY` is set in the same PowerShell window that runs the backend.
- **"Gemini is not configured":** Set `GEMINI_API_KEY` and restart the backend.
- **Ollama model not found:** Run `ollama pull <model>` or `ollama create humanizer -f Modelfile`, then match the name in `REWORDLY_OLLAMA_MODEL`.
- **Slow or out of memory on a Humanizer model:** Use a smaller quantization, close GPU-heavy programs, and check the processor split with `ollama ps`.
- **Rewrites change numbers, dates or names:** Read the output before you use it. Models can make these mistakes.

## Testing

```powershell
python -m pytest tests -q
```

## Limitations

- ReWordly is a drafting aid. It is not meant for patent claims, legal text or research papers without careful human checking.
- Output quality depends on the model you choose. Small local models make more meaning changes than large cloud models.
- Session history is in memory only and is lost on reload.

## Privacy

With Ollama, text stays on your computer. With Gemini, text is sent to Google under your API key and their terms.

## License

Choose a license before making the repository public, for example MIT. Until you add a `LICENSE` file, the code is all rights reserved by default.