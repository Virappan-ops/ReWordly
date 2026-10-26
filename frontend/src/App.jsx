import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import HomePage from "@/pages/HomePage";
import ParaphraserPage from "@/pages/ParaphraserPage";
import HistoryDrawer from "@/components/HistoryDrawer";

const DEFAULT_SETTINGS = {
  provider: "ollama",
  mode: "paraphraser",
  strength: 3,
  tone: "neutral",
  length: "same",
};

export default function App() {
  // Light by default; remembers the choice after the first switch
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("rewordly-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [currentPage, setCurrentPage] = useState("home"); // "home" | "paraphraser"

  // Rewrite settings live here so they survive switching pages
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Workspace editor state (preserved while switching pages)
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [inputTokens, setInputTokens] = useState([]);
  const [outputTokens, setOutputTokens] = useState([]);

  // In-memory session history (gone on reload)
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("rewordly-theme", theme);
    } catch {
      // Storage unavailable: the theme just won't be remembered
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleLaunchWorkspace = (mode = "paraphraser") => {
    setSettings((prev) => ({ ...prev, mode }));
    setCurrentPage("paraphraser");
  };

  const handleAddHistory = (entry) => setSessionHistory((prev) => [entry, ...prev]);

  const handleRemoveHistoryItem = (id) =>
    setSessionHistory((prev) => prev.filter((item) => item.id !== id));

  const handleClearHistory = () => setSessionHistory([]);

  const handleRestoreHistoryItem = (item) => {
    setInputText(item.inputText);
    setOutputText(item.outputText);
    setInputTokens(item.inputTokens || []);
    setOutputTokens(item.outputTokens || []);
    setSettings((prev) => ({
      ...prev,
      provider: item.provider,
      mode: item.mode,
      ...item.options,
    }));
    setCurrentPage("paraphraser");
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <Toaster position="top-center" richColors closeButton />

      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        historyCount={sessionHistory.length}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {currentPage === "home" ? (
        <HomePage onLaunchWorkspace={handleLaunchWorkspace} />
      ) : (
        <ParaphraserPage
          settings={settings}
          setSettings={setSettings}
          inputText={inputText}
          setInputText={setInputText}
          outputText={outputText}
          setOutputText={setOutputText}
          inputTokens={inputTokens}
          setInputTokens={setInputTokens}
          outputTokens={outputTokens}
          setOutputTokens={setOutputTokens}
          onAddHistory={handleAddHistory}
        />
      )}

      <HistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={sessionHistory}
        onRestoreItem={handleRestoreHistoryItem}
        onRemoveItem={handleRemoveHistoryItem}
        onClearAll={handleClearHistory}
      />
    </div>
  );
}