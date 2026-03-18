'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TimelineEvent } from '@/types';

interface StoryTimelineProps {
  events: TimelineEvent[];
}

const sentimentColor = (s: string) => {
  if (s === 'positive') return '#1D9E75';
  if (s === 'negative') return '#E24B4A';
  return '#888780';
};

export default function StoryTimeline({ events }: StoryTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || events.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const width = Math.max(800, events.length * 150);
    const height = 200;

    svg.attr('width', width).attr('height', height);

    const parseDate = (d: string) => {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const dates = events.map(e => parseDate(e.date));
    const xScale = d3.scaleTime()
      .domain([d3.min(dates) as Date, d3.max(dates) as Date])
      .range([margin.left, width - margin.right]);

    const y = height / 2;

    // Timeline line
    svg.append('line')
      .attr('x1', margin.left)
      .attr('y1', y)
      .attr('x2', width - margin.right)
      .attr('y2', y)
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', 2);

    // Event circles
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll('circle')
      .data(events)
      .join('circle')
      .attr('cx', (d) => xScale(parseDate(d.date)))
      .attr('cy', y)
      .attr('r', 10)
      .attr('fill', (d) => sentimentColor(d.sentiment))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))')
      .on('mouseover', function (event, d) {
        d3.select(this).transition().duration(200).attr('r', 14);
        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 60}px`)
          .html(`
            <strong>${d.headline}</strong><br/>
            <span>${d.description}</span><br/>
            <em>${d.source} · ${d.date}</em>
          `);
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(200).attr('r', 10);
        tooltip.style('display', 'none');
      });

    // Date labels
    svg.selectAll('.date-label')
      .data(events)
      .join('text')
      .attr('class', 'date-label')
      .attr('x', (d) => xScale(parseDate(d.date)))
      .attr('y', y + 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#6B7280')
      .text((d) => {
        const date = parseDate(d.date);
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      });

  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="timeline-container">
      <h3 className="section-title">Timeline</h3>
      <div className="timeline-scroll">
        <div style={{ position: 'relative' }}>
          <svg ref={svgRef}></svg>
          <div ref={tooltipRef} className="d3-tooltip" style={{ display: 'none' }}></div>
        </div>
      </div>
    </div>
  );
}
