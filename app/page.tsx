"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import SearchBar from "@/app/components/SearchBar";
import NodePanel from "@/app/components/NodePanel";
import LibraryPanel from "@/app/components/LibraryPanel";
import KnowledgeGraph from "@/app/components/KnowledgeGraph";
import { buildGraphFromDefinition } from "@/app/lib/nlp";
import {
  getLibrary, addToLibrary, removeFromLibrary, isInLibrary,
  buildLibraryGraph,
} from "@/app/lib/library";
import type { GraphData, GraphNode, DictionaryMeaning, DictionaryResponse } from "@/app/lib/nlp";
import type { LibraryEntry } from "@/app/lib/library";

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [meanings, setMeanings] = useState<DictionaryMeaning[]>([]);
  const [phonetic, setPhonetic] = useState<string | undefined>();
  const [panelLoading, setPanelLoading] = useState(false);

  // Persists root word's full data so clicking root after a non-root restores it
  const rootMeaningsRef = useRef<DictionaryMeaning[]>([]);
  const rootPhoneticRef = useRef<string | undefined>(undefined);

  // Previous root for interrelation panel
  const [prevRootWord, setPrevRootWord] = useState("");
  const [prevMeanings, setPrevMeanings] = useState<DictionaryMeaning[]>([]);

  // Panel display mode
  const [panelMode, setPanelMode] = useState<"root" | "hint" | "relation">("root");

  const loadingRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateNavState = useCallback(() => {
    setCanGoBack(historyIndexRef.current > 0);
    setCanGoForward(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rootWord, setRootWord] = useState<string>("");

  // Library state
  const [library, setLibrary] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isLibraryGraph, setIsLibraryGraph] = useState(false);
  const [libraryGraphLoading, setLibraryGraphLoading] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sync library from localStorage on mount
  useEffect(() => { setLibrary(getLibrary()); }, []);

  // Apply + persist theme
  useEffect(() => {
    const saved = localStorage.getItem("lexgraph:theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lexgraph:theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const handleSaveWord = useCallback(() => {
    if (!rootWord) return;
    const inLib = isInLibrary(rootWord);
    const next = inLib ? removeFromLibrary(rootWord) : addToLibrary(rootWord);
    setLibrary(next);
  }, [rootWord]);

  // ── Search ────────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (word: string, keepSelected = false, isHistoryNav = false) => {
      const cleanWord = word.trim().toLowerCase();
      if (!cleanWord || loadingRef.current) return;

      setIsLibraryGraph(false);

      if (!isHistoryNav) {
        const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
        if (hist[hist.length - 1] !== cleanWord) {
          hist.push(cleanWord);
          historyRef.current = hist;
          historyIndexRef.current = hist.length - 1;
        }
        updateNavState();
      }

      setLoading(true);
      loadingRef.current = true;
      setError(null);
      if (!keepSelected) {
        setSelectedNode(null);
      } else {
        setPanelLoading(true);
        setMeanings([]);
        setPhonetic(undefined);
      }

      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
        if (!res.ok) throw new Error("Word not found in dictionary.");
        const data: DictionaryResponse[] = await res.json();
        const entry = data[0];

        const newGraph = buildGraphFromDefinition(entry.word, entry.meanings);

        // Save prev root before overwriting (only on double-click navigation)
        if (keepSelected) {
          setPrevRootWord(rootWord);
          setPrevMeanings(rootMeaningsRef.current);
        }

        rootMeaningsRef.current = entry.meanings;
        rootPhoneticRef.current = entry.phonetic;
        setMeanings(entry.meanings);
        setPhonetic(entry.phonetic);
        setRootWord(entry.word);
        setGraphData(newGraph);
        localStorage.setItem("lexgraph:lastWord", entry.word);

        if (keepSelected) {
          const found = newGraph.nodes.find((n) => n.id === entry.word);
          if (found) setSelectedNode(found);
          setPanelMode("relation");
        } else {
          setPanelMode("root");
        }
      } catch (err) {
        setError((err as Error).message);
        setGraphData(null);
      } finally {
        setLoading(false);
        setPanelLoading(false);
        loadingRef.current = false;
      }
    },
    [updateNavState, rootWord]
  );

  // ── Library graph ─────────────────────────────────────────────
  const handleViewLibraryGraph = useCallback(async () => {
    const words = getLibrary();
    if (words.length === 0) return;

    setShowLibrary(false);
    setIsLibraryGraph(true);
    setLibraryGraphLoading(true);
    setSelectedNode(null);
    setError(null);
    setRootWord("");

    try {
      const entries: LibraryEntry[] = await Promise.all(
        words.map(async (w) => {
          const res = await fetch(`/api/dictionary?word=${encodeURIComponent(w)}`);
          if (!res.ok) return { word: w, meanings: [] };
          const data: DictionaryResponse[] = await res.json();
          return { word: data[0].word, meanings: data[0].meanings, phonetic: data[0].phonetic };
        })
      );
      setGraphData(buildLibraryGraph(entries));
    } catch (err) {
      setError((err as Error).message);
      setIsLibraryGraph(false);
    } finally {
      setLibraryGraphLoading(false);
    }
  }, []);

  // ── Navigation ────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      updateNavState();
      handleSearch(historyRef.current[historyIndexRef.current], false, true);
    }
  }, [handleSearch, updateNavState]);

  const handleForward = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      updateNavState();
      handleSearch(historyRef.current[historyIndexRef.current], false, true);
    }
  }, [handleSearch, updateNavState]);

  const handleNodeClick = useCallback(
    (node: GraphNode, isDoubleClick: boolean) => {
      setSelectedNode(node);
      if (node.pos === "root") {
        // Restore root's full data from ref
        setMeanings(rootMeaningsRef.current);
        setPhonetic(rootPhoneticRef.current);
        setPanelMode("root");
      } else {
        setMeanings([]);
        setPhonetic(undefined);
        setPanelMode("hint");
      }
      if (isDoubleClick) {
        const isSingleWord = /^[a-z][a-z'-]{1,}$/.test(node.id) && !node.id.includes(" ");
        if (node.pos !== "root" && node.id !== rootWord && isSingleWord) {
          handleSearch(node.id, true);
        }
      }
    },
    [rootWord, handleSearch]
  );

  // Restore last word on mount
  useEffect(() => {
    const saved = localStorage.getItem("lexgraph:lastWord");
    if (saved) handleSearch(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaved = rootWord ? isInLibrary(rootWord) : false;

  const handleClear = useCallback(() => {
    setGraphData(null);
    setSelectedNode(null);
    setMeanings([]);
    setPhonetic(undefined);
    setRootWord("");
    setError(null);
    setIsLibraryGraph(false);
    localStorage.removeItem("lexgraph:lastWord");
  }, []);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-dot" />
          <h1>LexGraph</h1>
          <span className="header-sub">Oxford · 3D Knowledge Graph</span>
        </div>
        <SearchBar onSearch={handleSearch} loading={loading} />
        {/* Clear button — visible only when a graph is active */}
        {graphData && (
          <button
            className="clear-btn"
            onClick={handleClear}
            aria-label="Clear current graph"
            title="Clear"
          >
            Clear
          </button>
        )}
        {/* Library button */}
        <button
          className={`library-toggle-btn ${showLibrary ? "library-toggle-btn--active" : ""}`}
          onClick={() => setShowLibrary((v) => !v)}
          aria-label="Toggle library"
          title="Word Library"
        >
          ⬡ <span className="lib-btn-label">Library</span>
          {library.length > 0 && <span className="lib-badge">{library.length}</span>}
        </button>
        {/* Theme toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        {/* Legend */}
        <div className="legend">
          {[
            { pos: "root", label: "Root" },
            { pos: "noun", label: "Noun" },
            { pos: "verb", label: "Verb" },
            { pos: "adjective", label: "Adj" },
            { pos: "adverb", label: "Adv" },
          ].map(({ pos, label }) => (
            <span key={pos} className={`legend-item legend-${pos}`}>{label}</span>
          ))}
        </div>
      </header>

      {/* Graph area */}
      <main className="graph-area" id="main-content">
        {error && <div className="error-toast" role="alert">{error}</div>}

        {isLibraryGraph && (
          <div className="library-graph-banner">
            <span>Library Relation Graph</span>
            <button onClick={() => { setIsLibraryGraph(false); setGraphData(null); }}>
              ← Back to Search
            </button>
          </div>
        )}

        {!graphData && !loading && !libraryGraphLoading && !error && (
          <div className="empty-state">
            <div className="empty-orb" />
            <p>Search a word to spawn the knowledge graph</p>
          </div>
        )}

        {(loading || libraryGraphLoading) && !graphData && (
          <div className="graph-loading">
            <div className="graph-loading-pulse" />
            <span>{libraryGraphLoading ? "Building library graph…" : "Loading…"}</span>
          </div>
        )}

        {graphData && (
          <KnowledgeGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            bgColor={theme === "dark" ? "#030712" : "#f1f2f8"}
            theme={theme}
          />
        )}
      </main>

      {/* Library panel */}
      {showLibrary && (
        <LibraryPanel
          words={library}
          currentWord={rootWord || undefined}
          onLoad={(w) => { setShowLibrary(false); handleSearch(w); }}
          onRemove={(w) => setLibrary(removeFromLibrary(w))}
          onViewGraph={handleViewLibraryGraph}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Node detail panel */}
      <NodePanel
        node={selectedNode}
        meanings={meanings}
        phonetic={phonetic}
        loading={panelLoading}
        isSaved={isSaved}
        panelMode={panelMode}
        prevRootWord={prevRootWord}
        prevMeanings={prevMeanings}
        onSave={handleSaveWord}
        onClose={() => setSelectedNode(null)}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
    </div>
  );
}
