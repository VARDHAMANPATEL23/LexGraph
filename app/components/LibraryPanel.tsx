"use client";

interface Props {
  words: string[];
  currentWord?: string;
  onLoad: (word: string) => void;
  onRemove: (word: string) => void;
  onViewGraph: () => void;
  onClose: () => void;
}

export default function LibraryPanel({ words, currentWord, onLoad, onRemove, onViewGraph, onClose }: Props) {
  return (
    <aside className="library-panel" role="dialog" aria-label="Word library">
      <div className="library-header">
        <div className="library-title-row">
          <span className="library-icon">⬡</span>
          <h2 className="library-title">Library</h2>
          <span className="library-count">{words.length}</span>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="Close library">✕</button>
      </div>

      {words.length === 0 ? (
        <div className="library-empty">
          <p>No saved words yet.</p>
          <p className="library-hint">Open a node panel and tap <b>Save</b> to add words here.</p>
        </div>
      ) : (
        <>
          <button
            className="library-graph-btn"
            onClick={onViewGraph}
            aria-label="View inter-relation graph of library words"
          >
            <span>View Relation Graph</span>
            <span className="lib-graph-icon">⬡</span>
          </button>

          <ul className="library-list" role="list">
            {words.map((word) => (
              <li key={word} className={`library-item ${currentWord === word ? "library-item--active" : ""}`}>
                <span className="library-word">{word}</span>
                <div className="library-actions">
                  <button
                    className="lib-btn lib-btn--load"
                    onClick={() => onLoad(word)}
                    aria-label={`Load ${word}`}
                  >
                    Load
                  </button>
                  <button
                    className="lib-btn lib-btn--remove"
                    onClick={() => onRemove(word)}
                    aria-label={`Remove ${word} from library`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
