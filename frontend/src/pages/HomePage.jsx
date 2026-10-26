import React, { useEffect, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const REMOVED =
  "mx-px rounded border-b-2 border-dashed border-red-600 bg-[#FDE2E2] px-1 py-0.5 text-red-950 line-through decoration-red-600 dark:bg-red-500/20 dark:text-red-200 dark:decoration-red-400";
const ADDED =
  "mx-px rounded border-b-2 border-emerald-600 bg-[#DCFCE7] px-1 py-0.5 font-medium text-emerald-950 no-underline dark:bg-emerald-500/20 dark:text-emerald-200";
const MARK = "mr-0.5 select-none text-[0.72em] font-bold";

// "=" unchanged, "-" removed, "+" added
const EXAMPLES = [
  {
    label: "Paraphraser · Neutral",
    before: [["=", "The team worked "], ["-", "very hard"], ["=", " to finish the report "], ["-", "before"], ["=", " the deadline."]],
    after: [["=", "The team "], ["+", "put in long hours"], ["=", " to finish the report "], ["+", "ahead of"], ["=", " the deadline."]],
  },
  {
    label: "Humanizer · Casual",
    before: [["-", "We regret to inform you that"], ["=", " your request "], ["-", "cannot be processed at this time"], ["=", "."]],
    after: [["+", "Sorry, we can't process"], ["=", " your request "], ["+", "right now"], ["=", "."]],
  },
  {
    label: "Paraphraser · Formal",
    before: [["=", "Our new tool helps you "], ["-", "write faster"], ["=", " and "], ["-", "make fewer mistakes"], ["=", "."]],
    after: [["=", "Our new tool helps you "], ["+", "draft more quickly"], ["=", " and "], ["+", "reduce errors"], ["=", "."]],
  },
  {
    label: "Humanizer · Neutral",
    before: [["-", "It is important to note that the results may"], ["=", " vary depending on "], ["-", "various factors"], ["=", "."]],
    after: [["+", "Results can"], ["=", " vary depending on "], ["+", "a few things"], ["=", "."]],
  },
  {
    label: "Paraphraser · Casual",
    before: [["-", "The meeting has been rescheduled"], ["=", " to Thursday at 3 PM."]],
    after: [["+", "We moved the meeting"], ["=", " to Thursday at 3 PM."]],
  },
];

const STEPS = [
  {
    title: "Paste your text",
    body: "Up to 20,000 characters. Choose Paraphraser to reword it, or Humanizer to make it read more naturally.",
  },
  {
    title: "Pick a provider",
    body: "Ollama runs on your computer. Gemini uses your own API key. Switch between them any time, no restart needed.",
  },
  {
    title: "Review every change",
    body: "Removed and added words are marked in both panes. Select a word to see synonyms that fit its context.",
  },
];

function Segments({ parts }) {
  return parts.map(([kind, text], i) => {
    if (kind === "-")
      return (
        <del key={i} className={REMOVED}>
          <span aria-hidden="true" className={MARK}>[-]</span>
          {text}
        </del>
      );
    if (kind === "+")
      return (
        <ins key={i} className={ADDED}>
          <span aria-hidden="true" className={MARK}>[+]</span>
          {text}
        </ins>
      );
    return <span key={i}>{text}</span>;
  });
}

// Where each card sits in the deck: 0 = front, 1-2 = peeking behind,
// last = just flipped away, everything else = hidden at the back.
function slideStyle(pos, total, reduceMotion) {
  let state;
  if (pos === 0) state = { transform: "translate3d(0,0,0) rotateY(0deg)", opacity: 1, zIndex: 30 };
  else if (pos === 1) state = { transform: "translate3d(18px,16px,-60px) rotateY(-3deg) scale(0.97)", opacity: 1, zIndex: 20 };
  else if (pos === 2) state = { transform: "translate3d(36px,32px,-120px) rotateY(-6deg) scale(0.94)", opacity: 0.85, zIndex: 10 };
  else if (pos === total - 1) state = { transform: "translate3d(-70%,-6px,80px) rotateY(55deg)", opacity: 0, zIndex: 40 };
  else state = { transform: "translate3d(54px,48px,-180px) scale(0.9)", opacity: 0, zIndex: 0 };

  return {
    ...state,
    transition: reduceMotion
      ? "none"
      : "transform 750ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 500ms ease",
  };
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduce;
}

export default function HomePage({ onLaunchWorkspace }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!playing || hovering || reduceMotion) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(id);
  }, [playing, hovering, reduceMotion]);

  const handlePointerMove = (e) => {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 12 });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovering(false);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-6">
      <section className="grid items-center gap-12 py-14 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <p className="mb-5 text-sm font-medium text-stone-500 dark:text-stone-400">
            Runs with Ollama on your machine, or Gemini with your own key
          </p>

          <h1 className="font-serif text-4xl font-medium leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-50">
            Rewrite your text, then see{" "}
            <span className="marker box-decoration-clone">exactly what changed.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600 dark:text-stone-300">
            ReWordly paraphrases your writing, or smooths it out, with a model you choose. Every
            change is marked word by word, so you keep what works and undo what doesn't.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => onLaunchWorkspace("paraphraser")}
              className="h-11 gap-2 rounded-md bg-stone-900 px-6 text-base font-semibold text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Open the workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onLaunchWorkspace("humanizer")}
              className="h-11 rounded-md border-stone-300 px-6 text-base font-semibold dark:border-stone-700"
            >
              Try Humanizer
            </Button>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-6 text-stone-500 dark:text-stone-400">
            With Ollama your text never leaves your computer. With Gemini it is sent to Google
            using your API key.
          </p>
        </div>

        {/* 3D deck of example rewrites */}
        <div className="lg:col-span-5">
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Example rewrites"
            className="relative h-[400px] sm:h-[340px]"
            style={{ perspective: "1400px" }}
            onPointerEnter={() => setHovering(true)}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
          >
            <div
              className="relative h-full w-full"
              aria-live={playing ? "off" : "polite"}
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: "transform 180ms ease-out",
              }}
            >
              {EXAMPLES.map((ex, n) => {
                const pos = (n - index + EXAMPLES.length) % EXAMPLES.length;
                return (
                  <article
                    key={ex.label}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Example ${n + 1} of ${EXAMPLES.length}`}
                    aria-hidden={pos !== 0}
                    style={slideStyle(pos, EXAMPLES.length, reduceMotion)}
                    className="absolute left-0 top-0 h-[calc(100%-2.25rem)] w-[calc(100%-2.5rem)] overflow-hidden rounded-lg border border-stone-300 bg-white p-5 shadow-[0_18px_40px_-20px_rgba(28,25,23,0.35)] dark:border-stone-700 dark:bg-stone-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-stone-900 dark:bg-amber-400">
                        {ex.label}
                      </span>
                      <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                        {n + 1} / {EXAMPLES.length}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        Before
                      </p>
                      <p className="mt-1.5 text-[15px] leading-7 text-stone-800 dark:text-stone-200">
                        <Segments parts={ex.before} />
                      </p>
                    </div>

                    <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        After
                      </p>
                      <p className="mt-1.5 text-[15px] leading-7 text-stone-800 dark:text-stone-200">
                        <Segments parts={ex.after} />
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center">
              {EXAMPLES.map((ex, n) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setIndex(n)}
                  aria-label={`Show example ${n + 1}: ${ex.label}`}
                  aria-current={n === index}
                  className="p-1"
                >
                  <span
                    className={`block h-2.5 rounded-full transition-all duration-300 ${
                      n === index
                        ? "w-6 bg-stone-900 dark:bg-stone-100"
                        : "w-2.5 bg-stone-300 hover:bg-stone-400 dark:bg-stone-700 dark:hover:bg-stone-600"
                    }`}
                  />
                </button>
              ))}
            </div>

            {!reduceMotion && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPlaying((p) => !p)}
                className="h-8 gap-1.5 text-xs text-stone-600 dark:text-stone-300"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? "Pause" : "Play"}
              </Button>
            )}
          </div>

          <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
            Removed words are red and added words are green. Each also carries a [-] or [+] label,
            so colour is never the only signal.
          </p>
        </div>
      </section>

      <section className="border-t border-stone-200 dark:border-stone-800">
        <ol className="grid gap-10 py-14 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="font-serif text-3xl text-stone-400 dark:text-stone-600">{i + 1}</span>
              <h3 className="mt-2 text-base font-semibold text-stone-900 dark:text-stone-100">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-stone-600 dark:text-stone-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <p className="pb-14 text-sm text-stone-500 dark:text-stone-400">
          History is kept in memory only. Reload the page and it is gone.
        </p>
      </section>
    </div>
  );
}