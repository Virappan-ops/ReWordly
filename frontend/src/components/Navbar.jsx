import React from "react";
import { flushSync } from "react-dom";
import { Sun, Moon, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import lightLogo from "@/assets/light_logo.png";
import darkLogo from "@/assets/dark_logo.png";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "paraphraser", label: "Workspace" },
];

export default function Navbar({
  theme,
  onToggleTheme,
  currentPage,
  onNavigate,
  historyCount,
  onOpenHistory,
}) {
  const isDark = theme === "dark";
  const logoSrc = isDark ? darkLogo : lightLogo;

  // Circular reveal from the button; falls back to an instant switch.
  const handleToggle = (e) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduceMotion) {
      onToggleTheme();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => onToggleTheme());
      root.classList.toggle("dark", !isDark);
    });

    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 550,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2.5"
          aria-label="ReWordly home"
        >
          <img
            src={logoSrc}
            alt=""
            className="h-7 w-7 object-contain"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            ReWordly
          </span>
        </button>

        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Main">
          {LINKS.map((link) => {
            const active = currentPage === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                aria-current={active ? "page" : undefined}
                className={`px-1 text-sm transition-colors ${
                  active
                    ? "marker box-decoration-clone font-semibold text-stone-900 dark:text-stone-50"
                    : "font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHistory}
            className="gap-2 text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-stone-900 px-1.5 text-[11px] font-semibold leading-5 text-stone-50 dark:bg-stone-100 dark:text-stone-900">
                {historyCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative h-9 w-9 overflow-hidden text-stone-700 dark:text-stone-200"
          >
            <Sun
              className={`absolute h-[18px] w-[18px] transition-all duration-500 ease-out ${
                isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <Moon
              className={`absolute h-[18px] w-[18px] transition-all duration-500 ease-out ${
                isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </Button>
        </nav>
      </div>
    </header>
  );
}