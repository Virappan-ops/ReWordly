import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, X, RefreshCw, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { StatefulButton } from "@/components/ui/stateful-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

const MODES = { paraphraser: "Paraphraser", humanizer: "Humanizer" };
const PROVIDERS = { ollama: "Ollama (Local)", gemini: "Google Gemini" };
const TONES = { neutral: "Neutral", formal: "Formal", casual: "Casual" };
const LENGTHS = { shorter: "Shorter", same: "Same length", longer: "Longer" };

const REMOVED =
  "mx-px rounded border-b-2 border-dashed border-red-600 bg-[#FDE2E2] px-1 py-0.5 text-red-950 line-through decoration-red-600 dark:bg-red-500/20 dark:text-red-200 dark:decoration-red-400";
const ADDED =
  "mx-px rounded border-b-2 border-emerald-600 bg-[#DCFCE7] px-1 py-0.5 font-medium text-emerald-950 no-underline dark:bg-emerald-500/20 dark:text-emerald-200";
const MARK = "mr-0.5 select-none text-[0.72em] font-bold";

const BAR_COLORS = ["bg-amber-300", "bg-amber-400", "bg-amber-500", "bg-orange-500", "bg-orange-600"];

function DiffView({ tokens }) {
  if (!tokens || tokens.length === 0) {
    return (
      <span className="text-sm italic text-stone-400 dark:text-stone-500">
        Changes appear here after you run a rewrite.
      </span>
    );
  }
  return (
    <>
      {tokens.map((tok, idx) => {
        if (tok.type === "removed") {
          return (
            <del key={idx} aria-label={`Removed: ${tok.text}`} className={REMOVED}>
              <span aria-hidden="true" className={MARK}>[-]</span>
              {tok.text}
            </del>
          );
        }
        if (tok.type === "added") {
          return (
            <ins key={idx} aria-label={`Added: ${tok.text}`} className={ADDED}>
              <span aria-hidden="true" className={MARK}>[+]</span>
              {tok.text}
            </ins>
          );
        }
        return <span key={idx}>{tok.text}</span>;
      })}
    </>
  );
}

function OptionMenu({ label, value, onChange, options, width }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`inline-flex h-9 items-center justify-between gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 ${width}`}
        >
          <span className="truncate">{options[value]}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={width}>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {Object.entries(options).map(([key, text]) => (
              <DropdownMenuRadioItem key={key} value={key} className="text-sm">
                {text}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Five rising bars. Click, drag across them, or use the arrow keys.
function StrengthMeter({ value, onChange }) {
  const set = (v) => onChange(Math.min(5, Math.max(1, v)));

  const fromPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    set(Math.ceil(((e.clientX - rect.left) / rect.width) * 5));
  };

  const handleKeyDown = (e) => {
    const next = {
      ArrowRight: value + 1,
      ArrowUp: value + 1,
      ArrowLeft: value - 1,
      ArrowDown: value - 1,
      Home: 1,
      End: 5,
    }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      set(next);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Strength</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Rewrite strength"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={`${value} of 5`}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) fromPointer(e);
        }}
        className="flex h-9 cursor-pointer touch-none select-none items-end gap-1 rounded-md px-1 pb-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            aria-hidden="true"
            style={{ height: 6 + n * 4 }}
            className={`w-2.5 rounded-sm transition-all duration-200 ${
              n <= value ? BAR_COLORS[n - 1] : "bg-stone-300 dark:bg-stone-700"
            }`}
          />
        ))}
      </div>
      <span className="w-8 text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">
        {value}/5
      </span>
    </div>
  );
}

function Pane({
  id,
  title,
  counter,
  actions,
  textareaRef,
  value,
  onChange,
  placeholder,
  label,
  diffTitle,
  diffKind,
  tokens,
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex min-w-0 flex-col">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <h2
            id={`${id}-heading`}
            className="text-sm font-semibold text-stone-900 dark:text-stone-100"
          >
            {title}
          </h2>
          {counter}
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </div>

      <textarea
        id={`${id}-textarea`}
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-[380px] w-full flex-1 resize-y bg-transparent px-4 py-2 text-[15px] leading-7 text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/60 lg:min-h-[46vh] dark:text-stone-100 dark:placeholder:text-stone-500"
      />

      <div className="border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-4 pt-3 text-xs font-medium text-stone-500 dark:text-stone-400">
          <span>{diffTitle}</span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
              diffKind === "removed"
                ? "border-b border-dashed border-red-600 bg-[#FDE2E2] text-red-900 dark:bg-red-500/20 dark:text-red-200"
                : "border-b border-emerald-600 bg-[#DCFCE7] text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-200"
            }`}
          >
            {diffKind === "removed" ? "[-] Removed" : "[+] Added"}
          </span>
        </div>
        <div
          id={`${id}-diff-view`}
          aria-label={`${title} word-level changes`}
          className="max-h-[40vh] min-h-[140px] overflow-y-auto whitespace-pre-wrap px-4 py-3 text-[15px] leading-7 text-stone-900 dark:text-stone-100"
        >
          <DiffView tokens={tokens} />
        </div>
      </div>
    </section>
  );
}

export default function ParaphraserPage({
  settings,
  setSettings,
  inputText,
  setInputText,
  outputText,
  setOutputText,
  inputTokens,
  setInputTokens,
  outputTokens,
  setOutputTokens,
  onAddHistory,
}) {
  const { provider, mode, strength, tone, length } = settings;
  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const [synonymPanelOpen, setSynonymPanelOpen] = useState(false);
  const [synonymLoading, setSynonymLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectionState, setSelectionState] = useState({
    pane: "input",
    start: 0,
    end: 0,
    selectedText: "",
    context: "",
  });

  const inputRef = useRef(null);
  const outputRef = useRef(null);

  const charCount = inputText.length;

  const recomputeDiff = async (nextSource, nextTarget) => {
    if (!nextSource && !nextTarget) {
      setInputTokens([]);
      setOutputTokens([]);
      return;
    }
    try {
      const resp = await fetch("/api/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: nextSource, target: nextTarget }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setInputTokens(data.diff.input_tokens);
      setOutputTokens(data.diff.output_tokens);
    } catch {
      // Ignore transient diff calculation error
    }
  };

  // Keep the diff in step with manual edits (short pause after typing)
  useEffect(() => {
    if (!inputText.trim() || !outputText.trim()) return undefined;
    const timer = setTimeout(() => recomputeDiff(inputText, outputText), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, outputText]);

  // Returns null (no request made), false (failed) or true (done) for the Run button
  const handleRunRewrite = async () => {
    if (!inputText.trim()) {
      toast.warning("Enter text before running a rewrite.", { position: "top-center" });
      return null;
    }

    if (inputText.length > 20000) {
      toast.warning("Your input is too long. The maximum is 20,000 characters.", {
        position: "top-center",
      });
      return null;
    }

    setSynonymPanelOpen(false);

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          provider,
          mode,
          options: { strength, tone, length },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error?.message || "An unexpected error occurred.";
        toast.warning(msg, { position: "top-center", duration: 4500 });
        return false;
      }

      setOutputText(data.output_text);
      setInputTokens(data.diff.input_tokens);
      setOutputTokens(data.diff.output_tokens);

      onAddHistory({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider,
        model_used: data.model_used,
        mode,
        options: { strength, tone, length },
        inputText,
        outputText: data.output_text,
        inputTokens: data.diff.input_tokens,
        outputTokens: data.diff.output_tokens,
      });

      return true;
    } catch {
      toast.warning(
        "The selected provider is unavailable. Check that it is running and try again.",
        { position: "top-center", duration: 4500 }
      );
      return false;
    }
  };

  const fetchSynonyms = async (selState) => {
    setSynonymLoading(true);
    setCandidates([]);
    try {
      const response = await fetch("/api/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selState.selectedText,
          context: selState.context,
          provider,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.warning(data?.error?.message || "Could not fetch suggestions.", {
          position: "top-center",
        });
        setSynonymPanelOpen(false);
        return;
      }
      setCandidates(data.candidates || []);
    } catch {
      toast.warning("Unable to load synonym suggestions from the provider.", {
        position: "top-center",
      });
    } finally {
      setSynonymLoading(false);
    }
  };

  const handleSuggestAlternatives = async (paneType) => {
    const textarea = paneType === "input" ? inputRef.current : outputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const fullText = paneType === "input" ? inputText : outputText;
    const selectedText = fullText.slice(start, end).trim();

    if (!selectedText) {
      toast.warning("Select a word or short phrase in the pane before requesting alternatives.", {
        position: "top-center",
      });
      return;
    }

    const rawSlice = fullText.slice(start, end);
    const leadingTrim = rawSlice.length - rawSlice.trimStart().length;
    const trailingTrim = rawSlice.length - rawSlice.trimEnd().length;
    const exactStart = start + leadingTrim;
    const exactEnd = end - trailingTrim;

    const ctxStart = Math.max(0, exactStart - 60);
    const ctxEnd = Math.min(fullText.length, exactEnd + 60);
    const snippet = fullText.slice(ctxStart, ctxEnd);

    const nextSelectionState = {
      pane: paneType,
      start: exactStart,
      end: exactEnd,
      selectedText,
      context: snippet,
    };

    setSelectionState(nextSelectionState);
    setSynonymPanelOpen(true);
    await fetchSynonyms(nextSelectionState);
  };

  const handleApplyCandidate = async (candidate) => {
    const { pane, start, end, selectedText } = selectionState;
    const source = pane === "input" ? inputText : outputText;

    // The text may have been edited since the selection was made
    if (source.slice(start, end) !== selectedText) {
      toast.warning("The text changed since you selected it. Select the word again.", {
        position: "top-center",
      });
      setSynonymPanelOpen(false);
      return;
    }

    const updated = source.slice(0, start) + candidate + source.slice(end);
    if (pane === "input") {
      setInputText(updated);
      await recomputeDiff(updated, outputText);
    } else {
      setOutputText(updated);
      await recomputeDiff(inputText, updated);
    }
    setSynonymPanelOpen(false);
    toast.success(`Replaced with "${candidate}"`, { position: "top-center", duration: 1800 });
  };

  const removeCandidateFromList = (candidateToRemove) => {
    setCandidates((prev) => prev.filter((c) => c !== candidateToRemove));
  };

  const clearTokens = () => {
    setInputTokens([]);
    setOutputTokens([]);
  };

  const suggestButton = (pane) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => handleSuggestAlternatives(pane)}
      className="h-8 text-xs text-stone-700 dark:text-stone-300"
      title="Select a word or phrase first, then click here"
    >
      Suggest alternatives
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-5 sm:px-6">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div
          role="toolbar"
          aria-label="Rewrite controls"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-950/40"
        >
          <div
            role="radiogroup"
            aria-label="Mode"
            className="inline-flex rounded-md border border-stone-300 bg-stone-100 p-0.5 dark:border-stone-700 dark:bg-stone-800"
          >
            {Object.entries(MODES).map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => update({ mode: key })}
                className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                  mode === key
                    ? "bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-50"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          <OptionMenu label="Provider" value={provider} onChange={(v) => update({ provider: v })} options={PROVIDERS} width="w-44" />
          <OptionMenu label="Tone" value={tone} onChange={(v) => update({ tone: v })} options={TONES} width="w-32" />
          <OptionMenu label="Length" value={length} onChange={(v) => update({ length: v })} options={LENGTHS} width="w-36" />

          <StrengthMeter value={strength} onChange={(v) => update({ strength: v })} />

          <StatefulButton onClick={handleRunRewrite} className="ml-auto h-9">
            Run Rewrite
          </StatefulButton>
        </div>

        <div className="grid flex-1 grid-cols-1 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-stone-800">
          <Pane
            id="input"
            title="Input"
            counter={
              <span
                className={`text-xs tabular-nums ${
                  charCount > 20000
                    ? "font-semibold text-red-600 dark:text-red-400"
                    : "text-stone-500 dark:text-stone-400"
                }`}
              >
                {charCount.toLocaleString()} / 20,000
              </span>
            }
            actions={
              <>
                {suggestButton("input")}
                <CopyButton value={inputText} size="icon" className="h-8 w-8" />
                {inputText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setInputText("");
                      clearTokens();
                    }}
                    className="h-8 w-8 text-stone-400 hover:text-red-600"
                    title="Clear input"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            }
            textareaRef={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (!e.target.value) clearTokens();
            }}
            placeholder="Paste or type your text here (up to 20,000 characters), then click Run Rewrite."
            label="Input text editor"
            diffTitle="Changes in your original"
            diffKind="removed"
            tokens={inputTokens}
          />

          <Pane
            id="output"
            title="Output"
            actions={
              <>
                {suggestButton("output")}
                <CopyButton value={outputText} size="icon" className="h-8 w-8" />
              </>
            }
            textareaRef={outputRef}
            value={outputText}
            onChange={(e) => {
              setOutputText(e.target.value);
              if (!e.target.value) clearTokens();
            }}
            placeholder="The rewritten text appears here. You can edit it directly."
            label="Generated output text editor"
            diffTitle="Changes in the rewrite"
            diffKind="added"
            tokens={outputTokens}
          />
        </div>
      </div>

      {synonymPanelOpen && (
        <aside
          role="dialog"
          aria-label="Synonym suggestions"
          className="fixed bottom-5 left-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] space-y-3 rounded-lg border border-stone-300 bg-white p-4 shadow-lg animate-in slide-in-from-bottom-5 dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2.5 dark:border-stone-800">
            <div className="min-w-0 truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
              Alternatives for{" "}
              <span className="marker box-decoration-clone">"{selectionState.selectedText}"</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={synonymLoading}
                onClick={() => fetchSynonyms(selectionState)}
                className="h-7 w-7"
                title="Generate another set of alternatives"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${synonymLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSynonymPanelOpen(false)}
                className="h-7 w-7 text-stone-400 hover:text-red-600"
                title="Close suggestions"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="line-clamp-2 text-xs italic text-stone-500 dark:text-stone-400">
            Context: "...{selectionState.context}..."
          </p>

          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {synonymLoading ? (
              <div className="animate-pulse py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                Finding alternatives...
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-500 dark:text-stone-400">
                No suggestions available for this selection.
              </div>
            ) : (
              candidates.map((candidate) => (
                <div
                  key={candidate}
                  className="flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 p-2 transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:border-stone-600"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyCandidate(candidate)}
                    className="flex flex-1 items-center gap-2 truncate text-left text-sm font-medium text-stone-800 dark:text-stone-200"
                    title="Click to replace the selection"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">{candidate}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <CopyButton value={candidate} size="icon" className="h-7 w-7" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCandidateFromList(candidate)}
                      className="h-7 w-7 text-stone-400 hover:text-red-600"
                      title="Dismiss this alternative"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  );
}