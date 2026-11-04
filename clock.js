'use strict';
/* ---------- Stempeluhr: Zeiten für Mitarbeiter (nur lokal, im selben Speicher wie die Buchungen) ---------- */
function ensureClock(){const c=state.clock&&typeof state.clock==='object'?state.clock:{};
 if(!Array.isArray(c.people))c.people=['Ronny','Patrick'];if(!Array.isArray(c.entries))c.entries=[];if(!c.running||typeof c.running!=='object')c.running={};
 state.clock=c;return c}
const hm=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const toMin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||'');return m?+m[1]*60+ +m[2]:NaN};
function entryMin(e){const s=toMin(e.start),en=toMin(e.end);if(!Number.isFinite(s)||!Number.isFinite(en))return 0;let d=en-s;if(d<0)d+=1440;return Math.max(0,d-(+e.pause||0))}
const fmtH=m=>{m=Math.max(0,Math.round(m));return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`};
const fmtHMS=ms=>{const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
function runNetMs(r,now=Date.now()){const p=(r.pauseMs||0)+(r.pauseTs?now-r.pauseTs:0);return now-r.startTs-p}
function runEntry(p,r){return{id:'run',person:p,date:isoDay(new Date(r.startTs)),start:hm(new Date(r.startTs)),end:'',pause:Math.round(((r.pauseMs||0)+(r.pauseTs?Date.now()-r.pauseTs:0))/60000),note:r.note||'',running:true,netMin:runNetMs(r)/60000}}
const minOf=e=>e.running?e.netMin:entryMin(e);
let clockPerson=null,clockEdit=null;
function weekRange(){const t=new Date();const d=(t.getDay()+6)%7;const a=new Date(t);a.setDate(t.getDate()-d);const b=new Date(a);b.setDate(a.getDate()+6);return[isoDay(a),isoDay(b)]}
function personEntries(p,withRun=true){const c=ensureClock();const l=c.entries.filter(e=>e.person===p);if(withRun&&c.running[p])l.push(runEntry(p,c.running[p]));return l}
const monthKey=()=>`${cur.y}-${String(cur.m+1).padStart(2,'0')}`;
function renderClock(){const el=$('#tab-clock');if(!el)return;const c=ensureClock();
 if(!c.people.includes(clockPerson))clockPerson=c.people[0]||null;
 $('#ckPeople').innerHTML=c.people.map(p=>`<button class="seg${p===clockPerson?' on':''}" data-ckp="${esc(p)}">${esc(p)}${c.running[p]?' <i class="dot'+(c.running[p].pauseTs?' pz':'')+'"></i>':''}</button>`).join('')||'<span class="ksub">Erst unten eine Person anlegen</span>';
 const p=clockPerson,r=p&&c.running[p];$('#ckCard').hidden=!p;
 if(p){$('#ckName').textContent=p;
  $('#ckState').textContent=!r?'Nicht eingestempelt':r.pauseTs?`In Pause seit ${hm(new Date(r.pauseTs))}`:`Eingestempelt seit ${hm(new Date(r.startTs))}`+(isoDay(new Date(r.startTs))!==isoDay(new Date())?` (${fmtDate(isoDay(new Date(r.startTs)))})`:'');
  $('#ckCard').classList.toggle('in',!!r&&!r.pauseTs);$('#ckCard').classList.toggle('pz',!!(r&&r.pauseTs));
  $('#ckBtn').textContent=r?'Ausstempeln':'Einstempeln';$('#ckBtn').className=r?'big out':'big in';
  $('#ckPause').hidden=!r;$('#ckPause').textContent=r&&r.pauseTs?'Pause beenden':'Pause starten';
  const today=isoDay(new Date());const tMin=personEntries(p).filter(e=>e.date===today).reduce((s,e)=>s+minOf(e),0);
  $('#ckToday').textContent=`Heute gesamt: ${fmtH(tMin)} h`;tickClock()}
 // Summen
 const[wa,wb]=weekRange(),mk=monthKey();
 $('#ckSums').innerHTML=`<div class="ckrow ckhd"><span>Person</span><span>Woche</span><span>${MONTHS[cur.m].slice(0,3)}.</span></div>`+c.people.map(q=>{const l=personEntries(q);
  const w=l.filter(e=>e.date>=wa&&e.date<=wb).reduce((s,e)=>s+minOf(e),0),m=l.filter(e=>e.date.startsWith(mk)).reduce((s,e)=>s+minOf(e),0);
  return `<div class="ckrow"><span>${esc(q)}</span><b>${fmtH(w)} h</b><b>${fmtH(m)} h</b></div>`}).join('');
 // Liste nach Tagen
 const items=p?personEntries(p).filter(e=>e.date.startsWith(mk)).sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start)):[];
 $('#ckListHead').textContent=p?`Zeiten ${p} · ${MONTHS[cur.m]} ${cur.y}`:'Zeiten';
 const mTot=items.reduce((s,e)=>s+minOf(e),0);$('#ckMonthTot').textContent=p?`${fmtH(mTot)} h an ${new Set(items.map(e=>e.date)).size} Tagen`:'';
 $('#ckList').innerHTML=items.length?byDay(items).map(([d,list])=>`<section class="day"><div class="dh"><span>${esc(dayLabel(d))}</span><span><b>${fmtH(list.reduce((s,[e])=>s+minOf(e),0))} h</b></span></div><ul class="group bl">${list.map(([e])=>`<li class="ck${e.running?' run':''}" ${e.running?'':`data-cke="${e.id}"`}>
  <span class="av" style="--h:${e.running?140:210}">${e.running?'▶':'⏱'}</span><div class="mid"><div class="t">${esc(e.start)} – ${e.running?'läuft':esc(e.end)}</div><div class="s">${e.pause?`Pause ${e.pause} min`:'ohne Pause'}${e.note?' · '+esc(e.note):''}</div></div>
  <div class="end"><div class="b">${fmtH(minOf(e))} h</div>${e.running?'':'<div class="s chevs">›</div>'}</div></li>`).join('')}</ul></section>`).join(''):`<div class="group"><div class="empty">Keine Zeiten in diesem Monat</div></div>`;
 $('#ckPersons').innerHTML=c.people.map(q=>`<span class="chip">${esc(q)}<button data-ckren="${esc(q)}" aria-label="umbenennen">✎</button><button data-ckdel="${esc(q)}" aria-label="entfernen">✕</button></span>`).join('');
 schedTick()}
function tickClock(){const c=ensureClock(),r=clockPerson&&c.running[clockPerson];const t=$('#ckTimer');if(t)t.textContent=r?fmtHMS(runNetMs(r)):'0:00:00'}
let ckTimer=null;function schedTick(){const any=Object.keys(ensureClock().running).length>0;clearInterval(ckTimer);ckTimer=null;
 if(any&&!$('#tab-clock').hidden&&!document.hidden)ckTimer=setInterval(()=>{tickClock();if(new Date().getSeconds()===0)renderClock()},1000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderClock();else schedTick()});
function ckStamp(){const c=ensureClock(),p=clockPerson;if(!p)return;const r=c.running[p],now=Date.now();
 if(!r){c.running[p]={startTs:now,pauseTs:null,pauseMs:0};save();toast(`${p} eingestempelt ${hm(new Date(now))}`)}
 else{const pm=(r.pauseMs||0)+(r.pauseTs?now-r.pauseTs:0);const e={id:uid(),person:p,date:isoDay(new Date(r.startTs)),start:hm(new Date(r.startTs)),end:hm(new Date(now)),pause:Math.round(pm/60000),note:r.note||''};
  if(now-r.startTs>=86400000)e.note=(e.note?e.note+' · ':'')+'länger als 24 h, bitte prüfen';
  c.entries.push(e);delete c.running[p];save();toast(`${p} ausgestempelt: ${fmtH(entryMin(e))} h`)}
 renderClock()}
function pauseToggle(){const c=ensureClock(),r=c.running[clockPerson];if(!r)return;const now=Date.now();
 if(r.pauseTs){r.pauseMs=(r.pauseMs||0)+now-r.pauseTs;r.pauseTs=null;toast('Pause beendet')}else{r.pauseTs=now;toast('Pause gestartet')}save();renderClock()}
function openCk(e){const c=ensureClock();clockEdit=e?e.id:null;$('#ckFormTitle').textContent=e?'Zeit bearbeiten':'Zeit nachtragen';
 fillSelect($('#ck-person'),c.people,e?e.person:clockPerson);$('#ck-date').value=e?e.date:isoDay(new Date());$('#ck-start').value=e?e.start:'07:00';$('#ck-end').value=e?e.end:'16:00';
 $('#ck-pause').value=e?e.pause:30;$('#ck-note').value=e?e.note||'':'';$('#ckDel').hidden=!e;$('#ckForm').hidden=false;$('#ckAdd').parentNode.hidden=true;$('#ckPrev').textContent='';ckPreview();$('#ckForm').scrollIntoView({block:'start'})}
function closeCk(){$('#ckForm').hidden=true;$('#ckAdd').parentNode.hidden=false;clockEdit=null}
function ckPreview(){const e={start:$('#ck-start').value,end:$('#ck-end').value,pause:+$('#ck-pause').value||0};const ok=Number.isFinite(toMin(e.start))&&Number.isFinite(toMin(e.end));
 $('#ckPrev').textContent=ok?`Arbeitszeit: ${fmtH(entryMin(e))} h${toMin(e.end)<toMin(e.start)?' (über Mitternacht)':''}`:''}
['#ck-start','#ck-end','#ck-pause'].forEach(s=>$(s).addEventListener('input',ckPreview));
$('#ckForm').addEventListener('submit',ev=>{ev.preventDefault();const c=ensureClock();
 const e={id:clockEdit||uid(),person:$('#ck-person').value,date:$('#ck-date').value,start:$('#ck-start').value,end:$('#ck-end').value,pause:Math.max(0,Math.round(+String($('#ck-pause').value).replace(',','.')||0)),note:$('#ck-note').value.trim().slice(0,120)};
 if(!e.person||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(toMin(e.start))||!Number.isFinite(toMin(e.end))){toast('Bitte Datum, Beginn und Ende ausfüllen');return}
 let d=toMin(e.end)-toMin(e.start);if(d<0)d+=1440;if(e.pause>d){toast('Pause ist länger als die Arbeitszeit');return}
 if(clockEdit)c.entries=c.entries.map(x=>x.id===clockEdit?e:x);else c.entries.push(e);save();
 clockPerson=e.person;const[y,m]=e.date.split('-');cur={y:+y,m:+m-1};toast(clockEdit?'Geändert':'Gespeichert');closeCk();render()});
$('#ckCancel').onclick=closeCk;$('#ckAdd').onclick=()=>openCk();$('#ckBtn').onclick=ckStamp;$('#ckPause').onclick=pauseToggle;
$('#ckDel').onclick=()=>{const c=ensureClock();const e=c.entries.find(x=>x.id===clockEdit);if(e&&confirm(`Zeit ${fmtDate(e.date)} ${e.start}–${e.end} löschen?`)){c.entries=c.entries.filter(x=>x.id!==clockEdit);save();closeCk();renderClock();toast('Gelöscht')}};
document.addEventListener('click',ev=>{const t=ev.target.closest&&ev.target.closest('[data-ckp],[data-cke],[data-ckren],[data-ckdel]');if(!t)return;const d=t.dataset,c=ensureClock();
 if(d.ckp){clockPerson=d.ckp;renderClock()}
 else if(d.cke){const e=c.entries.find(x=>x.id===d.cke);if(e)openCk(e)}
 else if(d.ckren){const n=(prompt('Neuer Name',d.ckren)||'').trim();if(!n||n===d.ckren)return;if(c.people.includes(n))return toast('Name gibt es schon');
  c.people=c.people.map(x=>x===d.ckren?n:x);c.entries.forEach(e=>{if(e.person===d.ckren)e.person=n});if(c.running[d.ckren]){c.running[n]=c.running[d.ckren];delete c.running[d.ckren]}if(clockPerson===d.ckren)clockPerson=n;save();renderClock()}
 else if(d.ckdel){if(c.running[d.ckdel])return toast(`${d.ckdel} ist noch eingestempelt`);const n=c.entries.filter(e=>e.person===d.ckdel).length;
  if(!confirm(n?`${d.ckdel} entfernen? ${n} Zeiten werden mit gelöscht.`:`${d.ckdel} entfernen?`))return;c.people=c.people.filter(x=>x!==d.ckdel);c.entries=c.entries.filter(e=>e.person!==d.ckdel);save();renderClock()}});
$('#ckAddP').onclick=()=>{const c=ensureClock();const v=$('#ckNewP').value.trim();if(v&&!c.people.includes(v)){c.people.push(v);clockPerson=v;save();renderClock()}$('#ckNewP').value=''};
// Export
function monthRows(p){return personEntries(p,false).filter(e=>e.date.startsWith(monthKey())).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start))}
$('#ckCsv').onclick=()=>{const p=clockPerson;if(!p)return;const rows=monthRows(p);const q=s=>`"${String(s).replace(/"/g,'""')}"`;
 const lines=[['Person','Datum','Beginn','Ende','Pause (min)','Arbeitszeit (h:mm)','Arbeitszeit (Std. dezimal)','Notiz'].join(';')].concat(rows.map(e=>[q(p),fmtDate(e.date),e.start,e.end,e.pause||0,fmtH(entryMin(e)),(entryMin(e)/60).toFixed(2).replace('.',','),q(e.note||'')].join(';')));
 const tot=rows.reduce((s,e)=>s+entryMin(e),0);lines.push(['','Summe','','',rows.reduce((s,e)=>s+(+e.pause||0),0),fmtH(tot),(tot/60).toFixed(2).replace('.',','),''].join(';'));
 download(`stempeluhr-${normKey(p)}-${monthKey()}.csv`,'\ufeff'+lines.join('\r\n'),'text/csv')};
function summaryText(p){const rows=monthRows(p);const wd=['So','Mo','Di','Mi','Do','Fr','Sa'];const tot=rows.reduce((s,e)=>s+entryMin(e),0);
 return [`Stempeluhr ${p} – ${MONTHS[cur.m]} ${cur.y}`,''].concat(rows.map(e=>{const[y,m,d]=e.date.split('-').map(Number);return `${wd[new Date(y,m-1,d).getDay()]} ${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.  ${e.start}–${e.end}${e.pause?`  (${e.pause} min Pause)`:''}  = ${fmtH(entryMin(e))} h${e.note?'  · '+e.note:''}`}),
  ['',`Gesamt: ${fmtH(tot)} h an ${new Set(rows.map(e=>e.date)).size} Tagen`]).join('\n')}
$('#ckShare').onclick=async()=>{const p=clockPerson;if(!p)return;const text=summaryText(p);
 try{if(navigator.share){await navigator.share({title:`Stempeluhr ${p}`,text});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(text);toast('Zusammenfassung kopiert')}catch(e){download(`stempeluhr-${normKey(p)}-${monthKey()}.txt`,text,'text/plain')}};
// Backup-Import
window.mergeClock=function(d){const c=ensureClock();if(!d||typeof d!=='object')return 0;let n=0;
 (d.people||[]).forEach(p=>{if(typeof p==='string'&&p.trim()&&!c.people.includes(p))c.people.push(p)});
 (d.entries||[]).forEach(e=>{if(!e||!e.person||!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')||!Number.isFinite(toMin(e.start))||!Number.isFinite(toMin(e.end)))return;
  if(c.entries.some(x=>x.id===e.id||(x.person===e.person&&x.date===e.date&&x.start===e.start)))return;c.entries.push({id:e.id||uid(),person:e.person,date:e.date,start:e.start,end:e.end,pause:+e.pause||0,note:String(e.note||'')});if(!c.people.includes(e.person))c.people.push(e.person);n++});
 save();return n};
window.renderClock=renderClock;
document.querySelectorAll('.tabbar button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='clock')renderClock();else schedTick()}));
ensureClock();save();renderClock();
