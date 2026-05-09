"use client";

import { useEffect, useRef } from "react";
import type { GraphData, GraphNode } from "@/app/lib/nlp";

const POS_COLOR: Record<string, string> = {
  root: "#f97316",
  noun: "#6366f1",
  verb: "#22d3ee",
  adjective: "#a78bfa",
  adverb: "#34d399",
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
  nodeLabel(label: string): ForceGraph3DInstance;
  nodeColor(fn: (node: object) => string): ForceGraph3DInstance;
  nodeVal(fn: (node: object) => number): ForceGraph3DInstance;
  nodeResolution(r: number): ForceGraph3DInstance;
  linkColor(fn: () => string): ForceGraph3DInstance;
  linkWidth(fn: (link: object) => number): ForceGraph3DInstance;
  linkOpacity(o: number): ForceGraph3DInstance;
  linkDirectionalParticles(n: number): ForceGraph3DInstance;
  linkDirectionalParticleWidth(w: number): ForceGraph3DInstance;
  backgroundColor(color: string): ForceGraph3DInstance;
  onNodeClick(fn: (node: object | null, event: MouseEvent) => void): ForceGraph3DInstance;
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
  onNodeClick?: (node: GraphNode) => void;
}

export default function KnowledgeGraph({ data, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance | null>(null);
  // Always hold the latest callback — avoids stale closure inside useEffect
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  // Init graph once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    let graph: ForceGraph3DInstance;

    import("3d-force-graph").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ForceGraph3D = (mod.default ?? mod) as any;
      const el = containerRef.current!;

      graph = ForceGraph3D({ controlType: "orbit" })(el)
        .nodeId("id")
        .nodeLabel("label")
        .nodeColor((node: object) => POS_COLOR[(node as GraphNode).pos] ?? "#94a3b8")
        .nodeVal((node: object) => {
          const n = node as GraphNode;
          return n.pos === "root" ? 8 : Math.max(1, (n.weight ?? 1) * 1.5);
        })
        .nodeResolution(12)
        .linkColor(() => "rgba(148,163,184,0.25)")
        .linkWidth((link: object) =>
          Math.max(0.5, ((link as { weight?: number }).weight ?? 0.5) * 0.8)
        )
        .linkOpacity(0.6)
        .linkDirectionalParticles(0)
        .backgroundColor("#030712")
        .enableNavigationControls(true)
        .showNavInfo(false)
        .width(el.clientWidth)
        .height(el.clientHeight);

      graph.onNodeClick((node: object | null, _event: MouseEvent) => {
        if (!node) return;
        const n = node as FGNode;
        // Camera zoom — only if simulation has placed the node
        if (n.x != null && n.y != null && n.z != null) {
          const distance = 120;
          const mag = Math.hypot(n.x, n.y, n.z) || 1;
          const ratio = 1 + distance / mag;
          try {
            graph.cameraPosition(
              { x: n.x * ratio, y: n.y * ratio, z: n.z * ratio },
              { x: n.x, y: n.y, z: n.z },
              800
            );
          } catch (_) {
            // swallow any camera errors during simulation restart
          }
        }
        // Use ref so we always call the latest callback, not a stale one
        onNodeClickRef.current?.(n as GraphNode);
      });

      graph.onNodeHover(() => {});
      graphRef.current = graph;
    });

    return () => {
      graphRef.current?._destructor?.();
      graphRef.current = null;
    };
  }, []); // mount only

  // Update data: preserve existing node positions to prevent x/y/z = undefined during resimulation
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;

    // Build a position map from currently placed nodes
    const posMap = new Map<string, { x: number; y: number; z: number }>();
    try {
      const current = g.graphData();
      for (const n of current.nodes) {
        if (n.x != null && n.y != null && n.z != null) {
          posMap.set(n.id, { x: n.x, y: n.y, z: n.z });
        }
      }
    } catch (_) {
      // graphData() may throw before first render
    }

    // Seed new nodes with existing positions where available
    const nodes = data.nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, ...pos } : n;
    });

    g.graphData({ nodes, links: data.links });
  }, [data]);

  // Responsive resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      graphRef.current?.width(el.clientWidth).height(el.clientHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="graph-canvas-wrapper" />;
}
