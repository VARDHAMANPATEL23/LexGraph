
# LexGraph — Oxford 3D Knowledge Graph

A real-time, interactive 3D knowledge graph built on dictionary definitions. Search any English word and watch its semantic relationships emerge as a navigable 3D graph — nodes weighted by NLP co-occurrence, edges drawn by syntactic proximity.

---

## How It Works

1. **Search** — Enter any English word. The app fetches its definition from [dictionaryapi.dev](https://dictionaryapi.dev) via a server-side proxy.
2. **NLP Processing** — [`compromise.js`](https://github.com/spencermountain/compromise) parses every definition sentence, strips function words (articles, prepositions, conjunctions), and extracts **content words** — nouns, verbs, adjectives, and adverbs only.
3. **Graph Construction** — Each content word becomes a node. Edge weight = co-occurrence frequency of two words within the same definition sentence. Nodes that appear repeatedly across multiple definitions gain higher weight (rendered as larger spheres).
4. **3D Rendering** — [`3d-force-graph`](https://github.com/vasturiano/3d-force-graph) renders the graph using WebGL via Three.js with a d3-force-3d physics simulation.
5. **Recursive Expansion** — Click any node to fetch *that* word's definitions and expand the graph in place, preserving existing node positions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS (custom design system) |
| 3D Graph | `3d-force-graph` + Three.js |
| NLP | `compromise.js` (client-side POS tagging) |
| Dictionary API | [dictionaryapi.dev](https://dictionaryapi.dev) — free, no key required |
| Runtime | Bun |
| Design System | [Stitch MCP](https://stitch.withgoogle.com) — Hanken Grotesk + JetBrains Mono |

---

## Graph Semantics

| Node Color | Part of Speech | Role |
|---|---|---|
| Orange | Root | The searched word |
| Indigo | Noun | Subject/object terms |
| Cyan | Verb | Action terms |
| Violet | Adjective | Descriptive terms |
| Emerald | Adverb | Modifier terms |

**Node size** = term frequency across all definitions (higher = more central to the meaning).  
**Edge width** = co-occurrence count within definition sentences.

---

## Project Structure

```
knowledge-graph/
├── app/
│   ├── api/
│   │   └── dictionary/
│   │       └── route.ts          # Server proxy → dictionaryapi.dev
│   ├── components/
│   │   ├── KnowledgeGraph.tsx    # 3D force graph (WebGL, imperative mount)
│   │   ├── NodePanel.tsx         # Slide-in definition panel
│   │   └── SearchBar.tsx         # Search input with loading state
│   ├── lib/
│   │   └── nlp.ts                # NLP: POS extraction + graph builder
│   ├── globals.css               # Design system tokens + all component styles
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Main orchestrator
├── public/
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) `>= 1.0`
- Node.js `>= 18`

### Install & Run

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
bun run build
bun run start
```

---

## Key Design Decisions

**Why `3d-force-graph` directly instead of `react-force-graph`?**  
`react-force-graph` bundles all four graph variants (2D, 3D, AR, VR) in a single import. The VR variant pulls in `aframe`, which crashes in browser environments without the `AFRAME` global. Importing `3d-force-graph` directly avoids this entirely.

**Why preserve node positions on data update?**  
When `graphData()` is called with new nodes, the force simulation restarts from zero — causing nodes to briefly have `undefined` coordinates. On each update, existing node positions are read and seeded into the new data, so the simulation resumes smoothly.

**Why a server-side API proxy?**  
`dictionaryapi.dev` does not set permissive CORS headers for all origins. The `/api/dictionary` route proxies the request server-side, keeping the fetch logic out of the browser.

**Why function words are discarded?**  
Stop words (articles, prepositions, conjunctions, pronouns) carry no semantic weight in a knowledge graph — they connect syntax, not meaning. Only content words (nouns, verbs, adjectives, adverbs) form meaningful conceptual relationships.

---

## License

MIT
