import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  content,
  text,
  className = "",
  size = "icon",
  variant = "outline",
  label,
}) {
  const [copied, setCopied] = useState(false);
  const textToCopy = value ?? content ?? text ?? "";

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!textToCopy || !textToCopy.trim()) {
      toast.warning("Nothing to copy yet!", { position: "top-center" });
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopied(true);
      toast.success("Copied to clipboard!", {
        position: "top-center",
        duration: 1800,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.", { position: "top-center" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none",
        size === "icon" ? "h-8 w-8" : "h-8 px-3 text-xs gap-1.5",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 transition-transform scale-110" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {label && <span className="text-xs font-medium">{copied ? "Copied" : label}</span>}
    </button>
  );
}

export default CopyButton;