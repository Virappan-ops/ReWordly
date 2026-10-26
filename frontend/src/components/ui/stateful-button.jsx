"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  idle: "bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white",
  loading: "cursor-progress bg-amber-400 text-stone-900",
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
};

export const StatefulButton = ({ className, children, onClick, disabled, ...props }) => {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (next, ms) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), ms);
  };

  const handleClick = async (event) => {
    if (status === "loading" || disabled) return;
    clearTimeout(timer.current);
    setStatus("loading");
    try {
      const result = await onClick?.(event);
      if (result === false) settle("error", 2500);
      else if (result === null) setStatus("idle");
      else settle("success", 2000);
    } catch {
      settle("error", 2500);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={status === "loading"}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-10 min-w-[140px] select-none items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900",
        "disabled:cursor-not-allowed disabled:opacity-60",
        STATUS_STYLES[status],
        className
      )}
      {...props}
    >
      {status === "loading" && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}

      {status === "error" && (
        <svg
          className="h-4 w-4 animate-in zoom-in-75 duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      )}

      {status === "success" && (
        <svg
          className="h-4 w-4 animate-in zoom-in-75 duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )}

      <span aria-live="polite">
        {status === "loading"
          ? "Rewriting..."
          : status === "error"
          ? "Failed"
          : status === "success"
          ? "Done"
          : children}
      </span>
    </button>
  );
};

export const Button = StatefulButton;
export default StatefulButton;