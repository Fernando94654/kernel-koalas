"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

import { truncate } from "~/lib/ui";

interface Node extends d3.SimulationNodeDatum { id: string; peso: number }
interface Link { source: string; target: string; weight: number }

// Read CSS variables at render time so the graph respects dark/light mode.
function getCSSVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function NetworkGraph({ nodes, links, height = 360 }: {
  nodes: { id: string; peso: number }[]; links: Link[]; height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgEl = ref.current;
    if (!svgEl || nodes.length === 0) return;
    const W = svgEl.clientWidth || 440;
    const H = height;

    // Read theme colors at draw time
    const colorBorder = getCSSVar("--color-border", "#E5E8ED");
    const colorInk    = getCSSVar("--color-ink", "#1A1D23");
    const colorRojo   = getCSSVar("--rojo", "#CC0023");

    const N: Node[] = nodes.map((n) => ({ ...n }));
    const L: Link[] = links.map((l) => ({ ...l }));
    const maxW = d3.max(L, (l) => l.weight) ?? 1;

    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();

    const sim = d3.forceSimulation<Node>(N)
      .force("link", d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(
        L as unknown as d3.SimulationLinkDatum<Node>[]
      ).id((d) => (d as Node).id).distance(70))
      .force("charge", d3.forceManyBody().strength(-160))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide(18));

    const link = svg.append("g").attr("stroke", colorBorder)
      .selectAll("line").data(L).join("line")
      .attr("stroke-width", (d) => 1 + (d.weight / maxW) * 5)
      .attr("stroke-opacity", 0.6);

    const node = svg.append("g")
      .selectAll<SVGGElement, Node>("g").data(N).join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append("circle")
      .attr("r", (d) => 4 + Math.sqrt(d.peso) * 1.3)
      .attr("fill", colorRojo)
      .attr("fill-opacity", 0.85)
      .attr("stroke", "var(--color-card)")
      .attr("stroke-width", 1.5);

    node.append("title").text((d) => `${d.id} (weight ${d.peso})`);

    node.append("text")
      .text((d) => truncate(d.id, 14))
      .attr("x", 8).attr("y", 3)
      .attr("font-size", 8)
      .attr("fill", colorInk)
      .attr("opacity", 0.8);

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as unknown as Node).x!)
        .attr("y1", (d) => (d.source as unknown as Node).y!)
        .attr("x2", (d) => (d.target as unknown as Node).x!)
        .attr("y2", (d) => (d.target as unknown as Node).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [nodes, links, height]);

  if (!nodes.length) return <p className="text-sm text-muted">No graph data.</p>;
  return <svg ref={ref} width="100%" height={height} className="touch-none" />;
}
