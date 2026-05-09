"use client";

import type { GraphNode, DictionaryMeaning } from "@/app/lib/nlp";

interface Props {
  node: GraphNode | null;
  meanings: DictionaryMeaning[];
  phonetic?: string;
  onClose: () => void;
}

const POS_BADGE: Record<string, string> = {
  root: "badge-root",
  noun: "badge-noun",
  verb: "badge-verb",
  adjective: "badge-adj",
  adverb: "badge-adv",
};

export default function NodePanel({ node, meanings, phonetic, onClose }: Props) {
  if (!node) return null;

  const relevantMeanings = meanings.filter(
    (m) => m.partOfSpeech === node.pos || node.pos === "root"
  );

  return (
    <aside className="node-panel" role="complementary" aria-label="Node details">
      <button className="panel-close" onClick={onClose} aria-label="Close panel">
        ✕
      </button>

      <div className="panel-word">
        <h2>{node.label}</h2>
        {phonetic && <span className="panel-phonetic">{phonetic}</span>}
        <span className={`pos-badge ${POS_BADGE[node.pos] ?? ""}`}>
          {node.pos}
        </span>
      </div>

      {relevantMeanings.length > 0 ? (
        <ul className="panel-meanings">
          {relevantMeanings.slice(0, 3).map((m, i) => (
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

      <div className="panel-meta">
        <span>Weight: <b>{node.weight.toFixed(1)}</b></span>
      </div>
    </aside>
  );
}
