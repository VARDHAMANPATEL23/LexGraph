"use client";

import { useState, useCallback, useRef } from "react";
import SearchBar from "@/app/components/SearchBar";
import NodePanel from "@/app/components/NodePanel";
import KnowledgeGraph from "@/app/components/KnowledgeGraph";
import { buildGraphFromDefinition } from "@/app/lib/nlp";
import type { GraphData, GraphNode, DictionaryMeaning, DictionaryResponse } from "@/app/lib/nlp";

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [meanings, setMeanings] = useState<DictionaryMeaning[]>([]);
  const [phonetic, setPhonetic] = useState<string | undefined>();

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

  const handleSearch = useCallback(
    async (word: string, keepSelected = false, isHistoryNav = false) => {
      const cleanWord = word.trim().toLowerCase();
      if (!cleanWord || loadingRef.current) return;

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
      if (!keepSelected) setSelectedNode(null);

      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
        if (!res.ok) throw new Error("Word not found in dictionary.");
        const data: DictionaryResponse[] = await res.json();
        const entry = data[0];

        const newGraph = buildGraphFromDefinition(entry.word, entry.meanings);
        setMeanings(entry.meanings);
        setPhonetic(entry.phonetic);
        setRootWord(entry.word);
        setGraphData(newGraph);

        // Update the panel node with correct weight from the new graph
        if (keepSelected) {
          const found = newGraph.nodes.find((n) => n.id === entry.word);
          if (found) setSelectedNode(found);
        }
      } catch (err) {
        setError((err as Error).message);
        setGraphData(null);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [updateNavState]
  );

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
      // Show panel immediately on click
      setSelectedNode(node);
      
      if (isDoubleClick) {
        const isSingleWord = /^[a-z][a-z'-]{1,}$/.test(node.id) && !node.id.includes(" ");
        if (node.pos !== "root" && node.id !== rootWord && isSingleWord) {
          // keepSelected=true: panel stays open while new graph loads
          handleSearch(node.id, true);
        }
      }
    },
    [rootWord, handleSearch]
  );

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
        {/* Legend */}
        <div className="legend">
          {[
            { pos: "root", label: "Root" },
            { pos: "noun", label: "Noun" },
            { pos: "verb", label: "Verb" },
            { pos: "adjective", label: "Adj" },
            { pos: "adverb", label: "Adv" },
          ].map(({ pos, label }) => (
            <span key={pos} className={`legend-item legend-${pos}`}>
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* Graph area */}
      <main className="graph-area" id="main-content">
        {error && (
          <div className="error-toast" role="alert">{error}</div>
        )}

        {!graphData && !loading && !error && (
          <div className="empty-state">
            <div className="empty-orb" />
            <p>Search a word to spawn the knowledge graph</p>
          </div>
        )}

        {graphData && (
          <KnowledgeGraph
            data={graphData}
            onNodeClick={handleNodeClick}
          />
        )}
      </main>

      {/* Node detail panel */}
      <NodePanel
        node={selectedNode}
        meanings={meanings}
        phonetic={phonetic}
        onClose={() => setSelectedNode(null)}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
    </div>
  );
}
