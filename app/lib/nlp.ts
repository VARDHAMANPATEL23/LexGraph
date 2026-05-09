import nlp from "compromise";

export interface GraphNode {
  id: string;
  label: string;
  pos: "noun" | "verb" | "adjective" | "adverb" | "root";
  weight: number; // frequency / importance score
  definition?: string;
  phonetic?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // co-occurrence strength
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

type PosMethod = "nouns" | "verbs" | "adjectives" | "adverbs";

const POS_METHODS: Array<{ method: PosMethod; pos: GraphNode["pos"] }> = [
  { method: "nouns", pos: "noun" },
  { method: "verbs", pos: "verb" },
  { method: "adjectives", pos: "adjective" },
  { method: "adverbs", pos: "adverb" },
];

/** Strips stop words / function words, returns content words with POS */
export function extractContentWords(
  text: string
): Array<{ word: string; pos: GraphNode["pos"] }> {
  const doc = nlp(text);
  const results: Array<{ word: string; pos: GraphNode["pos"] }> = [];

  for (const { method, pos } of POS_METHODS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const terms: ReturnType<typeof doc.nouns> = (doc as any)[method]();
    terms.forEach((t: { text: () => string }) => {
      // Split phrases into individual tokens — keep only clean single words
      t.text().toLowerCase().split(/\s+/).forEach((token) => {
        const word = token.replace(/[^a-z'-]/g, "").trim();
        if (word.length > 2 && /^[a-z]/.test(word)) {
          results.push({ word, pos });
        }
      });
    });
  }

  return results;
}

/** Builds graph nodes + edges from a dictionary API response */
export function buildGraphFromDefinition(
  rootWord: string,
  meanings: DictionaryMeaning[]
): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  // Root node
  nodeMap.set(rootWord, {
    id: rootWord,
    label: rootWord,
    pos: "root",
    weight: 10,
  });

  for (const meaning of meanings) {
    for (const def of meaning.definitions) {
      const contentWords = extractContentWords(def.definition);

      contentWords.forEach(({ word, pos }) => {
        if (word === rootWord) return;

        if (!nodeMap.has(word)) {
          nodeMap.set(word, { id: word, label: word, pos, weight: 1 });
        } else {
          // Increase weight for repeated terms (co-occurrence frequency)
          nodeMap.get(word)!.weight += 1;
        }

        // Edge: root → content word
        const edgeKey = `${rootWord}::${word}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { source: rootWord, target: word, weight: 1 });
        } else {
          edgeMap.get(edgeKey)!.weight += 1;
        }
      });

      // Edges between content words that co-occur in the same sentence
      for (let i = 0; i < contentWords.length; i++) {
        for (let j = i + 1; j < contentWords.length; j++) {
          const a = contentWords[i].word;
          const b = contentWords[j].word;
          if (a === b || a === rootWord || b === rootWord) continue;
          const key = [a, b].sort().join("::");
          if (!edgeMap.has(key)) {
            edgeMap.set(key, { source: a, target: b, weight: 0.5 });
          } else {
            edgeMap.get(key)!.weight += 0.5;
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(edgeMap.values()),
  };
}

// Minimal types matching dictionaryapi.dev response
export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: Array<{ definition: string; example?: string }>;
  synonyms?: string[];
}

export interface DictionaryResponse {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}
