'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Player } from '@/types';

interface PlayerGraphProps {
  players: Player[];
}

const typeColor = (t: string) => {
  if (t === 'person') return '#8B5CF6';     // purple
  if (t === 'company') return '#1D9E75';     // teal
  if (t === 'institution') return '#F59E0B'; // amber
  if (t === 'government') return '#E8593C';  // coral
  return '#6B7280';
};

export default function PlayerGraph({ players }: PlayerGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || players.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 350;
    svg.attr('width', width).attr('height', height);

    // Build nodes and links
    const playerNames = new Set(players.map(p => p.name));
    const nodes = players.map(p => ({
      id: p.name,
      type: p.type,
      role: p.role,
      connections: p.connections.length,
    }));

    const links: { source: string; target: string }[] = [];
    players.forEach(p => {
      p.connections.forEach(conn => {
        if (playerNames.has(conn)) {
          links.push({ source: p.name, target: conn });
        }
      });
    });

    // Deduplicate links
    const linkSet = new Set<string>();
    const uniqueLinks = links.filter(l => {
      const key = [l.source, l.target].sort().join('--');
      if (linkSet.has(key)) return false;
      linkSet.add(key);
      return true;
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(uniqueLinks as any).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const tooltip = d3.select(tooltipRef.current);

    // Links
    const link = svg.append('g')
      .selectAll('line')
      .data(uniqueLinks)
      .join('line')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: any) => Math.max(12, 8 + d.connections * 4))
      .attr('fill', (d: any) => typeColor(d.type))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', 'grab')
      .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))')
      .on('mouseover', function (event: any, d: any) {
        d3.select(this).transition().duration(200).attr('r', (d: any) => Math.max(16, 12 + d.connections * 4));
        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 40}px`)
          .html(`<strong>${d.id}</strong> (${d.type})<br/><span>${d.role}</span>`);
      })
      .on('mouseout', function (event: any, d: any) {
        d3.select(this).transition().duration(200).attr('r', (d: any) => Math.max(12, 8 + d.connections * 4));
        tooltip.style('display', 'none');
      })
      .call(d3.drag<any, any>()
        .on('start', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Labels
    const labels = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: any) => d.id)
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => -(Math.max(12, 8 + d.connections * 4) + 6));

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => Math.max(20, Math.min(width - 20, d.x)))
        .attr('cy', (d: any) => Math.max(20, Math.min(height - 20, d.y)));

      labels
        .attr('x', (d: any) => Math.max(20, Math.min(width - 20, d.x)))
        .attr('y', (d: any) => Math.max(20, Math.min(height - 20, d.y)));
    });

    return () => { simulation.stop(); };
  }, [players]);

  if (players.length === 0) return null;

  return (
    <div className="player-graph-container">
      <h3 className="section-title">Key Players</h3>
      <div className="player-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: '#8B5CF6' }}></span>Person</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }}></span>Company</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#F59E0B' }}></span>Institution</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#E8593C' }}></span>Government</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef} className="d3-tooltip" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
}
