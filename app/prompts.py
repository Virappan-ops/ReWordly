from app.providers.base import Mode, RewriteOptions

PARAPHRASER_TEMPLATE = (
    "Rewrite the academic text below in a formal, scholarly register, preserving its precise meaning, "
    "technical terminology, and key details. Use strength {strength}/5 and make it {length}. "
    "If the text is very short, still rewrite it and never ask questions. "
    "Return only the rewritten text.\n"
    "Text: {text}"
)

HUMANIZER_TEMPLATE = (
    "Rewrite the text below to sound clear, fluid, and professional, preserving its precise meaning "
    "and key details. Avoid robotic AI transitions while maintaining a polished register. "
    "Use strength {strength}/5, a {tone} tone, and make it {length}. "
    "If the text is very short, still rewrite it and never ask questions. "
    "Do not add claims. Return only the rewritten text.\n"
    "Text: {text}"
)

SYNONYM_TEMPLATE = (
    "Suggest up to 5 natural synonym or short-phrase replacements for the selected phrase "
    "in the context below. Preserve the grammatical role and meaning. "
    'Return ONLY a JSON array of strings (for example: ["option 1", "option 2"]).\n'
    "If the text is very short, still rewrite it and never ask questions.\n"
    "Selected phrase: {selection}\n"
    "Context: {context}"
)

# Exact legacy format from Hugging Face prompt_format.json (instr + "\n\n" + draft + sep)
HF_HUMANIZER_INSTR = (
    "Rewrite the text below so it reads like a person wrote it, not a language model.\n\n"
    "Reorganize it as you see fit. Vary sentence length on purpose. Cut hedging,\n"
    "throat-clearing, and any sentence that only announces what comes next.\n"
    "Prefer the concrete word over the abstract one. It is fine to sound uneven.\n\n"
    "Every fact, number, unit, date, name and quotation must survive unchanged."
)
HF_HUMANIZER_SEP = "\n\n### Rewritten:\n\n"


def build_hf_humanizer_prompt(draft: str) -> str:
    """Build exact legacy completion prompt required by humanizer-12b GGUF."""
    return f"{HF_HUMANIZER_INSTR}\n\n{draft.strip()}{HF_HUMANIZER_SEP}"


def build_rewrite_prompt(text: str, mode: Mode, options: RewriteOptions) -> str:
    """Build mode-specific prompt with validated options."""
    length_map = {
        "shorter": "shorter",
        "same": "approximately the same length",
        "longer": "longer",
    }
    length_phrase = length_map[options.length]

    if mode == "paraphraser":
        return PARAPHRASER_TEMPLATE.format(
            strength=options.strength,
            tone=options.tone,
            length=length_phrase,
            text=text,
        )
    if mode == "humanizer":
        return HUMANIZER_TEMPLATE.format(
            strength=options.strength,
            tone=options.tone,
            length=length_phrase,
            text=text,
        )
    raise ValueError(f"Unsupported mode: {mode}")


def build_synonym_prompt(selection: str, context: str) -> str:
    return SYNONYM_TEMPLATE.format(selection=selection, context=context)