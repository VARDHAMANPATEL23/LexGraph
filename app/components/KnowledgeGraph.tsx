"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GraphData, GraphNode } from "@/app/lib/nlp";

const POS_COLOR_DARK: Record<string, string> = {
  root: "#f97316",
  noun: "#818cf8",
  verb: "#22d3ee",
  adjective: "#a78bfa",
  adverb: "#34d399",
};

const POS_COLOR_LIGHT: Record<string, string> = {
  root: "#ea580c",
  noun: "#4f46e5",
  verb: "#0891b2",
  adjective: "#7c3aed",
  adverb: "#059669",
};

interface FGNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
}

interface InternalGraphData {
  nodes: FGNode[];
  links: object[];
}

interface ForceGraph3DInstance {
  graphData(): InternalGraphData;
  graphData(data: object): ForceGraph3DInstance;
  nodeId(id: string): ForceGraph3DInstance;
  nodeLabel(fn: (node: object) => string): ForceGraph3DInstance;
  nodeThreeObject(fn: (node: object) => THREE.Object3D): ForceGraph3DInstance;
  nodeThreeObjectExtend(v: boolean): ForceGraph3DInstance;
  linkColor(fn: () => string): ForceGraph3DInstance;
  linkWidth(fn: (link: object) => number): ForceGraph3DInstance;
  linkOpacity(o: number): ForceGraph3DInstance;
  linkDirectionalParticles(n: number): ForceGraph3DInstance;
  linkDirectionalParticleWidth(w: number): ForceGraph3DInstance;
  linkDirectionalParticleSpeed(s: number): ForceGraph3DInstance;
  linkDirectionalParticleColor(fn: () => string): ForceGraph3DInstance;
  backgroundColor(color: string): ForceGraph3DInstance;
  onNodeClick(fn: (node: object | null, e: MouseEvent) => void): ForceGraph3DInstance;
  onNodeHover(fn: (node: object | null) => void): ForceGraph3DInstance;
  enableNavigationControls(v: boolean): ForceGraph3DInstance;
  showNavInfo(v: boolean): ForceGraph3DInstance;
  cameraPosition(
    pos: { x: number; y: number; z: number },
    target?: { x: number; y: number; z: number },
    ms?: number
  ): ForceGraph3DInstance;
  width(w: number): ForceGraph3DInstance;
  height(h: number): ForceGraph3DInstance;
  _destructor?(): void;
}

interface Props {
  data: GraphData;
  bgColor?: string;
  theme?: "dark" | "light";
  onNodeClick?: (node: GraphNode, isDoubleClick: boolean) => void;
}

function nodeSize(n: GraphNode) {
  return n.pos === "root" ? 7 : Math.max(2, (n.weight ?? 1) * 1.4);
}

/** Billboard glow sprite using a radial canvas gradient */
function makeGlowSprite(hex: string, size: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, hex + "cc");
  grad.addColorStop(0.45, hex + "44");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.78,
    })
  );
  const s = size * 3.4;
  sprite.scale.set(s, s, 1);
  return sprite;
}

export default function KnowledgeGraph({ data, bgColor = "#030712", theme = "dark", onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // Always holds the latest data so init can seed it after async import resolves
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!containerRef.current) return;
    let graph: ForceGraph3DInstance;

    import("3d-force-graph").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ForceGraph3D = (mod.default ?? mod) as any;
      const el = containerRef.current!;

      graph = ForceGraph3D({ controlType: "orbit" })(el)
        .nodeId("id")
        .nodeLabel((node: object) => {
          const n = node as GraphNode;
          const isLight = themeRef.current === "light";
          return `<div style="
            background:${isLight ? "rgba(255,255,255,0.96)" : "rgba(13,13,21,0.92)"};
            border:1px solid ${isLight ? "rgba(79,70,229,0.22)" : "rgba(192,193,255,0.18)"};
            backdrop-filter:blur(12px);
            color:${isLight ? "#0f0f1a" : "#e4e1ed"};
            font-family:'Hanken Grotesk',sans-serif;
            font-size:12px;
            font-weight:500;
            padding:5px 10px;
            border-radius:8px;
            pointer-events:none;
            box-shadow:${isLight ? "0 2px 12px rgba(0,0,0,0.10)" : "none"};
          ">${n.label}</div>`;
        })
        .nodeThreeObject((node: object) => {
          const n = node as GraphNode;
          const palette = themeRef.current === "light" ? POS_COLOR_LIGHT : POS_COLOR_DARK;
          const hex = palette[n.pos] ?? "#94a3b8";
          const color = new THREE.Color(hex);
          const size = nodeSize(n);
          const group = new THREE.Group();

          group.add(makeGlowSprite(hex, size));

          group.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(size, 20, 20),
              new THREE.MeshPhongMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.45,
                shininess: 90,
                transparent: true,
                opacity: 0.92,
              })
            )
          );

          return group;
        })
        .nodeThreeObjectExtend(false)
        // Edges + particles
        .linkColor(() =>
          themeRef.current === "light"
            ? "rgba(79,70,229,0.28)"
            : "rgba(192,193,255,0.18)"
        )
        .linkWidth(0.5)
        .linkOpacity(0.55)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(0.8)
        .linkDirectionalParticleSpeed(0.004)
        .linkDirectionalParticleColor(() =>
          themeRef.current === "light"
            ? "rgba(79,70,229,0.9)"
            : "rgba(255,255,255,0.65)"
        )
        .backgroundColor(bgColor)
        .enableNavigationControls(true)
        .showNavInfo(false)
        .width(el.clientWidth)
        .height(el.clientHeight);

      // Move camera close on init — default is ~1000 units away
      graph.cameraPosition({ x: 0, y: 0, z: 180 });

      // Seed with current data immediately — prevents double-click needed on first search
      graph.graphData({ nodes: dataRef.current.nodes, links: dataRef.current.links });

      // Double click tracking
      let lastClickTime = 0;
      let lastClickedNodeId: string | null = null;

      graph.onNodeClick((node: object | null, _e: MouseEvent) => {
        if (!node) return;
        const n = node as FGNode;
        if (!n) return;
        
        const now = Date.now();
        const isDoubleClick = now - lastClickTime < 300 && lastClickedNodeId === n.id;
        lastClickTime = now;
        lastClickedNodeId = n.id;

        if (n.x != null && n.y != null && n.z != null) {
          const dist = 120;
          const mag = Math.hypot(n.x, n.y, n.z) || 1;
          const ratio = 1 + dist / mag;
          try {
            graph.cameraPosition(
              { x: n.x * ratio, y: n.y * ratio, z: n.z * ratio },
              { x: n.x, y: n.y, z: n.z },
              800
            );
          } catch (_) { /* skip during sim restart */ }
        }
        onNodeClickRef.current?.(n as GraphNode, isDoubleClick);
      });

      graph.onNodeHover(() => {});
      graphRef.current = graph;
    });

    return () => {
      graphRef.current?._destructor?.();
      graphRef.current = null;
    };
  }, []);

  // Preserve positions when data changes
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    const posMap = new Map<string, { x: number; y: number; z: number }>();
    try {
      for (const n of g.graphData().nodes) {
        if (n && n.x != null && n.y != null && n.z != null) {
          posMap.set(n.id, { x: n.x, y: n.y, z: n.z });
        }
      }
    } catch (_) { /* ignore */ }

    const nodes = data.nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, ...pos } : n;
    });
    g.graphData({ nodes, links: data.links });
  }, [data]);

  // Update 3D scene when theme/bg changes — also refresh data so link color callbacks re-evaluate
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.backgroundColor(bgColor);
    // Re-feed existing data so color lambdas are re-called with new themeRef value
    try {
      const current = g.graphData();
      g.graphData({ nodes: current.nodes, links: current.links });
    } catch (_) { /* graph may not be ready */ }
  }, [bgColor]);

  // Responsive resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      graphRef.current?.width(el.clientWidth).height(el.clientHeight);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return <div ref={containerRef} className="graph-canvas-wrapper" />;
}
