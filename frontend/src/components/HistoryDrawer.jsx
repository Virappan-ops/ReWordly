import React from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { X, Trash2, RotateCcw, Clock, ArrowRight, Info, Cpu } from "lucide-react";

const CHUNK_SIZE = 3;

const PANEL =
  "data-[swipe-axis=x]:w-full data-[swipe-axis=x]:max-w-xl flex flex-col border-l border-stone-200 bg-stone-50 shadow-xl dark:border-stone-800 dark:bg-stone-950";

function HistoryCard({ item, onRestoreItem, onRemoveItem, onCloseAll }) {
  // Format provider and model nicely (e.g. "ollama: humanizer" or "gemini: gemini-2.5-flash")
  const providerKey = (item.provider || "ollama").toLowerCase();
  const modelName = item.model_used || (providerKey === "gemini" ? "gemini-2.5-flash" : "humanizer");
  const displayLabel = `${providerKey}: ${modelName}`;

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded bg-amber-200 px-2 py-0.5 uppercase text-stone-900 dark:bg-amber-400">
            {item.mode}
          </span>
          {/* Combined Provider & Model Badge */}
          <span className="rounded bg-stone-200 px-2 py-0.5 lowercase text-stone-700 dark:bg-stone-800 dark:text-stone-300 flex items-center gap-1 font-mono">
            <Cpu className="h-3 w-3 opacity-70" />
            {displayLabel}
          </span>
          <span className="font-medium text-stone-500 dark:text-stone-400">
            Strength {item.options?.strength}/5 · {item.options?.tone} · {item.options?.length} ·{" "}
            {item.timestamp}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRestoreItem(item);
              onCloseAll();
            }}
            className="h-7 gap-1 border-stone-300 px-2.5 text-xs font-medium dark:border-stone-700 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Restore
          </Button>
          <CopyButton value={item.outputText} size="icon" className="h-7 w-7" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveItem(item.id)}
            className="h-7 w-7 text-stone-400 hover:text-red-600 cursor-pointer"
            title="Remove from history"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="border-l-2 border-red-400 bg-stone-50 py-2 pl-3 pr-2 dark:bg-stone-950/60">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Original
          </div>
          <p className="line-clamp-3 leading-relaxed text-stone-600 dark:text-stone-300">
            {item.inputText}
          </p>
        </div>

        <div className="border-l-2 border-emerald-500 bg-stone-50 py-2 pl-3 pr-2 dark:bg-stone-950/60">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Rewrite
          </div>
          <p className="line-clamp-3 font-medium leading-relaxed text-stone-900 dark:text-stone-100">
            {item.outputText}
          </p>
        </div>
      </div>
    </div>
  );
}

function NestedHistoryLevel({ chunks, currentIndex, onRestoreItem, onRemoveItem, onCloseAll }) {
  const currentChunk = chunks[currentIndex] || [];
  const hasNext = currentIndex + 1 < chunks.length;
  const total = chunks.flat().length;
  const first = currentIndex * CHUNK_SIZE + 1;
  const last = currentIndex * CHUNK_SIZE + currentChunk.length;

  return (
    <>
      {currentIndex > 0 && (
        <DrawerHeader className="border-b border-stone-200 pb-3 dark:border-stone-800">
          <DrawerTitle className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
            Older rewrites
          </DrawerTitle>
          <DrawerDescription className="text-xs text-stone-500 dark:text-stone-400">
            Showing {first}–{last} of {total}
          </DrawerDescription>
        </DrawerHeader>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {currentIndex === 0 && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Showing {first}–{last} of {total}
          </p>
        )}
        {currentChunk.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onRestoreItem={onRestoreItem}
            onRemoveItem={onRemoveItem}
            onCloseAll={onCloseAll}
          />
        ))}
      </div>

      <DrawerFooter className="flex flex-col gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
        {hasNext && (
          <Drawer swipeDirection="right">
            <DrawerTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-between border-stone-300 text-xs font-semibold dark:border-stone-700 cursor-pointer"
                >
                  <span>
                    View older rewrites ({chunks.slice(currentIndex + 1).flat().length} more)
                  </span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              }
            />
            <DrawerContent className={PANEL}>
              <NestedHistoryLevel
                chunks={chunks}
                currentIndex={currentIndex + 1}
                onRestoreItem={onRestoreItem}
                onRemoveItem={onRemoveItem}
                onCloseAll={onCloseAll}
              />
            </DrawerContent>
          </Drawer>
        )}

        <DrawerClose
          render={
            <Button variant="ghost" className="w-full text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
              Back
            </Button>
          }
        />
      </DrawerFooter>
    </>
  );
}

export default function HistoryDrawer({
  open,
  onOpenChange,
  history,
  onRestoreItem,
  onRemoveItem,
  onClearAll,
}) {
  const chunks = [];
  for (let i = 0; i < history.length; i += CHUNK_SIZE) {
    chunks.push(history.slice(i, i + CHUNK_SIZE));
  }

  const handleCloseAll = () => onOpenChange(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className={PANEL}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <div className="flex items-baseline gap-2">
            <DrawerTitle className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
              Session history
            </DrawerTitle>
            <span className="text-sm text-stone-500 dark:text-stone-400">{history.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-8 gap-1 border-stone-300 text-xs text-red-600 hover:text-red-700 dark:border-stone-700 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            )}
            <DrawerClose
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" title="Close">
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <Clock className="h-8 w-8 text-stone-300 dark:text-stone-700" />
            <p className="text-sm text-stone-600 dark:text-stone-300">
              No rewrites in this session yet.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Run a rewrite and it will show up here.
            </p>
          </div>
        ) : (
          <NestedHistoryLevel
            chunks={chunks}
            currentIndex={0}
            onRestoreItem={onRestoreItem}
            onRemoveItem={onRemoveItem}
            onCloseAll={handleCloseAll}
          />
        )}

        <div className="border-t border-stone-200 p-4 dark:border-stone-800">
          <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-100 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Kept in memory only.</strong> Reloading or closing the tab clears the history.
            </span>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}