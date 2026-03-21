'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function SentimentChart({ data }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !Array.isArray(data) || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const width = 400;
    const height = 350;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const parseDate = (d) => new Date(d);
    const dates = data.map((d) => parseDate(d.date));

    const xScale = d3
      .scaleTime()
      .domain([d3.min(dates), d3.max(dates)])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // Background zones
    g.append('rect')
      .attr('y', yScale(1))
      .attr('width', innerWidth)
      .attr('height', yScale(0.5) - yScale(1))
      .attr('fill', '#ECFDF5')
      .attr('opacity', 0.5);

    g.append('rect')
      .attr('y', yScale(0.5))
      .attr('width', innerWidth)
      .attr('height', yScale(0) - yScale(0.5))
      .attr('fill', '#FEF2F2')
      .attr('opacity', 0.5);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([0.25, 0.5, 0.75])
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#E5E7EB')
      .attr('stroke-dasharray', '4');

    // Line
    const line = d3
      .line()
      .x((d) => xScale(parseDate(d.date)))
      .y((d) => yScale(d.score))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#0A2342')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    const tooltip = d3.select(tooltipRef.current);

    const labelColor = (l) => {
      if (l === 'positive') return '#1D9E75';
      if (l === 'negative') return '#E24B4A';
      return '#888780';
    };

    // Points
    g.selectAll('.point')
      .data(data)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(parseDate(d.date)))
      .attr('cy', (d) => yScale(d.score))
      .attr('r', 5)
      .attr('fill', (d) => labelColor(d.label))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).transition().duration(200).attr('r', 8);
        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 30}px`)
          .html(
            `<strong>${d.label}</strong> (${d.score.toFixed(
              2
            )})<br/>${d.date}`
          );
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(200).attr('r', 5);
        tooltip.style('display', 'none');
      });

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat(d3.timeFormat('%b %y'))
      )
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#6B7280');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#6B7280');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#6B7280')
      .text('Sentiment Score');
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="sentiment-chart-container">
      <h3 className="section-title">Sentiment Over Time</h3>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef}></svg>
        <div
          ref={tooltipRef}
          className="d3-tooltip"
          style={{ display: 'none' }}
        ></div>
      </div>
    </div>
  );
}