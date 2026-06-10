import { extractContentWords } from "./nlp";
import type { GraphData, GraphNode, GraphEdge, DictionaryMeaning } from "./nlp";

const STORAGE_KEY = "lexgraph:library";

// ─── Persistence ───────────────────────────────────────────────
export function getLibrary(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToLibrary(word: string): string[] {
  const lib = getLibrary();
  const w = word.toLowerCase().trim();
  if (lib.includes(w)) return lib;
  const next = [...lib, w];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeFromLibrary(word: string): string[] {
  const lib = getLibrary().filter((w) => w !== word.toLowerCase().trim());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  return lib;
}

export function isInLibrary(word: string): boolean {
  return getLibrary().includes(word.toLowerCase().trim());
}

// ─── Library overview graph ────────────────────────────────────
export interface LibraryEntry {
  word: string;
  meanings: DictionaryMeaning[];
  phonetic?: string;
}

/**
 * Merges multiple word graphs into one inter-relation graph.
 * Library-root nodes get pos="root" and a special `isLibraryRoot` flag.
 * Shared definition words create bridge edges between library-root pairs.
 */
export function buildLibraryGraph(entries: LibraryEntry[]): GraphData {
  const nodeMap = new Map<string, GraphNode & { isLibraryRoot?: boolean }>();
  const edgeMap = new Map<string, GraphEdge>();

  // Collect content words per library root
  const wordSets = new Map<string, Set<string>>();

  for (const entry of entries) {
    const rootId = entry.word;

    // Library root node
    nodeMap.set(rootId, {
      id: rootId,
      label: rootId,
      pos: "root",
      weight: 12,
      isLibraryRoot: true,
    });

    const ownWords = new Set<string>();

    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        for (const { word, pos } of extractContentWords(def.definition)) {
          if (word === rootId) continue;
          ownWords.add(word);

          if (!nodeMap.has(word)) {
            nodeMap.set(word, { id: word, label: word, pos, weight: 1 });
          } else {
            nodeMap.get(word)!.weight += 0.6;
          }

          // Edge: library-root → content word
          const ek = `${rootId}::${word}`;
          if (!edgeMap.has(ek)) {
            edgeMap.set(ek, { source: rootId, target: word, weight: 1 });
          }
        }
      }
    }

    wordSets.set(rootId, ownWords);
  }

  // Inter-root edges via shared definition words
  const roots = Array.from(wordSets.keys());
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i];
      const b = roots[j];
      const setA = wordSets.get(a)!;
      const setB = wordSets.get(b)!;

      // How many words do they share?
      let shared = 0;
      for (const w of setA) if (setB.has(w)) shared++;

      if (shared > 0) {
        const ek = [a, b].sort().join("::lib::");
        edgeMap.set(ek, { source: a, target: b, weight: Math.min(shared * 0.8, 5) });
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(edgeMap.values()),
  };
}
