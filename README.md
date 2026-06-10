# LexGraph — Oxford 3D Knowledge Graph

A real-time, interactive 3D knowledge graph built on dictionary definitions. Search any English word to visualize its semantic relationships as a navigable 3D space. Nodes are colored by part of speech, sized by relative significance, and connected by syntactic proximity.

**Live Application:** [lex-graph.vercel.app](https://lex-graph.vercel.app)

## Demo / Previews

| 3D Knowledge Graph (Dark) | Interactive Details Panel (Dark) |
|---|---|
| ![3D Knowledge Graph](./screenshots/1_dark_mode_graph.png) | ![Interactive Details Panel](./screenshots/2_dark_mode_details.png) |

| 3D Knowledge Graph (Light) | Word Library Drawer |
|---|---|
| ![3D Knowledge Graph Light](./screenshots/3_light_mode_graph.png) | ![Word Library Drawer](./screenshots/4_library_panel.png) |

---

## Features

- **Semantic 3D Graphs** — Render dictionary definitions as nodes and edges in a 3D force-directed layout.
- **Natural Language Processing** — POS tagging via `compromise` extracts content words (nouns, verbs, adjectives, adverbs) while filtering out syntactic stop words.
- **Personal Word Library** — Save searched words to local storage and browse them within a dedicated drawer UI.
- **Library Interrelation Graph** — Compile and visualize all saved terms in a single unified graph, showing conceptual bridges formed by shared dictionary words.
- **Interactive Navigation** — Double-click any node to recursively search and expand the graph.
- **History & Traversal** — Go backward and forward through your traversal history using custom panel navigation.
- **Layout Persistence** — Retains existing node coordinates on data update, ensuring smooth, non-disruptive physics transitions.
- **Adaptive Theme Engine** — High-contrast light and dark themes with persistent settings and real-time WebGL background adaptation.

---

## How It Works

1. **Query & Proxy** — The user searches for a term. The application fetches the lexical payload from the Dictionary API via a server-side proxy route.
2. **NLP Segmentation** — The definitions are parsed by sentences. The system filters out non-content grammatical functions (conjunctions, prepositions, articles).
3. **Relation Mapping** — Node weights are calculated using term frequency across definitions. Edges are established based on word co-occurrence within individual sentences.
4. **WebGL Rendering** — WebGL and Three.js process the coordinates via a d3-force-3d simulation.
5. **Dynamic Interrelation** — For the personal library, roots are mapped as custom nodes, and shared content terms create semantic bridges linking different root nodes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | Vanilla CSS (Custom Token-based System) |
| 3D Simulation | `3d-force-graph` + Three.js |
| NLP Parsing | `compromise` (Client-side Part-of-Speech Tagging) |
| API Provider | [dictionaryapi.dev](https://dictionaryapi.dev) (CORS-proxied) |

---

## Graph Semantics

### Node Colors

| Node Color (Dark Mode) | Node Color (Light Mode) | Part of Speech | Role |
|---|---|---|---|
| Orange (`#f97316`) | Orange (`#ea580c`) | Root | The searched word / Library root |
| Indigo (`#818cf8`) | Indigo (`#4f46e5`) | Noun | Subject or object terms |
| Cyan (`#22d3ee`) | Cyan (`#0891b2`) | Verb | Action or state terms |
| Violet (`#a78bfa`) | Violet (`#7c3aed`) | Adjective | Descriptive attributes |
| Emerald (`#34d399`) | Emerald (`#059669`) | Adverb | Modifiers |

- **Node Size** — Relative to term frequency across all definitions (Root node has a fixed priority size of 7).
- **Edge Width** — Proportional to the frequency of co-occurrence within definition sentences.

---

## Project Structure

```
knowledge-graph/
├── app/
│   ├── api/
│   │   └── dictionary/
│   │       └── route.ts          # Server-side CORS proxy for dictionary queries
│   ├── components/
│   │   ├── KnowledgeGraph.tsx    # Imperatively mounted WebGL 3D graph container
│   │   ├── LibraryPanel.tsx      # Sidebar/drawer component for saved words
│   │   ├── NodePanel.tsx         # Slide-out details, history, and actions panel
│   │   └── SearchBar.tsx         # Main query input with built-in loading states
│   ├── lib/
│   │   ├── library.ts            # LocalStorage persistence & library graph builder
│   │   └── nlp.ts                # NLP pipeline: POS extraction & graph construct
│   ├── globals.css               # Theme variables & design system styles
│   ├── layout.tsx                # App root layout and metadata configuration
│   └── page.tsx                  # Main orchestration view and state manager
├── public/                       # Static public assets
├── next.config.ts                # Next.js configurations
├── tsconfig.json                 # TypeScript compiler setup
└── package.json                  # Dependencies & scripts
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) `>= 1.0`
- Node.js `>= 18`

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
bun run dev
```

The server runs locally at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
bun run build
bun run start
```

---

## Key Design Decisions

- **Direct WebGL Rendering** — Utilizing `3d-force-graph` directly bypasses React wrapper reconciliation overhead and avoids packaging unnecessary VR dependencies (`aframe`) that crash on typical SSR execution.
- **Node Position Seeding** — To prevent the physics engine from snapping nodes to coordinate origins during layout updates, current coordinates are extracted and merged with incoming node updates.
- **Server API Proxying** — Next.js routing is leveraged to proxy requests to the third-party dictionary API, bypassing standard client CORS limitations.
- **Stop Word Filtering** — Grammatical helper words are discarded to keep the visualization focused exclusively on concepts and actions that carry semantic weight.

---

## License

MIT
