export const INDEX_HTML: string = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" href="data:,">
<title>ossfit · better GitHub discovery</title>
<style>
:root{
  --bg:#0d1117;--panel:#161b22;--panel2:#1c2128;--soft:#21262d;--border:#30363d;
  --text:#e6edf3;--muted:#8b949e;--faint:#6e7681;
  --accent:#006bff;--accent2:#4493ff;--link:#58a6ff;
  --good:#3fb950;--warn:#d29922;--bad:#f85149;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px 56px}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:18px 0 14px;border-bottom:1px solid var(--soft)}
.brand{font-weight:700;font-size:18px;letter-spacing:-0.02em}
.brand em{font-style:normal;color:var(--accent2)}
.brand-sub{color:var(--faint);font-weight:400;font-size:12px;margin-left:10px}
.tabs{display:flex;gap:4px;background:var(--panel);border:1px solid var(--soft);border-radius:8px;padding:3px}
.tab{background:transparent;border:0;color:var(--muted);font:inherit;font-size:12.5px;padding:4px 14px;border-radius:6px;cursor:pointer}
.tab.active{background:var(--accent);color:#fff}
.tab:hover:not(.active){color:var(--text)}
.searchbar{display:flex;gap:8px;margin-top:16px}
.searchbar input{flex:1;background:var(--panel);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:14px;padding:9px 14px;outline:0}
.searchbar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,107,255,.18)}
.searchbar input::placeholder{color:var(--faint)}
.btn{background:var(--accent);border:1px solid #ffffff22;border-radius:8px;color:#fff;font:inherit;font-weight:600;font-size:13px;padding:0 18px;cursor:pointer;white-space:nowrap}
.btn:hover{filter:brightness(1.15)}
.filters{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px}
.filters label{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}
.filters input{background:var(--panel);border:1px solid var(--soft);border-radius:6px;color:var(--text);font:12px var(--mono);padding:4px 8px;outline:0;width:72px}
.filters input:focus{border-color:var(--accent)}
.filters input::placeholder{color:var(--faint)}
.hint{color:var(--faint);font-size:12px;margin-top:8px}
.hint code{font-family:var(--mono);color:var(--muted)}
.loading{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);padding:36px 0;font-size:13px}
.spinner{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.err{border:1px solid rgba(248,81,73,.4);background:rgba(248,81,73,.08);color:#ffa198;border-radius:8px;padding:10px 14px;margin-top:16px;font-size:13px}
.empty{color:var(--faint);text-align:center;padding:44px 0;font-size:13px}
.sect{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent2);margin:26px 0 10px}
.sect.muted{color:var(--faint)}
.gem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.card{background:var(--panel);border:1px solid var(--soft);border-radius:8px;padding:13px 16px;margin-bottom:10px}
.card:hover{border-color:var(--border)}
.card.gem{border-color:rgba(0,107,255,.45);margin-bottom:0}
.card-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.rank{font-family:var(--mono);font-size:12px;color:var(--faint);min-width:20px}
.name{color:var(--link);font-weight:600;font-size:15px;text-decoration:none}
.name:hover{text-decoration:underline}
.gemtag{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--accent);border-radius:99px;padding:1px 7px}
.head-meta{margin-left:auto;display:flex;align-items:center;gap:14px;color:var(--muted);font-size:12.5px;white-space:nowrap}
.stars{color:#e3b341}
.lang{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
.verdict{margin:7px 0 9px;font-size:13.5px}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.chip{font-family:var(--mono);font-size:11px;padding:2px 9px;border-radius:99px;border:1px solid var(--soft);background:var(--panel2);color:var(--faint)}
.chip b{font-weight:700}
.chip.hi{border-color:rgba(63,185,80,.45);color:var(--good)}
.chip.hi b{color:var(--good)}
.chip.md{border-color:rgba(0,107,255,.5);color:var(--accent2)}
.chip.md b{color:var(--accent2)}
.chip.gemc{border-color:rgba(0,107,255,.5);color:var(--accent2)}
.chip.gemc b{color:var(--accent2)}
.risk{font-size:11px;padding:2px 9px;border-radius:99px;border:1px solid rgba(210,153,34,.45);background:rgba(210,153,34,.08);color:var(--warn)}
.summary{color:var(--muted);font-size:12.5px;margin-top:9px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.results-head{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--faint);margin:26px 0 10px}
.cmp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:16px}
.cmp{margin-bottom:0}
.stats{margin-top:10px}
.stat{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--soft)}
.stat:last-child{border-bottom:0}
.stat span:first-child{color:var(--faint)}
.stat span:last-child{font-family:var(--mono);color:var(--text)}
.foot{margin-top:40px;padding-top:14px;border-top:1px solid var(--soft);color:var(--faint);font-size:11.5px;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="wrap">
  <header class="topbar">
    <div class="brand"><em>oss</em>fit<span class="brand-sub">ranked by fit, not stars</span></div>
    <nav class="tabs">
      <button id="tab-search" class="tab active" type="button">Search</button>
      <button id="tab-compare" class="tab" type="button">Compare</button>
    </nav>
  </header>

  <section id="pane-search">
    <div class="searchbar">
      <input id="q" type="text" placeholder="rate limiter for hono edge…" autocomplete="off" spellcheck="false">
      <button id="go" class="btn" type="button">Search</button>
    </div>
    <div class="filters">
      <label>limit <input id="f-limit" type="number" min="1" max="50" placeholder="20"></label>
      <label>language <input id="f-lang" type="text" placeholder="typescript" spellcheck="false"></label>
      <label>min stars <input id="f-minstars" type="number" min="0" placeholder="0"></label>
      <label>max stars <input id="f-maxstars" type="number" min="0" placeholder="any"></label>
      <label>pushed within <input id="f-pushed" type="number" min="1" placeholder="days"></label>
      <label>license <input id="f-license" type="text" placeholder="mit" spellcheck="false"></label>
    </div>
  </section>

  <section id="pane-compare" hidden>
    <div class="searchbar">
      <input id="cmp" type="text" placeholder="owner/a, owner/b, owner/c" autocomplete="off" spellcheck="false">
      <button id="cmp-go" class="btn" type="button">Compare</button>
    </div>
    <p class="hint">Comma-separated <code>owner/repo</code> names. Each repo costs a few GitHub API calls, uncached ones take a moment.</p>
  </section>

  <div id="status"></div>

  <section id="gems" hidden>
    <h2 class="sect">Hidden gems · high fit, under 1k stars</h2>
    <div id="gems-grid" class="gem-grid"></div>
  </section>

  <div id="results-head" class="results-head" hidden>Results</div>
  <section id="results"></section>
  <section id="compare"></section>

  <footer class="foot">
    <span>ossfit · local-first discovery</span>
    <span>data: GitHub API · cache: ~/.ossfit/ossfit.db</span>
  </footer>
</div>
<script>
(function(){
'use strict';
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c];});}
function fmtNum(n){n=Number(n)||0;if(n>=1e6)return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M';if(n>=1e3)return (n/1e3).toFixed(1).replace(/\.0$/,'')+'k';return String(n);}
function ago(d){if(d===null||d===undefined)return 'n/a';d=Number(d);if(d<1)return 'today';if(d<2)return '1d ago';if(d<31)return Math.round(d)+'d ago';if(d<365)return Math.round(d/30)+'mo ago';return (d/365).toFixed(1)+'y ago';}
var LANG={typescript:'#3178c6',javascript:'#f1e05a',rust:'#dea584',go:'#00add8',python:'#3572a5',java:'#b07219',ruby:'#701516','c++':'#f34b7d',c:'#9b9b9b','c#':'#178600',php:'#4f5d95',swift:'#f05138',kotlin:'#a97bff',shell:'#89e051',html:'#e34c26',css:'#563d7c',vue:'#41b883',zig:'#ec915c',elixir:'#6e4a7e',haskell:'#5e5086',dart:'#00b4ab',scala:'#c22d40',lua:'#7e7eff',svelte:'#ff3e00'};
function langDot(l){if(!l)return '';var c=LANG[String(l).toLowerCase()]||'#8b949e';return '<span class="lang"><i class="dot" style="background:'+c+'"></i>'+esc(l)+'</span>';}
function chip(label,v,isPct){
  var cls='lo';
  if(isPct){if(v>=0.66)cls='hi';else if(v>=0.33)cls='md';}
  else cls='gemc';
  var val=isPct?String(Math.round(Number(v)*100)):Number(v).toFixed(2);
  return '<span class="chip '+cls+'">'+label+' <b>'+val+'</b></span>';
}
function chips(r){return chip('FIT',r.fitScore,true)+chip('HEALTH',r.healthScore,true)+chip('GEM',r.gemScore,false);}
function riskPills(flags){
  if(!flags||!flags.length)return '';
  var h='';
  for(var i=0;i<flags.length;i++)h+='<span class="risk">'+esc(flags[i])+'</span>';
  return h;
}
function card(r,rank,isGem){
  var s=r.signals||{};
  var h='<article class="card'+(isGem?' gem':'')+'">';
  h+='<div class="card-head">';
  if(rank!=null)h+='<span class="rank">'+rank+'</span>';
  h+='<a class="name" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.repo)+'</a>';
  if(isGem)h+='<span class="gemtag">GEM</span>';
  h+='<span class="head-meta"><span class="stars" title="stars">★ '+fmtNum(s.stars)+'</span><span title="last push">'+ago(s.pushedDaysAgo)+'</span>'+langDot(s.language)+'</span>';
  h+='</div>';
  if(r.verdict)h+='<div class="verdict">'+esc(r.verdict)+'</div>';
  h+='<div class="chips">'+chips(r)+riskPills(r.riskFlags)+'</div>';
  if(r.readmeSummary)h+='<p class="summary">'+esc(r.readmeSummary)+'</p>';
  h+='</article>';
  return h;
}
function setStatus(html){$('status').innerHTML=html||'';}
function loading(msg){setStatus('<div class="loading"><span class="spinner"></span>'+esc(msg)+'</div>');}
function showErr(m){setStatus('<div class="err"><b>Error:</b> '+esc(m)+'</div>');}
function showEmpty(m){setStatus('<div class="empty">'+esc(m)+'</div>');}
function clearOutput(){
  $('gems').hidden=true;$('gems-grid').innerHTML='';
  $('results-head').hidden=true;$('results').innerHTML='';$('compare').innerHTML='';
}
function addParam(p,name,id){var v=$(id).value.trim();if(v)p.set(name,v);}
function doSearch(){
  var q=$('q').value.trim();
  if(!q){showErr('Type a query first.');return;}
  clearOutput();loading('Searching GitHub and scoring repos…');
  var p=new URLSearchParams();p.set('q',q);
  addParam(p,'limit','f-limit');addParam(p,'language','f-lang');addParam(p,'minStars','f-minstars');
  addParam(p,'maxStars','f-maxstars');addParam(p,'pushedWithinDays','f-pushed');addParam(p,'license','f-license');
  fetch('/api/search?'+p.toString())
    .then(function(res){return res.json().then(function(data){if(!res.ok)throw new Error((data&&data.error)||('HTTP '+res.status));return data;});})
    .then(renderResults)
    .catch(function(e){showErr((e&&e.message)||String(e));});
}
function renderResults(list){
  setStatus('');
  if(!list||!list.length){showEmpty('No repos matched. Try broader terms or relax a filter.');return;}
  var i,h;
  var gems=list.filter(function(r){return r.signals&&Number(r.signals.stars)<1000;});
  gems=gems.sort(function(a,b){return Number(b.gemScore)-Number(a.gemScore);}).slice(0,3);
  if(gems.length){
    h='';for(i=0;i<gems.length;i++)h+=card(gems[i],null,true);
    $('gems-grid').innerHTML=h;$('gems').hidden=false;
  }
  var rest=[];
  for(i=0;i<list.length;i++)if(gems.indexOf(list[i])===-1)rest.push(list[i]);
  if(rest.length){
    h='';for(i=0;i<rest.length;i++)h+=card(rest[i],i+1,false);
    $('results').innerHTML=h;$('results-head').hidden=false;
  }else{
    showEmpty('Every result is a hidden gem this time.');
  }
}
function statRow(k,v){return '<div class="stat"><span>'+esc(k)+'</span><span>'+esc(v)+'</span></div>';}
function doCompare(){
  var repos=$('cmp').value.split(',').map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
  if(!repos.length){showErr('Enter at least one repo, e.g. owner/a, owner/b');return;}
  clearOutput();loading('Evaluating '+repos.length+' repo'+(repos.length>1?'s':'')+'…');
  fetch('/api/compare?repos='+encodeURIComponent(repos.join(',')))
    .then(function(res){return res.json().then(function(data){if(!res.ok)throw new Error((data&&data.error)||('HTTP '+res.status));return data;});})
    .then(renderCompare)
    .catch(function(e){showErr((e&&e.message)||String(e));});
}
function renderCompare(list){
  setStatus('');
  if(!list||!list.length){showEmpty('Nothing to compare.');return;}
  var h='<div class="cmp-grid">';
  for(var i=0;i<list.length;i++){
    var r=list[i],s=r.signals||{};
    h+='<article class="card cmp">';
    h+='<div class="card-head"><a class="name" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.repo)+'</a></div>';
    h+='<div class="chips" style="margin-top:9px">'+chips(r)+'</div>';
    if(r.verdict)h+='<div class="verdict" style="margin-top:8px">'+esc(r.verdict)+'</div>';
    h+='<div class="stats">';
    h+=statRow('stars',fmtNum(s.stars));
    h+=statRow('forks',fmtNum(s.forks));
    h+=statRow('last push',ago(s.pushedDaysAgo));
    h+=statRow('language',s.language||'n/a');
    h+=statRow('license',s.license||'n/a');
    h+=statRow('contributors',s.contributors==null?'n/a':String(s.contributors));
    h+=statRow('last release',s.lastRelease?String(s.lastRelease).slice(0,10):'n/a');
    h+=statRow('archived',s.archived?'yes':'no');
    h+='</div>';
    var rk=riskPills(r.riskFlags);
    if(rk)h+='<div class="chips" style="margin-top:9px">'+rk+'</div>';
    if(r.readmeSummary)h+='<p class="summary">'+esc(r.readmeSummary)+'</p>';
    h+='</article>';
  }
  h+='</div>';
  $('compare').innerHTML=h;
}
function setMode(m){
  $('tab-search').classList.toggle('active',m==='search');
  $('tab-compare').classList.toggle('active',m==='compare');
  $('pane-search').hidden=(m!=='search');
  $('pane-compare').hidden=(m!=='compare');
  setStatus('');clearOutput();
  (m==='search'?$('q'):$('cmp')).focus();
}
$('go').addEventListener('click',doSearch);
$('q').addEventListener('keydown',function(e){if(e.key==='Enter')doSearch();});
$('cmp-go').addEventListener('click',doCompare);
$('cmp').addEventListener('keydown',function(e){if(e.key==='Enter')doCompare();});
$('tab-search').addEventListener('click',function(){setMode('search');});
$('tab-compare').addEventListener('click',function(){setMode('compare');});
$('q').focus();
})();
</script>
</body>
</html>
`;
