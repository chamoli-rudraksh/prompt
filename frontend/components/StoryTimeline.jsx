// StoryTimeline.jsx — D3 logic untouched, visual colors adapted to dark theme
'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DC = {
  green:   '#34d399',
  red:     '#f87171',
  neutral: '#8a8a9a',
  line:    'rgba(255,255,255,0.10)',
  tick:    '#44445a',
  accent:  '#f5c842',
};
const mono = "'JetBrains Mono','Fira Code',monospace";

const sentimentColor = s => s==='positive' ? DC.green : s==='negative' ? DC.red : DC.neutral;

export default function StoryTimeline({ events }) {
  const svgRef     = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !Array.isArray(events) || events.length===0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top:40, right:40, bottom:60, left:40 };
    const width  = Math.max(800, events.length*150);
    const height = 200;

    svg.attr('width', width).attr('height', height);

    const parseDate = d => { const p=new Date(d); return isNaN(p)?new Date():p; };
    const dates = events.map(e=>parseDate(e.date)).filter(d=>!isNaN(d));
    if (!dates.length) return;

    const xScale = d3.scaleTime().domain([d3.min(dates),d3.max(dates)]).range([margin.left,width-margin.right]);
    const y = height/2;

    // Timeline line
    svg.append('line').attr('x1',margin.left).attr('y1',y).attr('x2',width-margin.right).attr('y2',y)
      .attr('stroke',DC.line).attr('stroke-width',1.5);

    const tooltip = d3.select(tooltipRef.current);

    // Circles
    svg.selectAll('circle').data(events).join('circle')
      .attr('cx',d=>xScale(parseDate(d.date))).attr('cy',y).attr('r',9)
      .attr('fill',d=>sentimentColor(d.sentiment)).attr('stroke','#07070a').attr('stroke-width',2)
      .attr('cursor','pointer')
      .style('filter','drop-shadow(0 0 6px rgba(245,200,66,0.2))')
      .on('mouseover', function(event,d) {
        d3.select(this).transition().duration(150).attr('r',13);
        tooltip.style('display','block').style('left',`${event.offsetX+12}px`).style('top',`${event.offsetY-70}px`)
          .html(`<div style="font-weight:600;margin-bottom:4px">${d.headline}</div><div style="opacity:.7;font-size:.85em">${d.description}</div><div style="opacity:.5;margin-top:4px;font-size:.8em">${d.source} · ${d.date}</div>`);
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(150).attr('r',9);
        tooltip.style('display','none');
      });

    // Date labels
    svg.selectAll('.dt').data(events).join('text').attr('class','dt')
      .attr('x',d=>xScale(parseDate(d.date))).attr('y',y+28)
      .attr('text-anchor','middle').attr('font-size','9px').attr('font-family',mono)
      .attr('fill',DC.tick).attr('letter-spacing','0.06em')
      .text(d => parseDate(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}));

  }, [events]);

  if (!Array.isArray(events) || events.length===0) return null;

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ fontFamily:mono, fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.14em', color:'#f5c842', marginBottom:'1rem' }}>
        Timeline
      </div>
      <div style={{ overflowX:'auto', paddingBottom:8, scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.06) transparent' }}>
        <div style={{ position:'relative' }}>
          <svg ref={svgRef} style={{ display:'block' }}></svg>
          <div ref={tooltipRef} style={{
            display:'none', position:'absolute', pointerEvents:'none',
            background:'#141418', border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:8, padding:'0.75rem 1rem', maxWidth:260,
            fontFamily:mono, fontSize:'0.62rem', color:'#f0f0f2',
            lineHeight:1.6, boxShadow:'0 12px 32px rgba(0,0,0,0.6)',
          }}/>
        </div>
      </div>
    </div>
  );
}