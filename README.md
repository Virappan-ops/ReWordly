# Rewordly

A standalone Windows desktop writing assistant with a locally served browser interface and Python FastAPI backend. Supports local **Ollama** models and **Google Gemini**, featuring **Paraphraser** and **Humanizer** modes, word-level accessible diffs, and contextual synonym suggestions.

## Features
- **Runtime Provider Switching**: Switch between Ollama (`qwen2.5-coder:7b` default) and Gemini (`gemini-3.8-flash` default) on the fly without restarting.
- **Modes & Options**: Paraphraser & Humanizer modes with configurable Strength (1–5), Tone (`neutral`, `formal`, `casual`), and Length (`shorter`, `same`, `longer`).
- **Deterministic Sentence Splitter**: Standard-library state-machine splitter handling decimals, initials, quotes, and abbreviations while preserving exact whitespace and paragraph structure.
- **Accessible Word-Level Diff**: Uses `difflib.SequenceMatcher` with pale red (`#FDE2E2`) removals and pale green (`#DCFCE7`) additions alongside non-color visual indicators (`[-]` / `[+]`) and `aria-label` attributes.
- **Contextual Synonym Suggestions**: Highlight any word or short phrase in either the Input or Output pane to fetch context-aware replacements and immediately recompute the diff.

## Windows Setup & Launch Instructions

### 1. Create and Activate Virtual Environment
Open PowerShell in the project folder (`F:\Quillbot\`):
```powershell
cd ReWordly
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```powershell
mkdir Humanizer_Model
```

**NOTE**: Download humanizer-12b-Q3-QAT.gguf or another humanizer model file based on your device's GPU and CPU from huggingface and put it inside Humanizer_Model folder.

```powershell
cd ReWordly\Humanizer_Model

@'
FROM ./humanizer-12b-Q3-QAT.gguf //here use your model's exact gguf
TEMPLATE """{{ .Prompt }}"""
PARAMETER temperature 1.0
PARAMETER top_p 0.95
PARAMETER top_k 0
PARAMETER min_p 0
PARAMETER repeat_penalty 1.0
PARAMETER num_ctx 8192
PARAMETER num_predict 2048
PARAMETER stop "### "
'@ | Out-File -Encoding utf8 -NoNewline "Modelfile"

ollama create humanizer -f Modelfile
```
```powershell
ollama list
```

### 4. Troubleshooting Ollama:
If you see a provider unavailable warning:
1. Make sure the Ollama application is open and running in your system tray.
2. Verify your models are installed by running: `ollama list`
3. Ensure your humanizer model is built: `ollama create humanizer -f Modelfile`

### 5. env Format
GEMINI_API_KEY=
REWORDLY_GEMINI_MODEL=Gemini 3.8 Flash //other model of your choice
REWORDLY_OLLAMA_URL=http://localhost:11434
REWORDLY_OLLAMA_MODEL=qwen2.5:7b-instruct //other model of your choice
REWORDLY_OLLAMA_HUMANIZER_MODEL=humanizer
REWORDLY_OLLAMA_TIMEOUT=120

### 6. Start

For Backend
```powershell
cd Rewordly
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
For Frontend
```powershell
cd Rewordly\frontend
npm run dev
```