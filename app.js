'use strict';
const VERSION='gm-v1', KEY='geldmanager-v1';
const DEFAULT_MANDANTEN={
 'AUDIT':['Dacia - Prämie','Renault - Garantie','Renault - Prämie'],
 'CMS':['BMW','COSMO','Creditplus','DLL / AGCO','Ford-Bank','GAF','Open AG','Open AG HCBE','PF Service','Scania','Sonstiges','Stellantis','Stellantis - KM Pauschale','TKS','Wells Fargo'],
 'HUESGES':['UVV']};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=c=>(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const parseEur=s=>{s=String(s).trim().replace(/\s|€/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return isFinite(n)&&s!==''?Math.round(n*100):NaN};
const fmtDate=d=>{const [y,m,t]=d.split('-');return `${t}.${m}.${y}`};
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
let state=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.bookings)return s}catch(e){}
 return {bookings:[],persons:['Janik','Ronny','Patrick'],mandanten:JSON.parse(JSON.stringify(DEFAULT_MANDANTEN))}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
const now=new Date();let cur={y:now.getFullYear(),m:now.getMonth()};let editId=null;
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2500)}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function norm(b){return{id:b.id||uid(),nr:String(b.nr).trim(),date:b.date,mandant:b.mandant,kat:b.kat,person:b.person,cents:Number.isInteger(b.cents)?b.cents:parseEur(b.betrag)}}
function valid(b){return b.nr&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&b.mandant&&b.kat&&b.person&&Number.isFinite(b.cents)}
function mergeBookings(list){let added=0,skipped=0;for(const raw of list){const b=norm(raw);if(!valid(b)){skipped++;continue}
 if(state.bookings.some(x=>x.nr===b.nr)){skipped++;continue}
 if(!state.persons.includes(b.person))state.persons.push(b.person);
 if(!state.mandanten[b.mandant])state.mandanten[b.mandant]=[];if(!state.mandanten[b.mandant].includes(b.kat))state.mandanten[b.mandant].push(b.kat);
 state.bookings.push(b);added++}save();return{added,skipped}}
// Einmaliger Setup-Link: Daten im #Fragment (geht nie an den Server)
function fromFragment(){const h=location.hash;if(!h.startsWith('#import='))return;
 try{let s=h.slice(8).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
  const json=new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));
  const data=JSON.parse(json);const r=mergeBookings(data.bookings||data);
  const last=state.bookings.slice(-1)[0];if(last){const[y,m]=last.date.split('-');cur={y:+y,m:+m-1}}
  toast(`${r.added} Buchungen übernommen${r.skipped?`, ${r.skipped} übersprungen`:''}`)}
 catch(e){toast('Setup-Link ungültig')}
 history.replaceState(null,'',location.pathname+location.search)}
function monthItems(){const p=`${cur.y}-${String(cur.m+1).padStart(2,'0')}`;return state.bookings.filter(b=>b.date.startsWith(p)).sort((a,b)=>b.date.localeCompare(a.date)||b.nr.localeCompare(a.nr))}
function render(){$('#mlabel').textContent=`${MONTHS[cur.m]} ${cur.y}`;const items=monthItems();
 $('#total').textContent=eur(items.reduce((s,b)=>s+b.cents,0));
 $('#list').innerHTML=items.length?items.map(b=>`<li><div><div class="t">${esc(b.nr)} · ${esc(b.kat)}</div><div class="s">${fmtDate(b.date)} · ${esc(b.mandant)} · ${esc(b.person)}</div></div>
 <div><div class="b">${eur(b.cents)}</div><div class="act"><button data-edit="${b.id}">Bearbeiten</button><button data-del="${b.id}">Löschen</button></div></div></li>`).join(''):'<div class="empty">Keine Buchungen in diesem Monat</div>';
 const group=k=>{const m={};items.forEach(b=>m[b[k]]=(m[b[k]]||0)+b.cents);return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 const card=(t,rows)=>`<div class="card"><h3>${t}</h3>${rows.length?rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${eur(v)}</b></div>`).join(''):'<div><span>–</span></div>'}</div>`;
 $('#sums').innerHTML=`<div class="total">Monatssumme <b id="sumTotal">${eur(items.reduce((s,b)=>s+b.cents,0))}</b></div><p class="hint">${items.length} Buchungen</p>`+card('Pro Mandant',group('mandant'))+card('Pro Kategorie',group('kat'))+card('Pro Person',group('person'));
 $('#persons').innerHTML=state.persons.map(p=>`<span class="chip">${esc(p)}<button data-delp="${esc(p)}" aria-label="entfernen">✕</button></span>`).join('');
 $('#mandanten').innerHTML=Object.entries(state.mandanten).map(([m,ks])=>`<div class="m"><b>${esc(m)}</b><div class="chips">${ks.map(k=>`<span class="chip">${esc(k)}<button data-delk="${esc(m)}|${esc(k)}">✕</button></span>`).join('')}</div>
 <div class="row"><input placeholder="Neue Kategorie" data-newk="${esc(m)}"><button data-addk="${esc(m)}">+</button></div></div>`).join('');
 $('#ver').textContent=VERSION}
function fillSelect(sel,opts,val){sel.innerHTML=opts.map(o=>`<option${o===val?' selected':''}>${esc(o)}</option>`).join('')}
function fillKat(val){fillSelect($('#f-kat'),state.mandanten[$('#f-mandant').value]||[],val)}
function openForm(b){editId=b?b.id:null;$('#formTitle').textContent=b?'Buchung bearbeiten':'Neue Buchung';
 $('#f-nr').value=b?b.nr:'';const d=new Date();const def=(cur.y===d.getFullYear()&&cur.m===d.getMonth())?d.toISOString().slice(0,10):`${cur.y}-${String(cur.m+1).padStart(2,'0')}-01`;
 $('#f-date').value=b?b.date:def;fillSelect($('#f-mandant'),Object.keys(state.mandanten),b?b.mandant:'CMS');fillKat(b&&b.kat);
 fillSelect($('#f-person'),state.persons,b?b.person:'Janik');$('#f-betrag').value=b?(b.cents/100).toFixed(2).replace('.',','):'';
 $('#dupWarn').hidden=true;$('#form').hidden=false;$('#addBtn').hidden=true;$('#f-nr').focus()}
function closeForm(){$('#form').hidden=true;$('#addBtn').hidden=false;editId=null}
function dup(nr){return state.bookings.find(x=>x.nr===nr.trim()&&x.id!==editId)}
$('#f-nr').addEventListener('input',e=>{const d=dup(e.target.value);$('#dupWarn').hidden=!d;if(d)$('#dupWarn').textContent=`Auftragsnummer ${d.nr} gibt es schon (${fmtDate(d.date)}, ${d.kat}, ${eur(d.cents)}).`});
$('#f-mandant').addEventListener('change',()=>fillKat());
$('#form').addEventListener('submit',e=>{e.preventDefault();const b={id:editId||uid(),nr:$('#f-nr').value.trim(),date:$('#f-date').value,mandant:$('#f-mandant').value,kat:$('#f-kat').value,person:$('#f-person').value,cents:parseEur($('#f-betrag').value)};
 if(!valid(b)){toast('Bitte alle Felder richtig ausfüllen');return}
 if(dup(b.nr)){toast('Doppelte Auftragsnummer, nicht gespeichert');$('#dupWarn').hidden=false;return}
 if(editId)state.bookings=state.bookings.map(x=>x.id===editId?b:x);else state.bookings.push(b);
 save();const[y,m]=b.date.split('-');cur={y:+y,m:+m-1};toast(editId?'Geändert':'Gespeichert');closeForm();render()});
$('#addBtn').onclick=()=>openForm();$('#cancel').onclick=closeForm;
$('#prev').onclick=()=>{cur.m--;if(cur.m<0){cur.m=11;cur.y--}render()};$('#next').onclick=()=>{cur.m++;if(cur.m>11){cur.m=0;cur.y++}render()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));['list','sum','set'].forEach(t=>$('#tab-'+t).hidden=t!==b.dataset.tab)});
document.addEventListener('click',e=>{const t=e.target,d=t.dataset;
 if(d.edit)openForm(state.bookings.find(b=>b.id===d.edit));
 else if(d.del){const b=state.bookings.find(x=>x.id===d.del);if(b&&confirm(`Buchung ${b.nr} (${eur(b.cents)}) löschen?`)){state.bookings=state.bookings.filter(x=>x.id!==d.del);save();render();toast('Gelöscht')}}
 else if(d.delp){if(state.bookings.some(b=>b.person===d.delp))return toast('Person hat noch Buchungen');state.persons=state.persons.filter(p=>p!==d.delp);save();render()}
 else if(d.delk){const[m,k]=d.delk.split('|');if(state.bookings.some(b=>b.mandant===m&&b.kat===k))return toast('Kategorie hat noch Buchungen');state.mandanten[m]=state.mandanten[m].filter(x=>x!==k);if(!state.mandanten[m].length)delete state.mandanten[m];save();render()}
 else if(d.addk){const i=document.querySelector(`[data-newk="${CSS.escape(d.addk)}"]`);const v=i.value.trim();if(v&&!state.mandanten[d.addk].includes(v)){state.mandanten[d.addk].push(v);save();render()}}});
$('#addPerson').onclick=()=>{const v=$('#newPerson').value.trim();if(v&&!state.persons.includes(v)){state.persons.push(v);save();render()}$('#newPerson').value=''};
$('#addMandant').onclick=()=>{const v=$('#newMandant').value.trim().toUpperCase();if(v&&!state.mandanten[v]){state.mandanten[v]=['Sonstiges'];save();render()}$('#newMandant').value=''};
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
const stamp=()=>new Date().toISOString().slice(0,10);
$('#expJson').onclick=()=>download(`geldmanager-${stamp()}.json`,JSON.stringify(state,null,2),'application/json');
$('#expCsv').onclick=()=>{const q=s=>`"${String(s).replace(/"/g,'""')}"`;const rows=[['Auftragsnummer','Datum','Mandant','Kategorie','Person','Betrag EUR'].join(';')]
 .concat([...state.bookings].sort((a,b)=>a.date.localeCompare(b.date)).map(b=>[q(b.nr),fmtDate(b.date),q(b.mandant),q(b.kat),q(b.person),(b.cents/100).toFixed(2).replace('.',',')].join(';')));
 download(`geldmanager-${stamp()}.csv`,'\ufeff'+rows.join('\r\n'),'text/csv')};
$('#impBtn').onclick=()=>$('#impFile').click();
$('#impFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());
 if(d.persons)d.persons.forEach(p=>state.persons.includes(p)||state.persons.push(p));
 if(d.mandanten)for(const[m,ks]of Object.entries(d.mandanten)){state.mandanten[m]=state.mandanten[m]||[];ks.forEach(k=>state.mandanten[m].includes(k)||state.mandanten[m].push(k))}
 const r=mergeBookings(d.bookings||[]);render();toast(`Import: ${r.added} neu, ${r.skipped} übersprungen`)}catch(err){toast('Datei nicht lesbar')}e.target.value=''};
fromFragment();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
