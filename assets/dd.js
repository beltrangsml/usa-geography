/* DATA DESK v2 · vanilla JS dashboard. No dependencies, works offline.
   Needs window.DD_DATA (dd-data.js) and window.DD_GEO (dd-geo.js).
   DataDesk(el,{eyebrow,title,desc,metric,pair:['TX','CA'],pulse:[[value,label,src]],extra:[[label,a,b,fa,fb,src]]}) */
(function(){
'use strict';
var D=window.DD_DATA,G=window.DD_GEO,YEARS=D.meta.years;
var REG={NE:'Northeast',MW:'Midwest',S:'South',W:'West'};
var pct=function(v){return v==null?'<1%':(+v).toFixed(1)+'%'},pct0=function(v){return v==null?'<1%':Math.round(v)+'%'};
var M={
  pop :{noun:'population',lab:'Population',short:'Population',f:function(v){return v>=1e6?(v/1e6).toFixed(v>=1e7?1:2)+' M':(v/1e3).toFixed(0)+' k'},dk:'pct',src:'acs',tbl:'B01003',
        def:'Total resident population. The ACS survey estimate differs slightly from the Census Bureau’s official Population Estimates (341.8 M for July 2025, used in the headline figures).'},
  fb  :{noun:'foreign-born share',lab:'Foreign-born',short:'Foreign-born',f:pct,dk:'pp',src:'acs',tbl:'B05002',
        def:'Share of residents born outside the United States, including naturalised citizens.'},
  hisp:{noun:'Hispanic share',lab:'Hispanic or Latino',short:'Hispanic',f:pct,dk:'pp',src:'acs',tbl:'B03003',
        def:'Share of residents who identify as Hispanic or Latino, of any race. Highest in the former Mexican lands of the South-west.'},
  inc :{noun:'median household income',lab:'Median household income',short:'Median income',f:function(v){return '$'+(v/1000).toFixed(1)+'k'},dk:'pct',src:'acs',tbl:'B19013',
        def:'Median household income in the past 12 months, in dollars of each survey year. Changes between years include inflation.'},
  pov :{noun:'poverty rate',lab:'Below poverty line',short:'Poverty',f:pct,dk:'pp',src:'acs',tbl:'B17001',inv:true,
        def:'Share of people whose income is below the official federal poverty threshold.'},
  ba  :{noun:'share of graduates',lab:'Bachelor’s degree or higher',short:'Bachelor’s+',f:pct,dk:'pp',src:'acs',tbl:'B15003',
        def:'Share of adults aged 25 and over with a bachelor’s, master’s, professional or doctoral degree.'},
  age :{noun:'median age',lab:'Median age',short:'Median age',f:function(v){return v.toFixed(1)+' yrs'},dk:'abs',src:'acs',tbl:'B01002',
        def:'Median age of the population. Utah and Texas are the youngest states; Maine and New Hampshire the oldest.'},
  rel :{noun:'share of Christian adults',lab:'Christian adults',short:'Christian',f:pct0,src:'pew',fixed:'2023–24',
        def:'Share of adults who identify as Christian (Protestant, Catholic, Latter-day Saint, Orthodox and others). One survey wave, so there is no year selector; differences between neighbouring states may be within the margin of error.'},
  vote:{noun:'2024 margin',lab:'2024 presidential vote',short:'2024 vote',f:function(v){return (v>0?'Trump +':v<0?'Harris +':'')+Math.abs(v).toFixed(1)},src:'vote',fixed:'2024',div:true,
        def:'Margin between Trump and Harris as a share of all votes cast for president in each state. Maine and Nebraska split one electoral vote each by district; this map uses the statewide result.'}
};
var ACS=['pop','fb','hisp','inc','pov','ba','age'],ORDER=ACS.concat(['rel','vote']);
var RAMP=['#F2E6D2','#E3C9A2','#D0A574','#B67E47','#8C5A2B','#5C3A1B'];
var DIV=[[-20,'#1F4673'],[-10,'#2C5A8C'],[-3,'#86A3C3'],[3,'#E7DFD1'],[10,'#D9958C'],[20,'#B8453B'],[999,'#8A1F18']];
var A_COL='#8C5A2B',B_COL='#2E4A22',DEM='#2C5A8C',REP='#A3261E',RCOL={NE:'#7B47A0',MW:'#00806A',S:'#B4362A',W:'#B7860F'};
var NS='http://www.w3.org/2000/svg';
function s(tag,at){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);return e}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var tip;function showTip(html,ev){if(!tip){tip=document.createElement('div');tip.className='dd-tip';tip.setAttribute('role','tooltip');document.body.appendChild(tip)}tip.innerHTML=html;tip.classList.add('on');var x=ev.clientX+14,y=ev.clientY+14,w=tip.offsetWidth,h=tip.offsetHeight;if(x+w>innerWidth-8)x=ev.clientX-w-14;if(y+h>innerHeight-8)y=ev.clientY-h-14;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){if(tip)tip.classList.remove('on')}
function delta(m,a,b){if(a==null||b==null)return null;var d=a-b;
  if(m.dk==='pp')return{v:d,t:(d>=0?'+':'−')+Math.abs(d).toFixed(1)+' pp'};if(m.dk==='abs')return{v:d,t:(d>=0?'+':'−')+Math.abs(d).toFixed(1)+' yrs'};
  var p=(a/b-1)*100;return{v:p,t:(p>=0?'+':'−')+Math.abs(p).toFixed(1)+'%'}}
var reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function countUp(el,to,fmt){var from=el.dataset.v!=null?+el.dataset.v:to*.9,t0=performance.now();el.dataset.v=to;if(reduced){el.textContent=fmt(to);return}
  (function f(t){var p=Math.min(1,(t-t0)/650),e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(f)})(t0)}
var ICON={info:'<circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5h.01"/>',csv:'<path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10"/>',reset:'<path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5V5h2.5"/>',table:'<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 7h12M6 7v6"/>',map:'<path d="M1.5 4 6 2l4 2 4.5-2v10L10 14l-4-2-4.5 2z"/><path d="M6 2v10M10 4v10"/>',trend:'<path d="M1.5 12.5 6 8l3 3 5.5-6.5"/><path d="M11 4.5h3.5V8"/>',rank:'<path d="M2 3h12M2 6.5h9M2 10h6M2 13.5h3"/>',coin:'<path d="M2 13.5h12M3.5 13.5V8M7 13.5V5M10.5 13.5V9.5M14 13.5V3"/>'};
function ico(k){return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'+ICON[k]+'</svg>'}

window.DataDesk=function(root,cfg){
  cfg=cfg||{};var uid=root.id||('dd'+Math.random().toString(36).slice(2,7));
  var st={year:'2024',cmp:'2019',reg:'ALL',metric:cfg.metric||'fb',a:cfg.pair?cfg.pair[0]:null,b:cfg.pair?cfg.pair[1]:null,q:'',sort:null,dir:-1,view:'map'};
  var VIEWS=[['map','Map & profile','map'],['trend','Trends','trend'],['rank','Ranking','rank'],['table','Table','table']].concat(cfg.extra?[['extra',cfg.extraLabel||'Economy','coin']]:[]).filter(function(v){return !cfg.views||cfg.views.indexOf(v[0])>=0});if(cfg.views){root.classList.add('dd-compact');if(cfg.pair)VIEWS[0]=['map','Comparison','map']}
  var codes=Object.keys(D.states).sort(function(x,y){return D.states[x].name<D.states[y].name?-1:1});
  root.classList.add('dd');
  root.innerHTML=
  '<header class="dd-top"><div class="dd-title"><span class="cap">'+esc(cfg.eyebrow||'Data desk')+'</span><h3>'+esc(cfg.title||'')+'</h3><p>'+esc(cfg.desc||'')+'</p></div>'+
  '<div class="dd-status"><span class="dd-pill" title="Every figure comes from a published official or academic table. Nothing is estimated by us."><i></i>Verified data · Census ACS · Pew · MIT Election Lab · retrieved 20 Nov 2026</span>'+
  '<div class="dd-actions"><button class="dd-ib" data-act="info" type="button">'+ico('info')+'Method</button><button class="dd-ib" data-act="csv" type="button">'+ico('csv')+'CSV</button><button class="dd-ib" data-act="reset" type="button">'+ico('reset')+'Reset</button></div></div>'+
  (cfg.pulse?'<div class="dd-pulse">'+cfg.pulse.map(function(p){return '<span><b class="num">'+esc(p[0])+'</b>'+esc(p[1])+' <em>'+esc(p[2])+'</em></span>'}).join('')+'</div>':'')+'</header>'+
  '<div class="dd-bar" role="toolbar" aria-label="Filters">'+
   '<div class="dd-ctl"><label>Year</label><div class="dd-seg" data-g="year">'+YEARS.map(function(y){return '<button type="button" data-v="'+y+'">'+y+'</button>'}).join('')+'</div></div>'+
   '<div class="dd-ctl"><label for="'+uid+'-cmp">Compare with</label><select id="'+uid+'-cmp" data-g="cmp"></select></div>'+
   '<div class="dd-ctl"><label>Region</label><div class="dd-seg" data-g="reg"><button type="button" data-v="ALL">All</button>'+Object.keys(REG).map(function(r){return '<button type="button" data-v="'+r+'"><span class="rdot" style="background:'+RCOL[r]+'"></span>'+REG[r]+'</button>'}).join('')+'</div></div>'+
  '</div>'+
  '<nav class="dd-tabs" role="tablist" aria-label="Indicator">'+ORDER.map(function(k){return '<button type="button" role="tab" data-m="'+k+'">'+M[k].short+(M[k].fixed?'<small>'+M[k].fixed+'</small>':'')+'</button>'}).join('')+'</nav>'+
  '<div class="dd-body">'+
   '<p class="dd-find" data-p="find" aria-live="polite"></p>'+
   '<div class="dd-kpis" data-p="kpis"></div>'+
   '<div class="dd-shell"><nav class="dd-side" role="tablist" aria-label="Dashboard views">'+VIEWS.map(function(v){return '<button type="button" role="tab" data-view="'+v[0]+'">'+ico(v[2])+'<span>'+v[1]+'</span></button>'}).join('')+'</nav><div class="dd-views">'+
   '<div class="dd-view" data-view="map"><div class="dd-main"><section class="dd-card dd-map" aria-label="Map"><div class="dd-chead"><div><h4 data-p="mapT"></h4><p data-p="mapS"></p></div></div><div class="dd-mapbox" data-p="map"></div><div class="dd-legend" data-p="leg"></div></section>'+
   '<section class="dd-card dd-detail" aria-live="polite" data-p="det"></section></div></div>'+
   '<div class="dd-view" data-view="trend"><section class="dd-card"><div class="dd-chead"><div><h4 data-p="trT"></h4><p data-p="trS"></p></div></div><div class="dd-fig" data-p="trend"></div><div class="dd-legend" data-p="trL"></div></section></div>'+
   '<div class="dd-view" data-view="rank"><section class="dd-card"><div class="dd-chead"><div><h4 data-p="rkT"></h4><p data-p="rkS"></p></div></div><div class="dd-usline" data-p="usl"></div><div class="dd-rank" data-p="rank"></div></section></div>'+
   '<div class="dd-view" data-view="table"><section class="dd-card"><div class="dd-chead"><div><h4>All states · data table</h4><p>Sort by any column, search, click a row to open the state on the map.</p></div><div class="dd-ctl"><input type="search" placeholder="Search a state…" aria-label="Search a state" data-p="q"></div></div><div class="dd-tw"><table><thead data-p="th"></thead><tbody data-p="tb"></tbody></table></div></section></div>'+
   (cfg.extra?'<div class="dd-view" data-view="extra"><section class="dd-card" data-p="extra"></section></div>':'')+
   '</div></div>'+
  '</div>'+
  '<div class="dd-modal" data-p="modal" role="dialog" aria-modal="true" aria-label="Method and sources"><div class="box"><button class="x" type="button" aria-label="Close">×</button><div data-p="mbody"></div></div></div>';
  var P={};root.querySelectorAll('[data-p]').forEach(function(e){P[e.dataset.p]=e});

  // ---------- helpers
  function val(c,k,y){var r=D.states[c];if(k==='rel')return r.rel.chr;if(k==='vote')return r.vt.m;return r.y[y||st.year][k]}
  function usVal(k,y){if(k==='rel')return D.relUS.chr;if(k==='vote')return D.vote.US.m;return D.agg.US[y||st.year][k]}
  function scopeVal(k,y){var key=st.reg==='ALL'?'US':st.reg;if(k==='vote')return D.vote[key].m;if(k==='rel')return st.reg==='ALL'?D.relUS.chr:null;return D.agg[key][y||st.year][k]}
  function inScope(c){return st.reg==='ALL'||D.states[c].reg===st.reg}
  function scopeName(){return st.reg==='ALL'?'United States':REG[st.reg]+' region'}
  function color(k,v){if(M[k].div){for(var i=0;i<DIV.length;i++)if(v<DIV[i][0])return DIV[i][1];return DIV[DIV.length-1][1]}var br=breaks(k);var i2=0;while(i2<br.length&&v>=br[i2])i2++;return RAMP[i2]}
  var brCache={};function breaks(k){var key=k+st.year;if(brCache[key])return brCache[key];var v=codes.map(function(c){return val(c,k)}).sort(function(a,b){return a-b}),br=[];for(var i=1;i<6;i++)br.push(v[Math.floor(i*v.length/6)]);return brCache[key]=br}
  function lum(hex){var n=parseInt(hex.slice(1),16);return(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255}
  function rankOf(c,k){return codes.slice().sort(function(x,y){return val(y,k)-val(x,k)}).indexOf(c)+1}

  // ---------- controls
  root.querySelector('[data-g=year]').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;st.year=b.dataset.v;if(st.cmp!=='none'&&st.cmp>=st.year)st.cmp=st.year>YEARS[0]?YEARS[0]:'none';render()});
  root.querySelector('[data-g=reg]').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;st.reg=b.dataset.v;render()});
  root.querySelector('[data-g=cmp]').addEventListener('change',function(e){st.cmp=e.target.value;render()});
  root.querySelector('.dd-tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;st.metric=b.dataset.m;render()});
  P.q.addEventListener('input',function(){st.q=P.q.value.trim().toLowerCase();renderTable()});
  root.querySelector('.dd-side').addEventListener('click',function(e){var b=e.target.closest('button');if(b)setView(b.dataset.view)});
  function setView(v){st.view=v;root.querySelectorAll('.dd-side button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.view===v)});
    root.querySelectorAll('.dd-view').forEach(function(d){var on=d.dataset.view===v;d.hidden=!on;if(on){d.classList.remove('fade');void d.offsetWidth;d.classList.add('fade')}});
    if(v==='trend')renderTrend();if(v==='map'&&st.a)renderDetail()}
  root.querySelector('[data-act=reset]').addEventListener('click',function(){st.year='2024';st.cmp='2019';st.reg='ALL';st.metric=cfg.metric||'fb';st.a=cfg.pair?cfg.pair[0]:null;st.b=cfg.pair?cfg.pair[1]:null;st.q='';P.q.value='';st.sort=null;setView('map');render()});
  root.querySelector('[data-act=csv]').addEventListener('click',exportCSV);
  root.querySelector('[data-act=info]').addEventListener('click',function(){P.mbody.innerHTML=methodHTML();if(cfg.onRender)cfg.onRender(P.mbody);P.modal.classList.add('on');P.modal.querySelector('.x').focus()});
  P.modal.addEventListener('click',function(e){if(e.target===P.modal||e.target.closest('.x'))P.modal.classList.remove('on')});
  root.addEventListener('keydown',function(e){if(e.key==='Escape')P.modal.classList.remove('on')});
  root._dd={pair:function(a,b,m){st.a=a;st.b=b;if(m)st.metric=m;setView('map');render()}};
  function select(c,ev){if(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey)&&st.a&&c!==st.a)st.b=c;else if(c===st.a){st.a=st.b;st.b=null}else if(c===st.b){st.b=null}else st.a=c;if(st.view==='rank'||st.view==='table')setView('map');render();
    if(ev&&ev.type==='click'&&innerWidth<1000)P.det.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}

  function render(){
    root.querySelectorAll('[data-g=year] button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v===st.year);b.disabled=!!M[st.metric].fixed});
    root.querySelectorAll('[data-g=reg] button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v===st.reg)});
    root.querySelectorAll('.dd-tabs button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.m===st.metric)});
    var sel=root.querySelector('[data-g=cmp]');sel.innerHTML='<option value="none">No comparison</option>'+YEARS.filter(function(y){return y<st.year}).map(function(y){return '<option value="'+y+'">'+y+'</option>'}).join('');sel.value=st.cmp;
    renderFinding();renderKPIs();renderMap();renderDetail();if(cfg.extra)renderExtra();renderTrend();renderRank();renderTable();if(cfg.onRender)cfg.onRender(root);
  }

  // ---------- finding line (the headline the data supports)
  function renderFinding(){var k=st.metric,m=M[k];
    if(st.a){var va=val(st.a,k),na=D.states[st.a].name,txt;
      if(st.b){var vb=val(st.b,k),nb=D.states[st.b].name;
        if(k==='vote')txt='<b>'+esc(na)+'</b>: '+m.f(va)+' pp. <b>'+esc(nb)+'</b>: '+m.f(vb)+' pp. A gap of '+Math.abs(va-vb).toFixed(1)+' points in the same election.';
        else if(m.dk==='pct'||k==='inc'||k==='pop'){var hi=va>=vb,r=(hi?va/vb:vb/va)-1;txt='<b>'+esc(hi?na:nb)+'</b>’s '+m.noun+' ('+m.f(hi?va:vb)+') is '+(r*100).toFixed(0)+'% higher than <b>'+esc(hi?nb:na)+'</b>’s ('+m.f(hi?vb:va)+').'}
        else txt='<b>'+esc(na)+'</b> '+m.f(va)+' vs <b>'+esc(nb)+'</b> '+m.f(vb)+': a gap of '+Math.abs(va-vb).toFixed(1)+(m.dk==='abs'?' years':' points')+' in '+m.noun+'.';}
      else txt='<b>'+esc(na)+'</b>: '+m.noun+' '+m.f(va)+(k==='vote'?' pp':'')+', rank '+rankOf(st.a,k)+' of 51. United States: '+m.f(usVal(k))+(k==='vote'?' pp':'')+'.';
      P.find.innerHTML=txt+' <span class="src">'+(m.fixed||st.year)+' · '+srcShort(k)+'</span>';return}
    var list=codes.filter(inScope).sort(function(x,y){return val(y,k)-val(x,k)});if(!list.length)return;
    var hi=list[0],lo=list[list.length-1],t;
    if(k==='vote'){var dm=list.filter(function(c){return D.states[c].vt.m<0}).length;t='<b>'+(list.length-dm)+'</b> of '+list.length+' went to Trump. Widest margins: <b>'+esc(D.states[hi].name)+'</b> (Trump +'+val(hi,k).toFixed(1)+') and <b>'+esc(D.states[lo].name)+'</b> (Harris +'+Math.abs(val(lo,k)).toFixed(1)+').'}
    else t='<b>'+esc(D.states[hi].name)+'</b> has the highest '+m.noun+' ('+m.f(val(hi,k))+'), <b>'+esc(D.states[lo].name)+'</b> the lowest ('+m.f(val(lo,k))+'). '+(scopeVal(k)!=null?scopeName()+': '+m.f(scopeVal(k))+'.':'');
    P.find.innerHTML=t+' <span class="src">'+(m.fixed?m.fixed:st.year)+' · '+srcShort(k)+'</span>'}
  function cs(key){return cfg.cites&&cfg.cites[key]?' '+cfg.cites[key]:''}
  function srcShort(k){return (M[k].src==='acs'?'Census ACS 1-year':M[k].src==='pew'?'Pew RLS':'MIT Election Lab')+cs(M[k].src)}

  // ---------- KPIs
  function renderKPIs(){
    var keys=['pop','fb','hisp','inc','pov','ba'],ents=[st.a,st.b].filter(Boolean);
    if(!P.kpis.children.length){P.kpis.innerHTML=keys.map(function(k){return '<button type="button" class="dd-kpi" data-m="'+k+'"><span class="cap"></span><span class="v num"></span><span class="d"></span><svg class="spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"></svg></button>'}).join('');
      P.kpis.addEventListener('click',function(e){var b=e.target.closest('.dd-kpi');if(b){st.metric=b.dataset.m;render()}})}
    function series(e,k){return YEARS.map(function(y){return[+y,e?val(e,k,y):scopeVal(k,y)]})}
    keys.forEach(function(k,i){var m=M[k],card=P.kpis.children[i];card.setAttribute('aria-pressed',st.metric===k);
      var cur=ents.length?val(ents[0],k):scopeVal(k),old=st.cmp!=='none'?(ents.length?val(ents[0],k,st.cmp):scopeVal(k,st.cmp)):null;
      var vEl=card.querySelector('.v');vEl.style.color=ents.length?A_COL:'';countUp(vEl,cur,m.f);
      var d=old!=null?delta(m,cur,old):null,z=d&&Math.abs(d.v)<0.05,good=d&&(m.inv?d.v<0:d.v>0);
      var h=d?'<b class="'+(z?'eq':good?'up':'dn')+'">'+(z?'●':d.v>=0?'▲':'▼')+' '+d.t+'</b>'+(k==='inc'?' nominal':'')+' vs '+st.cmp:'<span>'+scopeName()+' · '+st.year+'</span>';
      if(ents.length===1)h+='<span class="us">US '+m.f(usVal(k))+'</span>';
      if(ents.length===2)h='<span class="num b2">'+ents[1]+' '+m.f(val(ents[1],k))+'</span><span class="us">US '+m.f(usVal(k))+'</span>';
      card.querySelector('.d').innerHTML=h;card.querySelector('.cap').textContent=(ents.length?ents[0]+' · ':'')+m.lab;
      var lines=ents.length?ents.map(function(e){return series(e,k)}):[series(null,k)],ys=[].concat.apply([],lines.map(function(l){return l.map(function(p){return p[1]})})),mn=Math.min.apply(0,ys),mx=Math.max.apply(0,ys);if(mx===mn){mx+=1;mn-=1}
      var X=function(x){return 4+(x-2019)/5*92},Y=function(v){return 22-(v-mn)/(mx-mn)*18},svg=card.querySelector('svg');svg.innerHTML='';
      lines.forEach(function(pts,li){var col=ents.length?(li?B_COL:A_COL):(st.metric===k?A_COL:'#B9A38A');
        svg.appendChild(s('path',{d:'M'+pts.map(function(p){return X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}).join('L'),fill:'none',stroke:col,'stroke-width':2,'stroke-dasharray':li?'4 3':'none','vector-effect':'non-scaling-stroke'}));
        pts.forEach(function(p){var on=String(p[0])===st.year;svg.appendChild(s('circle',{cx:X(p[0]),cy:Y(p[1]),r:on?3.2:2,fill:li?'#FFFDF8':(on?'#1F1712':col),stroke:li?col:'none','stroke-width':li?1.5:0,'vector-effect':'non-scaling-stroke'}))})});
      card.title=m.lab+' · '+lines.map(function(pts,li){return(ents[li]||scopeName())+': '+pts.map(function(p){return p[0]+' '+m.f(p[1])}).join(', ')}).join(' | ');
    })}

  // ---------- geographic map
  var shapes={},labels={};
  function buildMap(){
    var svg=s('svg',{viewBox:'0 0 1040 610',role:'img','aria-label':'Map of the United States by state. Click a state to open its statistics.'});
    var gS=s('g',{}),gL=s('g',{'pointer-events':'none'});svg.appendChild(gS);svg.appendChild(gL);
    var smallOrd=G.small.slice().sort(function(a,b){return G.c[a][1]-G.c[b][1]}),smallY={};smallOrd.forEach(function(c,i){smallY[c]=118+i*25});
    codes.forEach(function(c){var p=s('path',{d:G.paths[c],class:'st',tabindex:0,role:'button','aria-label':D.states[c].name});
      p.addEventListener('mousemove',function(ev){showTip(tipHTML(c),ev)});p.addEventListener('mouseleave',hideTip);
      p.addEventListener('click',function(ev){hideTip();select(c,ev)});p.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(c,ev)}});
      gS.appendChild(p);shapes[c]=p;
      var cc=G.c[c],t;
      if(G.small.indexOf(c)>=0){var ly=smallY[c];gL.appendChild(s('path',{d:'M'+cc[0]+' '+cc[1]+'L'+(cc[0]+8)+' '+cc[1]+'L990 '+ly,class:'lead'}));
        var r=s('rect',{x:992,y:ly-9,width:34,height:18,rx:4,class:'chipbg'});gL.appendChild(r);
        t=s('text',{x:1009,y:ly+4,'text-anchor':'middle',class:'lb sm'});t.textContent=c;gL.appendChild(t);labels[c]={t:t,r:r};
        r.style.pointerEvents='all';r.style.cursor='pointer';r.addEventListener('click',function(ev){select(c,ev)});r.addEventListener('mousemove',function(ev){showTip(tipHTML(c),ev)});r.addEventListener('mouseleave',hideTip)}
      else{t=s('text',{x:cc[0],y:cc[1]+4,'text-anchor':'middle',class:'lb'});t.textContent=c;gL.appendChild(t);labels[c]={t:t}}
    });
    P.map.appendChild(svg);P.mapsvg=svg;P.gS=gS}
  function tipHTML(c){var r=D.states[c],k=st.metric,m=M[k],v=val(c,k);
    var h='<b>'+esc(r.name)+'</b><div class="r"><span>Region</span><span>'+REG[r.reg]+'</span></div>';
    if(k==='vote')h+='<div class="r"><span>Trump</span><span>'+r.vt.tp.toFixed(1)+'%</span></div><div class="r"><span>Harris</span><span>'+r.vt.hp.toFixed(1)+'%</span></div><div class="r"><span>Margin</span><span>'+m.f(v)+' pp</span></div>';
    else{h+='<div class="r"><span>'+m.short+' '+(m.fixed||st.year)+'</span><span>'+m.f(v)+'</span></div><div class="r"><span>United States</span><span>'+m.f(usVal(k))+'</span></div><div class="r"><span>Rank</span><span>'+rankOf(c,k)+' of 51</span></div>';
      if(!m.fixed&&st.cmp!=='none'){var d=delta(m,v,val(c,k,st.cmp));h+='<div class="r"><span>Since '+st.cmp+'</span><span>'+d.t+'</span></div>'}}
    return h+'<div class="hint">Click for full profile · ⇧ + click to compare</div>'}
  function renderMap(){
    if(!P.mapsvg)buildMap();var k=st.metric,m=M[k];
    codes.forEach(function(c){var fill=color(k,val(c,k)),p=shapes[c];p.style.fill=fill;p.style.opacity=inScope(c)?1:.18;
      p.classList.toggle('sel',c===st.a);p.classList.toggle('selb',c===st.b);
      var L=labels[c];L.t.style.fill=L.r?'#3E3129':(lum(fill)<.55?'#FFF8EE':'#3E3129');L.t.style.opacity=inScope(c)?1:.35;if(L.r){L.r.style.fill=fill;L.t.style.fill=lum(fill)<.55?'#FFF8EE':'#3E3129'}});
    [st.a,st.b].forEach(function(c){if(c)P.gS.appendChild(shapes[c])});
    P.mapT.textContent=m.lab+' · '+(m.fixed||st.year);
    P.mapS.textContent=m.div?'Margin in percentage points. Blue: Harris ahead; red: Trump ahead.':'Six classes with the same number of states in each (sextiles). Darker = higher.';
    if(m.div)P.leg.innerHTML='<span class="ramp">'+DIV.map(function(d){return '<i style="background:'+d[1]+'"></i>'}).join('')+'</span><span>Harris +20 ← even → Trump +20</span><span class="srcr">MIT Election Lab · certified results'+cs('vote')+'</span>';
    else{var br=breaks(k),vs=codes.map(function(c){return val(c,k)});
      P.leg.innerHTML='<span class="num">'+m.f(Math.min.apply(0,vs))+'</span><span class="ramp">'+RAMP.map(function(c,i){return '<i style="background:'+c+'" title="'+(i?'≥ '+m.f(br[i-1]):'< '+m.f(br[0]))+'"></i>'}).join('')+'</span><span class="num">'+m.f(Math.max.apply(0,vs))+'</span><span class="srcr">'+(m.src==='acs'?'Census ACS 1-year, table '+m.tbl:'Pew RLS 2023–24')+cs(m.src)+' · map'+cs('geo')+'</span>'}
  }

  // ---------- detail panel (state statistics)
  function bullet(k,arr){var m=M[k],vs=codes.map(function(c){return val(c,k)}),mn=Math.min.apply(0,vs),mx=Math.max.apply(0,vs),X=function(v){return((v-mn)/(mx-mn)*100).toFixed(2)},us=usVal(k);
    var h='<div class="dd-bul" title="'+esc(m.lab)+': states range from '+m.f(mn)+' to '+m.f(mx)+'. Black tick = US ('+m.f(us)+')"><span class="track"></span>'+(us>=mn&&us<=mx?'<span class="us" style="left:'+X(us)+'%"></span>':'');
    arr.forEach(function(c,i){var v=val(c,k),p=+X(v),tx=p>82?'-100%':p<18?'0':'-50%',col=i?B_COL:A_COL;
      h+='<span class="dot" style="left:'+p+'%;'+(i?'background:#FFFDF8;border:2.5px solid '+col:'background:'+col)+'"></span><span class="vl num" style="left:'+p+'%;transform:translateX('+tx+');color:'+col+';top:'+(i?'24px':'-2px')+'">'+(arr.length>1?c+' ':'')+m.f(v)+'</span>'});
    return h+'</div>'}
  function stack(parts){return '<div class="dd-stack">'+parts.map(function(p){return '<i style="width:'+p[1]+'%;background:'+p[2]+'" title="'+esc(p[0])+' '+p[3]+'"></i>'}).join('')+'</div><div class="dd-stackl">'+parts.map(function(p){return '<span><i style="background:'+p[2]+'"></i>'+esc(p[0])+' <b class="num">'+p[3]+'</b></span>'}).join('')+'</div>'}
  function relParts(r){return[['Christian',r.chr,'#8C5A2B',r.chr+'%'],['Other faiths',r.oth||0.5,'#C9A36E',r.oth==null?'<1%':r.oth+'%'],['Unaffiliated',r.none,'#CFC3B1',r.none+'%']]}
  function voteParts(v){var o=100-v.hp-v.tp;return[['Harris',v.hp,DEM,v.hp.toFixed(1)+'%'],['Other',o,'#CFC3B1',o.toFixed(1)+'%'],['Trump',v.tp,REP,v.tp.toFixed(1)+'%']]}
  function lineChart(el,series,opts){ // series: [{name,col,dash,pts:[[x,y]],w}]
    var W=el.clientWidth||400,H=opts.h||170,pl=opts.pl||46,pr=opts.pr||64,pt=12,pb=24,svg=s('svg',{width:W,height:H,viewBox:'0 0 '+W+' '+H,role:'img','aria-label':opts.aria||'Line chart'});
    var ys=[].concat.apply([],series.map(function(se){return se.pts.map(function(p){return p[1]})})),mn=Math.min.apply(0,ys),mx=Math.max.apply(0,ys),pad=(mx-mn)*.12||1;mn-=pad;mx+=pad;
    var X=function(x){return pl+(x-2019)/5*(W-pl-pr)},Y=function(v){return pt+(1-(v-mn)/(mx-mn))*(H-pt-pb)};
    for(var i=0;i<=3;i++){var v=mn+(mx-mn)*i/3,y=Y(v);svg.appendChild(s('line',{x1:pl,x2:W-pr,y1:y,y2:y,class:'grid'}));var t=s('text',{x:pl-6,y:y+3,'text-anchor':'end',class:'ax'});t.textContent=opts.f(v);svg.appendChild(t)}
    YEARS.forEach(function(y){var t=s('text',{x:X(+y),y:H-6,'text-anchor':'middle',class:'ax'+(y===st.year?' on':'')});t.textContent=y;svg.appendChild(t)});
    var gx=X(2020),gw=X(2022)-X(2020);svg.appendChild(s('rect',{x:gx,y:pt,width:gw,height:H-pt-pb,class:'gap'}));var gt=s('text',{x:gx+gw/2,y:pt+12,'text-anchor':'middle',class:'ax gapt'});gt.textContent='no 2020 release';svg.appendChild(gt);
    var labs=[];
    series.forEach(function(se){var d='M'+se.pts.map(function(p){return X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}).join('L'),path=s('path',{d:d,fill:'none',stroke:se.col,'stroke-width':se.w||2,'stroke-dasharray':se.dash||'none','stroke-linecap':'round','stroke-linejoin':'round',class:'ln'});svg.appendChild(path);
      if(!reduced){var L=path.getTotalLength?0:0;path.style.strokeDasharray=se.dash||'';}
      se.pts.forEach(function(p){var c=s('circle',{cx:X(p[0]),cy:Y(p[1]),r:String(p[0])===st.year?4:3,fill:se.hollow?'#FFFDF8':se.col,stroke:se.col,'stroke-width':1.6});svg.appendChild(c);
        var hit=s('circle',{cx:X(p[0]),cy:Y(p[1]),r:11,fill:'transparent'});hit.addEventListener('mousemove',function(ev){showTip('<b>'+esc(se.name)+'</b><div class="r"><span>'+p[0]+'</span><span>'+opts.f(p[1])+'</span></div>',ev)});hit.addEventListener('mouseleave',hideTip);svg.appendChild(hit)});
      var last=se.pts[se.pts.length-1];labs.push({y:Y(last[1]),t:se.short||se.name,col:se.col})});
    labs.sort(function(a,b){return a.y-b.y});for(var j=1;j<labs.length;j++)if(labs[j].y-labs[j-1].y<12)labs[j].y=labs[j-1].y+12;
    labs.forEach(function(l){var t=s('text',{x:W-pr+6,y:l.y+4,class:'dl',fill:l.col});t.textContent=l.t;svg.appendChild(t)});
    el.innerHTML='';el.appendChild(svg)}
  function renderDetail(){
    var arr=[st.a,st.b].filter(Boolean),opts=codes.map(function(c){return '<option value="'+c+'">'+esc(D.states[c].name)+'</option>'}).join('');
    var pick='<div class="dd-pick"><select data-x="a" aria-label="State"><option value="">Choose a state…</option>'+opts+'</select><select data-x="b" aria-label="Compare with state"><option value="">+ Compare with…</option>'+opts+'</select></div>';
    if(!arr.length){P.det.innerHTML='<div class="dd-who"><span class="cap">State statistics</span><h4>Click a state on the map</h4></div>'+pick+
      '<p class="dd-note" style="border:0;padding:0">Each state opens its full profile here: origins, income, education, faith and its 2024 vote, compared with the US. Hold ⇧ (Shift) and click a second state to compare two Americas.</p>'+regionSummary();wire();return}
    var k=st.metric,ks=['fb','hisp','inc','pov','ba','age','rel','pop'];
    var h='<div class="dd-who"><span class="cap">State statistics · ACS '+st.year+' · Pew 2023–24 · vote 2024</span><h4>'+arr.map(function(c,i){return '<span style="color:'+(i?B_COL:A_COL)+'">'+esc(D.states[c].name)+'</span>'}).join(' <em>vs</em> ')+'</h4><div class="dd-tags">'+arr.map(function(c){var r=D.states[c];return '<span class="dd-tag"><span class="rdot" style="background:'+RCOL[r.reg]+'"></span>'+REG[r.reg]+'</span><span class="dd-tag">'+M.pop.f(val(c,'pop'))+' people</span>'}).join('')+'</div></div>'+pick;
    h+='<div class="dd-sub">Compared with the other states <span>range of all states · black tick = US'+(arr.length>1?' · filled: '+arr[0]+', ring: '+arr[1]:'')+'</span></div><div class="dd-cmp fade">'+ks.map(function(kk){return '<button type="button" class="dd-row'+(kk===k?' on':'')+'" data-m="'+kk+'"><span class="lab">'+M[kk].short+'</span>'+bullet(kk,arr)+'</button>'}).join('')+'</div>';
    var tk=M[k].fixed?'fb':k;
    h+='<div class="dd-sub">'+M[tk].lab+' over time <span>ACS 1-year, 2019 · 2023 · 2024</span></div><div class="dd-fig sm" data-p2="tl"></div>';
    h+='<div class="dd-two">'+arr.map(function(c,i){var r=D.states[c];return '<div><div class="dd-sub">'+(arr.length>1?c+' · ':'')+'Faith <span>Pew 2023–24, adults</span></div>'+stack(relParts(r.rel))+'</div>'}).join('')+'</div>';
    h+='<div class="dd-two">'+arr.map(function(c){var r=D.states[c];return '<div><div class="dd-sub">'+(arr.length>1?c+' · ':'')+'2024 presidential vote <span>'+(r.vt.m>0?'Trump':'Harris')+' +'+Math.abs(r.vt.m).toFixed(1)+' pp</span></div>'+stack(voteParts(r.vt))+'</div>'}).join('')+'</div>';
    if(st.cmp!=='none')h+='<div class="dd-note"><b>Since '+st.cmp+':</b> '+arr.map(function(c){return c+' population '+delta(M.pop,val(c,'pop'),val(c,'pop',st.cmp)).t+', foreign-born '+delta(M.fb,val(c,'fb'),val(c,'fb',st.cmp)).t}).join(' · ')+'.</div>';
    P.det.innerHTML=h;wire();
    P.det.querySelectorAll('.dd-row').forEach(function(b){b.addEventListener('click',function(){st.metric=b.dataset.m;render()})});
    var ser=arr.map(function(c,i){return{name:D.states[c].name,short:c,col:i?B_COL:A_COL,hollow:!!i,dash:i?'5 4':null,pts:YEARS.map(function(y){return[+y,val(c,tk,y)]})}});
    ser.push({name:'United States',short:'US',col:'#7A6A5B',dash:'2 3',w:1.5,pts:YEARS.map(function(y){return[+y,usVal(tk,y)]})});
    var el=P.det.querySelector('[data-p2=tl]');requestAnimationFrame(function(){lineChart(el,ser,{f:M[tk].f,h:150,aria:M[tk].lab+' over time'})});
    function wire(){var a=P.det.querySelector('[data-x=a]'),b=P.det.querySelector('[data-x=b]');a.value=st.a||'';b.value=st.b||'';
      a.addEventListener('change',function(){st.a=a.value||null;if(st.a===st.b)st.b=null;render()});b.addEventListener('change',function(){st.b=b.value||null;if(!st.a){st.a=st.b;st.b=null}render()})}
  }
  function regionSummary(){var k=M[st.metric].fixed?'fb':st.metric,m=M[k],all=Object.keys(REG).map(function(r){return D.agg[r][st.year][k]}),mx=Math.max.apply(0,all);
    return '<div class="dd-sub">'+m.lab+' by census region <span>ACS '+st.year+'</span></div><div class="dd-hbars">'+Object.keys(REG).map(function(r,i){var v=all[i];
      return '<div class="hb"><span class="lab"><span class="rdot" style="background:'+RCOL[r]+'"></span>'+REG[r]+'</span><span class="bar"><i style="width:'+(v/mx*100).toFixed(1)+'%;background:'+RCOL[r]+'"></i></span><span class="num">'+m.f(v)+'</span></div>'}).join('')+'</div>'+
      (st.metric==='vote'?'<div class="dd-sub">2024 vote by census region <span>MIT Election Lab</span></div>'+Object.keys(REG).map(function(r){return '<div class="dd-sub" style="margin:6px 0 2px;border:0">'+REG[r]+'</div>'+stack(voteParts(D.vote[r]))}).join(''):'')}

  // ---------- extra panel (pair mode: figures outside the ACS)
  function renderExtra(){var XP=cfg.extraPair||XP,a=st.a,b=st.b,ok=a&&b&&a===XP[0]&&b===XP[1];
    P.extra.innerHTML='<div class="dd-chead"><div><h4>Beyond the survey · '+(ok?XP.join(' vs '):XP.join(' vs '))+'</h4><p>Official economic and population figures used elsewhere on this site. Always '+XP.join(' and ')+', whatever is selected above.</p></div></div><div class="dd-xgrid">'+
    cfg.extra.map(function(x){var mx=Math.max(Math.abs(x[1]),Math.abs(x[2]))||1;return '<div class="x"><span class="cap">'+esc(x[0])+'</span>'+
      [[XP[0],x[1],x[3],A_COL],[XP[1],x[2],x[4],B_COL]].map(function(r){return '<div class="hb"><span class="lab">'+r[0]+'</span><span class="bar"><i style="width:'+(Math.abs(r[1])/mx*100).toFixed(1)+'%;background:'+r[3]+'"></i></span><span class="num">'+esc(r[2])+'</span></div>'}).join('')+'<span class="srcl">'+esc(x[5])+'</span></div>'}).join('')+'</div>'}

  // ---------- trend chart (regions or selected states)
  function renderTrend(){if(st.view!=='trend')return;var k=M[st.metric].fixed?null:st.metric;
    if(!k){var m=M[st.metric];P.trT.textContent=m.lab+' by census region';P.trS.textContent=m.fixed+' only: no time series. Bars compare the four regions.';P.trL.innerHTML='';
      if(st.metric==='vote')P.trend.innerHTML='<div class="dd-hbars">'+Object.keys(REG).map(function(r){var v=D.vote[r];return '<div class="dd-sub" style="border:0;margin:8px 0 2px">'+REG[r]+' <span>'+M.vote.f(v.m)+' pp</span></div>'+stack(voteParts(v))}).join('')+'</div>';
      else{var rows=Object.keys(REG).map(function(r){var cs=codes.filter(function(c){return D.states[c].reg===r}),mn=Math.min.apply(0,cs.map(function(c){return val(c,'rel')})),mx=Math.max.apply(0,cs.map(function(c){return val(c,'rel')}));return[r,mn,mx]});
        P.trend.innerHTML='<p class="dd-note" style="border:0;padding:0;margin-bottom:8px">Range of Christian share among the states of each region (Pew does not publish one state series over time). US: '+D.relUS.chr+'% Christian, '+D.relUS.none+'% unaffiliated.</p><div class="dd-hbars">'+rows.map(function(r){return '<div class="hb"><span class="lab"><span class="rdot" style="background:'+RCOL[r[0]]+'"></span>'+REG[r[0]]+'</span><span class="bar rng"><i style="margin-left:'+(r[1]-40)/45*100+'%;width:'+((r[2]-r[1])/45*100)+'%;background:'+RCOL[r[0]]+'"></i></span><span class="num">'+r[1]+'–'+r[2]+'%</span></div>'}).join('')+'</div><div class="dd-axisn"><span>40%</span><span>85%</span></div>'}
      return}
    var m=M[k],ser;
    if(st.a){ser=[st.a,st.b].filter(Boolean).map(function(c,i){return{name:D.states[c].name,short:c,col:i?B_COL:A_COL,hollow:!!i,dash:i?'5 4':null,pts:YEARS.map(function(y){return[+y,val(c,k,y)]})}});
      ser.push({name:'United States',short:'US',col:'#7A6A5B',dash:'2 3',w:1.5,pts:YEARS.map(function(y){return[+y,usVal(k,y)]})});P.trT.textContent=m.lab+' · selected states vs US'}
    else{ser=Object.keys(REG).map(function(r){return{name:REG[r]+' region',short:REG[r],col:RCOL[r],w:st.reg===r||st.reg==='ALL'?2.2:1.2,pts:YEARS.map(function(y){return[+y,D.agg[r][y][k]]})}});
      ser.push({name:'United States',short:'US',col:'#1F1712',dash:'2 3',w:1.5,pts:YEARS.map(function(y){return[+y,D.agg.US[y][k]]})});P.trT.textContent=m.lab+' · the four regions over time'}
    P.trS.textContent='Census ACS 1-year, 2019, 2023 and 2024. '+(k==='inc'?'Dollars of each year (not inflation-adjusted).':'Hover a point for its value.');
    P.trL.innerHTML=ser.map(function(se){return '<span class="sw"><i style="background:'+se.col+'"></i>'+esc(se.name)+'</span>'}).join('');
    lineChart(P.trend,ser,{f:m.f,h:250,pr:92,aria:m.lab+' over time'})}

  // ---------- ranking
  function renderRank(){var k=st.metric,m=M[k],list=codes.filter(inScope).sort(function(x,y){return val(y,k)-val(x,k)});
    P.rkT.textContent='Ranking · '+m.short;P.rkS.textContent=(st.reg==='ALL'?'50 states and DC':REG[st.reg]+' region, '+list.length+' states')+(m.div?'. Bars extend left for Harris, right for Trump.':'. Bar colour = census region.');
    var us=usVal(k);P.usl.innerHTML='United States: <b class="num">'+(m.div?m.f(us)+' pp':m.f(us))+'</b>';
    var mx=Math.max.apply(0,list.map(function(c){return Math.abs(val(c,k))}));
    P.rank.innerHTML=list.map(function(c,i){var v=val(c,k),w=(Math.abs(v)/mx*(m.div?50:100)).toFixed(1),col=m.div?(v>0?REP:DEM):RCOL[D.states[c].reg];
      var bar=m.div?'<span class="divbar"><i style="'+(v>0?'left:50%':'right:50%')+';width:'+w+'%;background:'+col+'"></i></span>':'<span><i class="b" style="width:'+w+'%;background:'+col+'"></i></span>';
      return '<button type="button" class="dd-rb'+(c===st.a||c===st.b?' sel':'')+'" data-c="'+c+'"><span class="i">'+(i+1)+'</span><span class="n">'+esc(D.states[c].name)+'</span>'+bar+'<span class="x">'+m.f(v)+'</span></button>'}).join('');
    P.rank.querySelectorAll('.dd-rb').forEach(function(b){b.addEventListener('click',function(ev){select(b.dataset.c,ev)});b.addEventListener('mousemove',function(ev){showTip(tipHTML(b.dataset.c),ev)});b.addEventListener('mouseleave',hideTip)})}

  // ---------- table
  var COLS=[['name','State'],['reg','Region'],['pop','Population'],['fb','Foreign-born'],['hisp','Hispanic'],['inc','Median inc.'],['pov','Poverty'],['ba','Bachelor’s+'],['age','Med. age'],['rel','Christian'],['vote','2024 margin']];
  function cell(c,k){var r=D.states[c];if(k==='name')return esc(r.name);if(k==='reg')return '<span class="rdot" style="background:'+RCOL[r.reg]+'"></span>'+REG[r.reg];if(k==='vote')return '<span style="color:'+(r.vt.m>0?REP:DEM)+';font-weight:600">'+M.vote.f(r.vt.m)+'</span>';return M[k].f(val(c,k))}
  function sv(c,k){var r=D.states[c];return k==='name'?r.name:k==='reg'?REG[r.reg]:val(c,k)}
  function renderTable(){var sk=st.sort||st.metric,dir=st.sort?st.dir:-1;
    P.th.innerHTML='<tr>'+COLS.map(function(c){var on=c[0]===sk;return '<th'+(on?' aria-sort="'+(dir>0?'ascending':'descending')+'"':'')+(c[0]==='reg'?' class="dd-hide-sm"':'')+'><button type="button" data-k="'+c[0]+'">'+c[1]+(on?(dir>0?' ↑':' ↓'):'')+'</button></th>'}).join('')+'</tr>';
    P.th.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){var k=b.dataset.k;if(st.sort===k)st.dir=-st.dir;else{st.sort=k;st.dir=(k==='name'||k==='reg')?1:-1}renderTable()})});
    var list=codes.filter(function(c){return inScope(c)&&(!st.q||D.states[c].name.toLowerCase().indexOf(st.q)>=0||c.toLowerCase()===st.q)});
    list.sort(function(x,y){var a=sv(x,sk),b=sv(y,sk);return(a<b?-1:a>b?1:0)*dir});
    P.tb.innerHTML=list.length?list.map(function(c){return '<tr data-c="'+c+'" tabindex="0" class="'+(c===st.a||c===st.b?'sel':'')+'">'+COLS.map(function(col){return '<td class="'+(col[0]===st.metric?'on':'')+(col[0]==='reg'?' dd-hide-sm':'')+'">'+cell(c,col[0])+'</td>'}).join('')+'</tr>'}).join(''):'<tr><td colspan="11" class="empty">No state matches “'+esc(st.q)+'”.</td></tr>';
    P.tb.querySelectorAll('tr[data-c]').forEach(function(tr){tr.addEventListener('click',function(ev){select(tr.dataset.c,ev)});tr.addEventListener('keydown',function(ev){if(ev.key==='Enter')select(tr.dataset.c,ev)})})}

  // ---------- export + method
  function exportCSV(){var rows=[['state','fips','region','acs_year','population','foreign_born_pct','hispanic_pct','median_household_income_usd','poverty_pct','bachelors_plus_pct','median_age','christian_pct_pew_2023_24','unaffiliated_pct_pew_2023_24','harris_pct_2024','trump_pct_2024','margin_trump_minus_harris_pp']];
    codes.filter(inScope).forEach(function(c){var r=D.states[c],y=r.y[st.year];rows.push([r.name,r.fips,REG[r.reg],st.year,y.pop,y.fb,y.hisp,y.inc,y.pov,y.ba,y.age,r.rel.chr,r.rel.none,r.vt.hp,r.vt.tp,r.vt.m])});
    rows.push([]);rows.push(['Sources: '+D.meta.source+' | '+D.meta.rel+' | '+D.meta.vote+'. Retrieved '+D.meta.retrieved+'.']);
    var csv=rows.map(function(r){return r.map(function(x){x=String(x==null?'':x);return /[",]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x}).join(',')}).join('\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));a.download='american-people-'+st.year+(st.reg==='ALL'?'':'-'+REG[st.reg].toLowerCase())+'.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
  function methodHTML(){var m=M[st.metric],src=(m.src==='acs'?'U.S. Census Bureau, American Community Survey 1-year estimates, table '+m.tbl+', via api.census.gov.':m.src==='pew'?D.meta.rel+'.':D.meta.vote+'.')+cs(m.src);
    return '<h5>'+esc(m.lab)+'</h5><p>'+esc(m.def)+'</p><dl><dt>Source</dt><dd>'+esc(src)+'</dd><dt>Period</dt><dd>'+(m.fixed?m.fixed+'.':'2019, 2023 and 2024. The Census Bureau did not release standard 1-year estimates for 2020 (pandemic), so lines skip 2020–22.')+'</dd><dt>Retrieved</dt><dd>20 Nov 2026. Stored inside the website, so the dashboard works without internet.</dd>'+
    '<dt>Consistency</dt><dd>Headline figures elsewhere on this site come from other official releases with other dates: population 341.8 M (Population Estimates, July 2025'+cs('pep')+') and foreign-born 15.4% (Pew, June 2025'+cs('fbpew')+'). The ACS gives 340.1 M and 14.8% for 2024. The Appalachia case study uses five-year ACS averages for 2020–24 (US poverty 12.5%, median income $80.7k). Each figure is correct for its own source and period.</dd>'+
    '<dt>Caveats</dt><dd>Survey estimates carry margins of error, larger in small states. National and regional ACS figures are the Census Bureau’s own published values, not averages of states. The four regions are the official Census regions: statistical, not cultural.</dd></dl>'}

  setView('map');render();
  var rt;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){renderTrend();if(st.a)renderDetail()},150)});
  return{state:st,render:render};
};
})();
