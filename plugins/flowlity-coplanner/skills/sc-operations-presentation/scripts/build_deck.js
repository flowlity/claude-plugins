#!/usr/bin/env node
/*
 * Build the SC Operations Review deck from a deck_data.json config.
 * Usage: node build_deck.js deck_data.json /path/out.pptx
 *
 * Layout is fixed (6 slides, exec-summary-first); all CONTENT comes from the
 * config so the same script serves any customer. See SKILL.md for the schema
 * and which Flowlity MCP tool feeds each field.
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs"), path = require("path");

const cfgPath = process.argv[2] || "deck_data.json";
const outPath = process.argv[3] || "deck.pptx";
const C = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const DIR = path.dirname(path.resolve(cfgPath));
const asset = (f) => path.join(DIR, f);

const B = C.brand || {};
const INK = B.ink || "141A23", ACC = B.accent || "E2231A";
const WHITE="FFFFFF", PANEL="F4F5F7", LINE="E3E6EA", CHAR="23282F", MUTE="8A9099",
      STEEL="3E5C76", GREEN="2E9E5B", AMBER="E0982E", LINK="2F6FB0", SUB="555C66";
const LINKBASE = B.linkBase || "https://app.flowlity.com/planning/products/planning/products/";
const FL = (id) => LINKBASE + id;
const lc = { color: LINK, underline: true };
const meta = C.meta || {};
const FOOT = `${meta.site || ""}  ·  Data: Flowlity  ·  ${meta.period || ""}`;

const p = new pptxgen(); p.layout = "LAYOUT_WIDE"; p.author = "Flowlity";
p.title = `${meta.company || ""} — Supply Chain Operations Review`;
const sh = () => ({ type:"outer", color:"9AA0A6", blur:5, offset:2, angle:90, opacity:0.18 });
const COL = { STEEL, GREEN, RED: ACC, AMBER, CHAR, MUTE, WHITE };
const col = (name) => COL[name] || name; // accept palette name or raw hex

function footer(s, n){
  s.addImage({ path: asset("logo_dark.png"), x:0.55, y:7.04, w:1.30, h:0.26 });
  s.addText(FOOT, { x:6.8, y:7.04, w:5.2, h:0.3, fontFace:"Arial", fontSize:9, color:MUTE, align:"right", valign:"middle", margin:0 });
  s.addText(String(n), { x:12.55, y:7.04, w:0.4, h:0.3, fontFace:"Arial", fontSize:9, color:MUTE, align:"right", valign:"middle", margin:0 });
}
function title(s, t){
  s.addShape(p.shapes.RECTANGLE, { x:0.55, y:0.5, w:0.12, h:0.42, fill:{color:ACC} });
  s.addText(t, { x:0.8, y:0.45, w:11.9, h:0.55, fontFace:"Arial", fontSize:26, bold:true, color:CHAR, valign:"middle", margin:0 });
}
function card(s,x,y,w,h,fill=WHITE){ s.addShape(p.shapes.ROUNDED_RECTANGLE, { x,y,w,h, rectRadius:0.06, fill:{color:fill}, line:{color:LINE,width:1}, shadow:sh() }); }
const rich = (runs) => (runs||[]).map(r => ({ text:r.text, options:{ color: col(r.color||"CHAR"), bold:!!r.bold } }));
function barChart(s, x, y, w, h, d){
  s.addChart(p.charts.BAR, [{ name:"v", labels:d.labels, values:d.values }], {
    x, y, w, h, barDir:"bar", chartColors:(d.colors||[ACC]).map(col), showValue:true, dataLabelPosition:"outEnd",
    dataLabelColor:CHAR, dataLabelFontFace:"Arial", dataLabelFontSize:11, dataLabelFormatCode:d.fmt||"0",
    catAxisLabelColor:CHAR, catAxisLabelFontSize:11.5, catAxisLabelFontBold:true, valAxisHidden:true,
    valGridLine:{style:"none"}, catGridLine:{style:"none"}, showLegend:false, valAxisMaxVal:d.max, valAxisMinVal:0 });
}

// ---------- SLIDE 1: COVER ----------
let s = p.addSlide(); const cv = C.cover || {};
s.background = { path: asset("cover_bg.png") };
s.addImage({ path: asset("logo_white.png"), x:0.7, y:0.55, w:2.7, h:0.515 });
s.addText(cv.title1||"Supply Chain", { x:0.68, y:2.25, w:11.5, h:0.95, fontFace:"Arial", fontSize:48, bold:true, color:WHITE, margin:0 });
s.addText(cv.title2||"Operations Review", { x:0.68, y:3.18, w:11.5, h:0.95, fontFace:"Arial", fontSize:48, bold:true, color:ACC, margin:0 });
s.addText(cv.subtitle||"", { x:0.7, y:4.28, w:11, h:0.5, fontFace:"Arial", fontSize:18, color:"C7CCD3", margin:0 });
s.addText(cv.date||meta.period||"", { x:0.7, y:4.85, w:6, h:0.5, fontFace:"Arial", fontSize:16, bold:true, color:WHITE, margin:0 });
s.addText(cv.footer||"Powered by Flowlity", { x:0.7, y:6.9, w:6, h:0.4, fontFace:"Arial", fontSize:12, color:WHITE, margin:0 });

// ---------- SLIDE 2: EXECUTIVE SUMMARY ----------
s = p.addSlide(); s.background={color:WHITE}; title(s, "Executive summary");
const ex = C.exec || {}; let kx=0.55; const kw=2.92, kgap=0.18;
(ex.kpis||[]).slice(0,4).forEach(k=>{
  card(s,kx,1.25,kw,1.55);
  s.addShape(p.shapes.RECTANGLE,{x:kx,y:1.25,w:0.09,h:1.55,fill:{color:col(k.bar||"STEEL")}});
  s.addText(k.v,{x:kx+0.2,y:1.4,w:kw-0.3,h:0.6,fontFace:"Arial",fontSize:32,bold:true,color:col(k.color||"CHAR"),margin:0,valign:"middle"});
  s.addText(k.l,{x:kx+0.2,y:2.02,w:kw-0.3,h:0.4,fontFace:"Arial",fontSize:12.5,bold:true,color:CHAR,margin:0});
  s.addText(k.sub||"",{x:kx+0.2,y:2.4,w:kw-0.3,h:0.32,fontFace:"Arial",fontSize:10.5,color:MUTE,margin:0});
  kx+=kw+kgap;
});
card(s,0.55,3.05,12.23,0.95,PANEL);
s.addShape(p.shapes.OVAL,{x:0.8,y:3.32,w:0.4,h:0.4,fill:{color:AMBER}});
s.addText("!",{x:0.8,y:3.32,w:0.4,h:0.4,align:"center",valign:"middle",color:WHITE,bold:true,fontSize:18,fontFace:"Arial",margin:0});
s.addText(rich(ex.banner),{x:1.35,y:3.05,w:11.2,h:0.95,fontFace:"Arial",fontSize:14,valign:"middle",margin:0});
s.addText("Decisions for this period",{x:0.55,y:4.25,w:11,h:0.4,fontFace:"Arial",fontSize:15,bold:true,color:CHAR,margin:0});
let dy=4.7;
(ex.decisions||[]).slice(0,3).forEach((d,i)=>{
  s.addShape(p.shapes.OVAL,{x:0.6,y:dy+0.03,w:0.34,h:0.34,fill:{color:ACC}});
  s.addText(String(i+1),{x:0.6,y:dy+0.03,w:0.34,h:0.34,align:"center",valign:"middle",color:WHITE,bold:true,fontSize:14,fontFace:"Arial",margin:0});
  s.addText([{text:d[0]+"  ",options:{bold:true,color:CHAR}},{text:"— "+d[1],options:{color:SUB}}],{x:1.05,y:dy,w:11.6,h:0.45,fontFace:"Arial",fontSize:12.5,valign:"middle",margin:0});
  dy+=0.55;
});
footer(s,2);

// ---------- SLIDE 3: INVENTORY SPLIT ----------
s = p.addSlide(); s.background={color:WHITE}; const inv = C.inventory || {};
title(s, inv.title||"Where the inventory sits");
s.addText(inv.subtitle||"",{x:0.8,y:1.0,w:11.8,h:0.35,fontFace:"Arial",fontSize:13,color:MUTE,margin:0});
function splitCard(x, d){
  card(s,x,1.5,6.0,4.7);
  s.addText(d.title,{x:x+0.25,y:1.62,w:5.5,h:0.4,fontFace:"Arial",fontSize:14,bold:true,color:CHAR,margin:0});
  barChart(s, x+0.15, 2.05, 5.7, 3.0, d);
  s.addText(rich(d.note),{x:x+0.25,y:5.25,w:5.5,h:0.8,fontFace:"Arial",fontSize:12,valign:"top",margin:0});
}
if (inv.splitA) splitCard(0.55, inv.splitA);
if (inv.topSkus){
  const tx=6.78; card(s,tx,1.5,6.0,4.7);
  s.addText(inv.topTitle||"Top 5 SKUs by stock value",{x:tx+0.25,y:1.62,w:5.5,h:0.4,fontFace:"Arial",fontSize:14,bold:true,color:CHAR,margin:0});
  const thh={bold:true,color:WHITE,fill:{color:INK},fontSize:10};
  const trows=[[{text:"Product",options:thh},{text:"Qty",options:{...thh,align:"right"}},{text:"Stock €",options:{...thh,align:"right"}},{text:"Cover",options:{...thh,align:"right"}}]];
  inv.topSkus.forEach(t=> trows.push([
    {text:t.name,options:{hyperlink:{url:FL(t.id)},...lc}},
    {text:t.qty,options:{align:"right",color:CHAR}},
    {text:t.value,options:{align:"right",color:CHAR}},
    {text:t.cover,options:{align:"right",bold:true,color:(t.coverFlag?col("AMBER"):CHAR)}} ]));
  const trh=[0.42]; for(let i=1;i<trows.length;i++) trh.push(0.55);
  s.addTable(trows,{x:tx+0.22,y:2.15,w:5.56,colW:[2.55,0.95,1.1,0.96],fontFace:"Arial",fontSize:10.5,color:CHAR,valign:"middle",border:{type:"solid",pt:0.5,color:LINE},rowH:trh,align:"left"});
  s.addText(inv.topCaption||"",{x:tx+0.25,y:2.15+trh.reduce((a,b)=>a+b,0)+0.08,w:5.55,h:0.8,fontFace:"Arial",fontSize:9.5,italic:true,color:MUTE,valign:"top",margin:0});
}
else if (inv.splitB) splitCard(6.78, inv.splitB);
footer(s,3);

// ---------- SLIDE 4: EXCESS & CASH AT RISK ----------
s = p.addSlide(); s.background={color:WHITE}; const ca = C.cash || {};
title(s, ca.title||"Excess & cash at risk");
card(s,0.55,1.25,4.1,4.95,INK);
s.addText(ca.bigValue||"",{x:0.75,y:1.7,w:3.7,h:0.9,fontFace:"Arial",fontSize:46,bold:true,color:ACC,margin:0});
s.addText(ca.bigLabel||"",{x:0.75,y:2.6,w:3.7,h:0.6,fontFace:"Arial",fontSize:14,color:WHITE,margin:0});
s.addShape(p.shapes.LINE,{x:0.75,y:3.35,w:3.5,h:0,line:{color:"3A434F",width:1}});
(ca.facts||[]).slice(0,3).forEach((f,i)=>{ const fy=3.55+i*0.62;
  s.addText(f[0],{x:0.75,y:fy,w:1.5,h:0.5,fontFace:"Arial",fontSize:20,bold:true,color:WHITE,margin:0,valign:"middle"});
  s.addText(f[1],{x:2.25,y:fy,w:2.3,h:0.5,fontFace:"Arial",fontSize:10.5,color:"C7CCD3",margin:0,valign:"middle"}); });
s.addText(ca.bigNote||"",{x:0.75,y:5.5,w:3.75,h:0.6,fontFace:"Arial",fontSize:11,italic:true,color:"C7CCD3",margin:0});
card(s,4.78,1.25,8.0,4.95);
s.addText(rich(ca.headline),{x:5.0,y:1.42,w:7.6,h:0.85,fontFace:"Arial",fontSize:13,valign:"middle",margin:0});
const hh={bold:true,color:WHITE,fill:{color:INK}};
const fourCol = (ca.items||[]).some(it=>it.action||it.cover);
let crows, ccolW;
if (fourCol){
  crows=[[{text:ca.tableTitle||"Items",options:hh},{text:"Cover",options:{...hh,align:"right"}},{text:"Action",options:hh},{text:ca.tableCol||"Stock €",options:{...hh,align:"right"}}]];
  (ca.items||[]).forEach(it=> crows.push([
    {text:it.name,options:{hyperlink:{url:FL(it.id)},...lc}},
    {text:it.cover||"",options:{align:"right",color:CHAR}},
    {text:it.action||"",options:{color:(it.action&&it.action.toLowerCase().indexOf("cancel")>=0)?STEEL:col("AMBER"),bold:true}},
    {text:it.value,options:{align:"right",color:CHAR}} ]));
  ccolW=[3.55,0.95,1.85,1.25];
} else {
  crows=[[{text:ca.tableTitle||"Top items",options:hh},{text:ca.tableCol||"Excess €",options:{...hh,align:"right"}}]];
  (ca.items||[]).forEach(it=> crows.push([{text:it.name,options:{hyperlink:{url:FL(it.id)},...lc}},{text:it.value,options:{align:"right"}}]));
  ccolW=[6.0,1.6];
}
s.addTable(crows,{x:5.0,y:2.35,w:7.6,colW:ccolW,fontFace:"Arial",fontSize:10.5,color:CHAR,valign:"middle",border:{type:"solid",pt:0.5,color:LINE},rowH:0.38,align:"left"});
s.addText(ca.caption||"Product names link to the item in the Flowlity app.",{x:5.0,y:5.62,w:7.6,h:0.4,fontFace:"Arial",fontSize:10,italic:true,color:MUTE,margin:0});
footer(s,4);

// ---------- SLIDE 5: AVAILABILITY & SUPPLY RISK ----------
s = p.addSlide(); s.background={color:WHITE}; const av = C.availability || {};
title(s, av.title||"Availability & supply risk");
let cxx=0.55;
(av.kpis||[]).slice(0,2).forEach(k=>{ card(s,cxx,1.3,3.0,1.5);
  s.addText(k.v,{x:cxx+0.15,y:1.45,w:2.7,h:0.6,fontFace:"Arial",fontSize:30,bold:true,color:col(k.color||"CHAR"),margin:0,valign:"middle"});
  s.addText(k.l,{x:cxx+0.15,y:2.05,w:2.7,h:0.7,fontFace:"Arial",fontSize:11,color:CHAR,margin:0}); cxx+=3.15; });
card(s,0.55,3.0,6.15,3.2);
s.addText(av.riskTitle||"Where the risk sits",{x:0.75,y:3.12,w:5.7,h:0.4,fontFace:"Arial",fontSize:13.5,bold:true,color:CHAR,margin:0});
if (av.risk){
  const rk=av.risk, rl=rk.labels||[], rv=rk.values||[], rc=rk.colors||[];
  const rmax=rk.max||(Math.max.apply(null,rv)*1.1);
  const rx0=0.75, rlabW=1.55, rtX=2.45, rtW=2.95, rY0=3.66, rStep=0.47, rbH=0.22;
  rl.forEach((lb,i)=>{ const yy=rY0+i*rStep;
    s.addText(lb,{x:rx0,y:yy-0.04,w:rlabW,h:0.3,fontFace:"Arial",fontSize:11,bold:true,color:CHAR,align:"right",valign:"middle",margin:0});
    s.addShape(p.shapes.RECTANGLE,{x:rtX,y:yy,w:rtW,h:rbH,fill:{color:"EEF0F2"}});
    s.addShape(p.shapes.RECTANGLE,{x:rtX,y:yy,w:Math.max(0.03,rtW*rv[i]/rmax),h:rbH,fill:{color:col(rc[i]||"GREEN")}});
    s.addText(rv[i].toFixed(1)+"%",{x:rtX+rtW+0.08,y:yy-0.04,w:0.9,h:0.3,fontFace:"Arial",fontSize:11,bold:true,color:CHAR,valign:"middle",margin:0}); });
}
card(s,6.9,3.0,5.88,3.2);
s.addText(av.exposedTitle||"Most exposed SKUs",{x:7.1,y:3.12,w:5.5,h:0.4,fontFace:"Arial",fontSize:13.5,bold:true,color:CHAR,margin:0});
const arows=[[{text:"Product",options:hh},{text:"Firm PO — due",options:{...hh}},{text:"Status",options:{...hh}}]];
(av.exposed||[]).forEach(e=> arows.push([
  {text:e.name,options:{hyperlink:{url:FL(e.id)},...lc}},
  {text:e.po||"— no PO",options:{color:(e.po?CHAR:col("AMBER")),bold:!e.po}},
  {text:e.status||"",options:{color:(e.status&&/overdue|slip|late/i.test(e.status))?col("AMBER"):col("GREEN"),bold:true}} ]));
const rh=[0.42]; for(let i=1;i<arows.length;i++) rh.push(0.40);
s.addTable(arows,{x:7.1,y:3.5,w:5.5,colW:[2.5,1.65,1.35],fontFace:"Arial",fontSize:10,color:CHAR,valign:"middle",border:{type:"solid",pt:0.5,color:LINE},rowH:rh,align:"left"});
s.addText(av.caption||"",{x:7.1,y:3.5+rh.reduce((a,b)=>a+b,0)+0.05,w:5.5,h:0.4,fontFace:"Arial",fontSize:9.5,italic:true,color:MUTE,margin:0});
footer(s,5);

// ---------- SLIDE 6: STOCK HEALTH & FORECAST QUALITY ----------
s = p.addSlide(); s.background={color:WHITE}; const nf = C.newForecast || {};
title(s, nf.title||"Stock health & forecast quality");

// Top-left: stock-health / working-capital split
card(s,0.55,1.25,6.0,2.72);
s.addText(nf.stockTitle||"Working-capital split",{x:0.78,y:1.35,w:5.5,h:0.36,fontFace:"Arial",fontSize:14,bold:true,color:CHAR,margin:0});
s.addText(nf.stockSub||"",{x:0.78,y:1.71,w:5.6,h:0.28,fontFace:"Arial",fontSize:10.5,color:MUTE,margin:0});
const segs = nf.stockSegments||[];
const sbX=0.8, sbY=2.02, sbW=5.5, sbH=0.40; let sx=sbX;
segs.forEach(g=>{ const w=sbW*(g.frac||0); if(w>0.002){ s.addShape(p.shapes.RECTANGLE,{x:sx,y:sbY,w,h:sbH,fill:{color:col(g.color)}}); } sx+=w; });
const lgY=sbY+sbH+0.13;
segs.forEach((g,i)=>{ const ly=lgY+i*0.285;
  s.addShape(p.shapes.RECTANGLE,{x:0.8,y:ly+0.02,w:0.17,h:0.17,fill:{color:col(g.color)}});
  s.addText([{text:g.label+"   ",options:{bold:true,color:CHAR}},{text:g.value+(g.pct?("  ("+g.pct+")"):"")+(g.count?("   ·  "+g.count):"")}],{x:1.05,y:ly-0.04,w:5.45,h:0.27,fontFace:"Arial",fontSize:11,valign:"middle",margin:0}); });
s.addText(nf.stockNote||"",{x:0.78,y:lgY+segs.length*0.285+0.04,w:5.7,h:0.42,fontFace:"Arial",fontSize:8.5,italic:true,color:MUTE,margin:0});

// Top-right: forecast accuracy — aggregate KPI cards (or fallback to bars)
card(s,6.78,1.25,6.0,2.72);
s.addText(nf.mapeTitle||"Forecast accuracy",{x:7.0,y:1.35,w:5.6,h:0.36,fontFace:"Arial",fontSize:14,bold:true,color:CHAR,margin:0});
if (nf.accuracyClass && nf.accuracyClass.length){
  const ac=nf.accuracyClass, acMax=nf.accuracyMax||(Math.max.apply(null,ac.map(a=>a.value))*1.1);
  const alabX=7.0, alabW=1.35, atX=8.5, atW=2.5, aY0=1.95, aStep=0.42, abH=0.20;
  ac.forEach((a,i)=>{ const yy=aY0+i*aStep;
    s.addText(a.label,{x:alabX,y:yy-0.05,w:alabW,h:0.3,fontFace:"Arial",fontSize:11,bold:true,color:CHAR,align:"right",valign:"middle",margin:0});
    s.addShape(p.shapes.RECTANGLE,{x:atX,y:yy,w:atW,h:abH,fill:{color:"EEF0F2"}});
    s.addShape(p.shapes.RECTANGLE,{x:atX,y:yy,w:Math.max(0.03,atW*Math.min(a.value,acMax)/acMax),h:abH,fill:{color:col(a.color||"GREEN")}});
    s.addText(a.text||(a.value+"%"),{x:atX+atW+0.08,y:yy-0.05,w:1.25,h:0.3,fontFace:"Arial",fontSize:11,bold:true,color:CHAR,valign:"middle",margin:0}); });
  s.addText(nf.mapeNote||"",{x:7.0,y:aY0+ac.length*aStep+0.06,w:5.65,h:0.62,fontFace:"Arial",fontSize:9,italic:true,color:MUTE,margin:0,valign:"top"});
} else if (nf.accuracy && nf.accuracy.length){
  const acc=nf.accuracy.slice(0,2);
  acc.forEach((k,i)=>{ const ax=7.0+i*2.9;
    s.addText(k.v,{x:ax,y:1.82,w:2.75,h:0.6,fontFace:"Arial",fontSize:29,bold:true,color:col(k.color||"CHAR"),margin:0,valign:"middle"});
    s.addText(k.l,{x:ax,y:2.46,w:2.8,h:0.62,fontFace:"Arial",fontSize:10,color:SUB,margin:0,valign:"top"}); });
  s.addText(nf.mapeNote||"",{x:7.0,y:3.2,w:5.65,h:0.7,fontFace:"Arial",fontSize:9,italic:true,color:MUTE,margin:0,valign:"top"});
} else {
  const trackX=8.65, trackW=2.55, scale=nf.mapeScale||90;
  const bY0=1.98, bStep=0.34;
  (nf.mape||[]).forEach((m,i)=>{ const y=bY0+i*bStep;
    s.addText(m.label,{x:7.0,y:y-0.02,w:1.6,h:0.24,fontFace:"Arial",fontSize:10.5,bold:true,color:CHAR,margin:0,valign:"middle"});
    s.addShape(p.shapes.RECTANGLE,{x:trackX,y:y+0.02,w:trackW,h:0.14,fill:{color:"EEF0F2"}});
    if(m.value!==null && m.value!==undefined) s.addShape(p.shapes.RECTANGLE,{x:trackX,y:y+0.02,w:Math.max(0.03,trackW*m.value/scale),h:0.14,fill:{color:col(m.color||"STEEL")}});
    s.addText(m.text,{x:11.3,y:y-0.02,w:1.35,h:0.24,fontFace:"Arial",fontSize:10.5,bold:true,color:(m.value==null?MUTE:CHAR),valign:"middle",margin:0}); });
  s.addText(nf.mapeNote||"",{x:7.0,y:bY0+(nf.mape||[]).length*bStep+0.06,w:5.6,h:0.6,fontFace:"Arial",fontSize:9,italic:true,color:MUTE,margin:0});
}

// Bottom-left: stock-value trend (half width)
card(s,0.55,4.05,6.05,2.15,PANEL);
const tr = nf.trend;
if (tr && tr.series && tr.series.length){
  s.addText(tr.title||"Direction of travel — last 12 months",{x:0.78,y:4.14,w:5.6,h:0.34,fontFace:"Arial",fontSize:13,bold:true,color:CHAR,margin:0});
  s.addChart(p.charts.LINE, tr.series.map(se=>({ name:se.name, labels:tr.labels, values:se.values })), {
    x:0.62, y:4.55, w:5.85, h:1.45,
    chartColors: tr.series.map(se=>col(se.color||"STEEL")),
    lineSize:2.5, lineSmooth:false, lineDataSymbol:"circle", lineDataSymbolSize:4,
    showLegend:false, showTitle:false,
    catAxisLabelColor:MUTE, catAxisLabelFontSize:7.5, catAxisLabelFontFace:"Arial",
    valAxisLabelColor:MUTE, valAxisLabelFontSize:7.5, valAxisLabelFontFace:"Arial",
    valAxisLabelFormatCode:tr.yfmt||"0", valAxisMinVal:tr.ymin, valAxisMaxVal:tr.ymax,
    valGridLine:{color:"EEF0F2",style:"solid",size:1}, catGridLine:{style:"none"} });
  // Bottom-right: reading of the trend
  card(s,6.78,4.05,6.0,2.15,PANEL);
  s.addText(tr.rightTitle||"Reading the trend",{x:7.0,y:4.18,w:5.6,h:0.34,fontFace:"Arial",fontSize:13,bold:true,color:CHAR,margin:0});
  s.addText(rich(tr.rightBody||[{text:tr.note||"",color:"CHAR"}]),{x:7.0,y:4.62,w:5.6,h:1.4,fontFace:"Arial",fontSize:12,color:CHAR,valign:"top",margin:0});
} else {
  s.addText(nf.trendTitle||"Direction of travel",{x:0.78,y:4.18,w:5.5,h:0.4,fontFace:"Arial",fontSize:13,bold:true,color:CHAR,margin:0});
  s.addText(rich(nf.trendBody),{x:0.78,y:4.62,w:5.7,h:1.45,fontFace:"Arial",fontSize:10.5,color:CHAR,valign:"top",margin:0});
}
if (nf.classNote) s.addText(rich(nf.classNote),{x:0.55,y:6.34,w:12.2,h:0.6,fontFace:"Arial",fontSize:8.5,italic:true,color:MUTE,valign:"top",margin:0});
footer(s,6);

p.writeFile({ fileName: outPath }).then(f => console.log("WROTE", f));
