"use client";

import type { GraphNode, DictionaryMeaning } from "@/app/lib/nlp";

interface Props {
  node: GraphNode | null;
  meanings: DictionaryMeaning[];
  phonetic?: string;
  loading?: boolean;
  isSaved?: boolean;
  panelMode?: "root" | "hint" | "relation";
  prevRootWord?: string;
  prevMeanings?: DictionaryMeaning[];
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  onSave?: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const POS_BADGE: Record<string, string> = {
  root: "badge-root",
  noun: "badge-noun",
  verb: "badge-verb",
  adjective: "badge-adj",
  adverb: "badge-adv",
};

/** Extract unique lowercase content words from all definitions */
function extractWords(meanings: DictionaryMeaning[]): Set<string> {
  const stop = new Set(["a","an","the","is","are","was","were","be","been","of","in","to","and","or","for","with","on","at","by","from","as","that","this","which","it","its","not","no"]);
  const words = new Set<string>();
  for (const m of meanings) {
    for (const d of m.definitions) {
      d.definition.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).forEach((w) => {
        if (w.length > 3 && !stop.has(w)) words.add(w);
      });
    }
  }
  return words;
}

export default function NodePanel({
  node, meanings, phonetic, loading, isSaved,
  panelMode = "root", prevRootWord, prevMeanings = [],
  onClose, onBack, onForward, onSave, canGoBack, canGoForward,
}: Props) {
  if (!node) return null;

  // ── Relation: shared words between prev root and current root ──
  const sharedWords = panelMode === "relation" && prevMeanings.length > 0
    ? [...extractWords(prevMeanings)].filter((w) => extractWords(meanings).has(w)).slice(0, 12)
    : [];

  return (
    <aside className="node-panel" role="complementary" aria-label="Node details">
      <div className="panel-top-row">
        {node.pos === "root" && onSave && (
          <button
            className={`panel-save-btn ${isSaved ? "panel-save-btn--saved" : ""}`}
            onClick={onSave}
            aria-label={isSaved ? "Remove from library" : "Save to library"}
            title={isSaved ? "Saved — click to remove" : "Save to library"}
          >
            {isSaved ? "★ Saved" : "☆ Save"}
          </button>
        )}
        <button className="panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      </div>

      {/* ── MODE: hint (non-root node selected) ── */}
      {panelMode === "hint" && (
        <div className="panel-word">
          <h2>{node.label}</h2>
          <span className={`pos-badge ${POS_BADGE[node.pos] ?? ""}`}>{node.pos}</span>
          <p className="panel-hint" style={{ marginTop: 12 }}>
            Double-click to explore this word as the new root.
          </p>
        </div>
      )}

      {/* ── MODE: relation (just navigated via double-click) ── */}
      {panelMode === "relation" && (
        <>
          <div className="panel-word">
            <h2>{node.label}</h2>
            {phonetic && <span className="panel-phonetic">{phonetic}</span>}
            <span className={`pos-badge ${POS_BADGE[node.pos] ?? ""}`}>{node.pos}</span>
          </div>

          <div className="panel-relation">
            <p className="relation-label">
              Shared concepts with <strong>{prevRootWord}</strong>
            </p>
            {sharedWords.length > 0 ? (
              <div className="relation-chips">
                {sharedWords.map((w) => (
                  <span key={w} className="relation-chip">{w}</span>
                ))}
              </div>
            ) : (
              <p className="panel-hint">No strong overlap found — these words appear isolated.</p>
            )}
          </div>

          {loading ? (
            <div className="panel-skeleton" aria-busy="true">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--med" />
            </div>
          ) : (
            <ul className="panel-meanings">
              {meanings.slice(0, 3).map((m, i) => (
                <li key={i}>
                  <span className="meaning-pos">{m.partOfSpeech}</span>
                  {m.definitions.slice(0, 2).map((d, j) => (
                    <p key={j} className="meaning-def">{d.definition}</p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── MODE: root (root node selected) ── */}
      {panelMode === "root" && (
        <>
          <div className="panel-word">
            <h2>{node.label}</h2>
            {!loading && phonetic && <span className="panel-phonetic">{phonetic}</span>}
            <span className={`pos-badge ${POS_BADGE[node.pos] ?? ""}`}>{node.pos}</span>
          </div>

          {loading ? (
            <div className="panel-skeleton" aria-busy="true" aria-label="Loading definition">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--med" />
              <div className="skeleton-line" />
            </div>
          ) : meanings.length > 0 ? (
            <ul className="panel-meanings">
              {meanings.slice(0, 4).map((m, i) => (
                <li key={i}>
                  <span className="meaning-pos">{m.partOfSpeech}</span>
                  {m.definitions.slice(0, 2).map((d, j) => (
                    <p key={j} className="meaning-def">{d.definition}</p>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-hint">Click a node to explore its definition.</p>
          )}
        </>
      )}

      <div className="panel-meta">
        <div className="meta-weight">
          <span>Weight: <b>{node.weight.toFixed(1)}</b></span>
        </div>
        <div className="meta-nav">
          <button disabled={!canGoBack} onClick={onBack} aria-label="Go back in history">← Back</button>
          <button disabled={!canGoForward} onClick={onForward} aria-label="Go forward in history">Forward →</button>
        </div>
      </div>
    </aside>
  );
}
