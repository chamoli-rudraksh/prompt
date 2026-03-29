// ════════════════════════════════════════
// SentimentChart.jsx  — D3 logic untouched, visual colors adapted to dark theme
// ════════════════════════════════════════
'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DC = {
  green:   '#34d399',
  red:     '#f87171',
  neutral: '#8a8a9a',
  line:    '#f5c842',
  grid:    'rgba(255,255,255,0.06)',
  bg:      'rgba(52,211,153,0.08)',
  bgRed:   'rgba(248,113,113,0.08)',
  tick:    '#44445a',
  label:   '#8a8a9a',
  text:    '#f0f0f2',
};
const mono = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";

export default function SentimentChart({ data }) {
  const svgRef     = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !Array.isArray(data) || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top:30, right:30, bottom:40, left:50 };
    const width  = 400, height = 300;
    const iW = width - margin.left - margin.right;
    const iH = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const parseDate = (d) => new Date(d);
    const dates = data.map(d => parseDate(d.date));

    const xScale = d3.scaleTime().domain([d3.min(dates), d3.max(dates)]).range([0, iW]);
    const yScale = d3.scaleLinear().domain([0,1]).range([iH,0]);

    // Background zones — dark tinted
    g.append('rect').attr('y', yScale(1)).attr('width', iW).attr('height', yScale(0.5)-yScale(1)).attr('fill', DC.bg);
    g.append('rect').attr('y', yScale(0.5)).attr('width', iW).attr('height', yScale(0)-yScale(0.5)).attr('fill', DC.bgRed);

    // Grid lines
    g.append('g').selectAll('line').data([0.25,0.5,0.75]).join('line')
      .attr('x1',0).attr('x2',iW)
      .attr('y1',d=>yScale(d)).attr('y2',d=>yScale(d))
      .attr('stroke', DC.grid).attr('stroke-dasharray','4');

    // Line — amber instead of navy
    const line = d3.line().x(d=>xScale(parseDate(d.date))).y(d=>yScale(d.score)).curve(d3.curveMonotoneX);
    g.append('path').datum(data).attr('fill','none').attr('stroke',DC.line).attr('stroke-width',2).attr('d',line);

    // Area gradient
    const areaGen = d3.area().x(d=>xScale(parseDate(d.date))).y0(iH).y1(d=>yScale(d.score)).curve(d3.curveMonotoneX);
    svg.append('defs').append('linearGradient').attr('id','sg').attr('gradientTransform','rotate(90)')
      .selectAll('stop').data([{offset:'0%',color:'rgba(245,200,66,0.15)'},{offset:'100%',color:'rgba(245,200,66,0)'}])
      .join('stop').attr('offset',d=>d.offset).attr('stop-color',d=>d.color);
    g.append('path').datum(data).attr('fill','url(#sg)').attr('d',areaGen);

    const tooltip = d3.select(tooltipRef.current);
    const labelColor = l => l==='positive' ? DC.green : l==='negative' ? DC.red : DC.neutral;

    // Points
    g.selectAll('.pt').data(data).join('circle').attr('class','pt')
      .attr('cx',d=>xScale(parseDate(d.date))).attr('cy',d=>yScale(d.score))
      .attr('r',5).attr('fill',d=>labelColor(d.label)).attr('stroke','#0f0f12').attr('stroke-width',2).attr('cursor','pointer')
      .on('mouseover', function(event,d) {
        d3.select(this).transition().duration(150).attr('r',8);
        tooltip.style('display','block').style('left',`${event.offsetX+10}px`).style('top',`${event.offsetY-40}px`)
          .html(`<strong>${d.label}</strong> (${d.score.toFixed(2)})<br/>${d.date}`);
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(150).attr('r',5);
        tooltip.style('display','none');
      });

    // Axes
    g.append('g').attr('transform',`translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%b %y')))
      .call(ax => { ax.select('.domain').attr('stroke',DC.grid); ax.selectAll('line').attr('stroke',DC.grid); ax.selectAll('text').attr('fill',DC.tick).attr('font-family',mono).attr('font-size','9px'); });

    g.append('g').call(d3.axisLeft(yScale).ticks(5))
      .call(ax => { ax.select('.domain').attr('stroke',DC.grid); ax.selectAll('line').attr('stroke',DC.grid); ax.selectAll('text').attr('fill',DC.tick).attr('font-family',mono).attr('font-size','9px'); });

    g.append('text').attr('transform','rotate(-90)').attr('x',-iH/2).attr('y',-40)
      .attr('text-anchor','middle').attr('font-size','9px').attr('font-family',mono)
      .attr('fill',DC.label).attr('letter-spacing','0.08em').text('SENTIMENT SCORE');

  }, [data]);

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ fontFamily:mono, fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.14em', color:'#f5c842', marginBottom:'1rem' }}>
        Sentiment Over Time
      </div>
      <div style={{ position:'relative', overflowX:'auto' }}>
        <svg ref={svgRef} style={{ display:'block' }}></svg>
        <div ref={tooltipRef} style={{
          display:'none', position:'absolute', pointerEvents:'none',
          background:'#141418', border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:6, padding:'0.5rem 0.8rem',
          fontFamily:mono, fontSize:'0.62rem', color:'#f0f0f2',
          lineHeight:1.5, boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
        }}/>
      </div>
    </div>
  );
}