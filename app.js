'use strict';
const VERSION='gm-v13', KEY='geldmanager-v1';
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
function norm(b){return{id:b.id||uid(),nr:String(b.nr).trim(),date:b.date,mandant:b.mandant,kat:b.kat,person:b.person,cents:Number.isInteger(b.cents)?b.cents:parseEur(b.betrag),...(normPlz(b.plz)?{plz:normPlz(b.plz)}:{})}}
function normPlz(v){const s=String(v??'').replace(/\D/g,'');return s.length===5?s:''}
function valid(b){return b.nr&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&b.mandant&&b.kat&&b.person&&Number.isFinite(b.cents)}
let plzFilled=0;function mergeBookings(list){let added=0,skipped=0;for(const raw of list){const b=norm(raw);if(!valid(b)){skipped++;continue}
 const ex=state.bookings.find(x=>x.nr===b.nr);if(ex){if(b.plz&&!normPlz(ex.plz)){ex.plz=b.plz;plzFilled++}skipped++;continue}
 if(!state.persons.includes(b.person))state.persons.push(b.person);
 if(!state.mandanten[b.mandant])state.mandanten[b.mandant]=[];if(!state.mandanten[b.mandant].includes(b.kat))state.mandanten[b.mandant].push(b.kat);
 state.bookings.push(b);added++}save();return{added,skipped}}
// PLZ nur bei passenden Buchungen OHNE PLZ ergänzen (Betrag/Rest bleibt)
function fillPlz(map){let n=0;for(const b of state.bookings){const p=normPlz(map[b.nr]);if(p&&!normPlz(b.plz)){b.plz=p;n++}}if(n)save();return n}
// Einmaliger Setup-Link: Daten im #Fragment (geht nie an den Server)
function fromFragment(){const h=location.hash;
 if(h.startsWith('#plz=')){try{let s=h.slice(5).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
   const map=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0))));const n=fillPlz(map&&typeof map==='object'?map:{});
   setTimeout(()=>alert(n?`${n} ${n===1?'Buchung':'Buchungen'}: PLZ ergänzt.`:'Keine passende Buchung ohne PLZ gefunden – nichts geändert.'),300)}
  catch(e){toast('PLZ-Link ungültig')}history.replaceState(null,'',location.pathname+location.search);return}
 if(!h.startsWith('#import='))return;
 try{let s=h.slice(8).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
  const json=new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));
  const data=JSON.parse(json);const r=mergeBookings(data.bookings||data);
  const last=state.bookings.slice(-1)[0];if(last){const[y,m]=last.date.split('-');cur={y:+y,m:+m-1}}
  toast(`${r.added} Buchungen übernommen${r.skipped?`, ${r.skipped} übersprungen`:''}`)}
 catch(e){toast('Setup-Link ungültig')}
 history.replaceState(null,'',location.pathname+location.search)}
function monthItems(){const p=`${cur.y}-${String(cur.m+1).padStart(2,'0')}`;return state.bookings.filter(b=>b.date.startsWith(p)).sort((a,b)=>b.date.localeCompare(a.date)||b.nr.localeCompare(a.nr))}
const WDAYS=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const isoDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function dayLabel(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return 'Ohne Datum';const t=new Date(),y=new Date();y.setDate(t.getDate()-1);
 if(iso===isoDay(t))return 'Heute';if(iso===isoDay(y))return 'Gestern';const[a,b,c]=iso.split('-').map(Number);const d=new Date(a,b-1,c);
 return `${WDAYS[d.getDay()]}, ${c}. ${MONTHS[b-1]}${a!==t.getFullYear()?' '+a:''}`}
function byDay(items,key=b=>b.date){const m=new Map();items.forEach((b,i)=>{const k=key(b)||'';if(!m.has(k))m.set(k,[]);m.get(k).push([b,i])});return [...m.entries()].sort((a,b)=>b[0].localeCompare(a[0]))}
const plural=(n,a,b)=>`${n} ${n===1?a:b}`;
function dayHead(iso,list,word=['Buchung','Buchungen']){const sum=list.reduce((s,[b])=>s+(Number.isFinite(b.cents)?b.cents:0),0);
 return `<div class="dh"><span>${esc(dayLabel(iso))}</span><span>${plural(list.length,word[0],word[1])} · <b>${eur(sum)}</b></span></div>`}
const initial=s=>esc((String(s||'?').match(/[A-Za-zÄÖÜäöü0-9]/)||['?'])[0].toUpperCase());
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
function dayList(items,o={}){if(!items.length)return `<div class="group"><div class="empty">Keine Buchungen in diesem Monat</div></div>`;
 return byDay(items).map(([d,list])=>`<section class="day">${dayHead(d,list)}<ul class="group bl">${list.map(([b])=>`<li>
 <span class="av" style="--h:${hue(o.kat?b.kat:b.person)}">${initial(o.kat?b.kat:b.person)}</span>
 <div class="mid"><div class="t">${o.kat?esc(b.kat):esc(b.nr)}</div><div class="s">${o.kat?`${esc(b.nr)} · ${esc(b.mandant)} · ${esc(b.person)}`:esc(b.person)}</div></div>
 <div class="end"><div class="b">+${eur(b.cents)}</div><div class="act"><button data-edit="${b.id}">Bearbeiten</button><button class="del" data-del="${b.id}">Löschen</button></div></div></li>`).join('')}</ul></section>`).join('')}
let katView=null;
function renderKat(){const el=$('#tab-kat');if(!katView){el.hidden=true;return}
 const items=monthItems().filter(b=>b.mandant===katView.m&&b.kat===katView.k);const sum=items.reduce((s,b)=>s+b.cents,0);
 $('#katName').textContent=katView.k;$('#katMandant').textContent=katView.m;$('#katIcon').textContent=(katView.k.match(/[A-Za-zÄÖÜäöü0-9]/)||['?'])[0].toUpperCase();$('#katIcon').style.setProperty('--h',hue(katView.k));
 $('#katTotal').textContent=eur(sum);$('#katCount').textContent=plural(items.length,'Buchung','Buchungen');$('#katList').innerHTML=dayList(items)}
function openKat(m,k){katView={m,k};$('#tab-sum').hidden=true;$('#tab-kat').hidden=false;renderKat();scrollTo(0,0)}
function closeKat(){katView=null;$('#tab-kat').hidden=true;$('#tab-sum').hidden=false;scrollTo(0,0)}
function render(){document.querySelectorAll('.mlabel').forEach(e=>e.textContent=`${MONTHS[cur.m]} ${cur.y}`);const items=monthItems();
 $('#total').textContent=eur(items.reduce((s,b)=>s+b.cents,0));$('#count').textContent=plural(items.length,'Buchung','Buchungen');
 $('#list').innerHTML=dayList(items,{kat:true});
 const group=k=>{const m={};items.forEach(b=>m[b[k]]=(m[b[k]]||0)+b.cents);return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 const card=(t,rows)=>`<p class="gh">${t}</p><div class="group card">${rows.length?rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${eur(v)}</b></div>`).join(''):'<div><span>–</span></div>'}</div>`;
 const kats={};items.forEach(b=>{const k=b.mandant+'|'+b.kat;(kats[k]=kats[k]||{c:0,n:0});kats[k].c+=b.cents;kats[k].n++});const kr=Object.entries(kats).sort((a,b)=>b[1].c-a[1].c);
 const katCard=`<p class="gh">Pro Kategorie</p><div class="group kcard">${kr.length?kr.map(([k,v])=>{const[m,...r]=k.split('|');const kt=r.join('|');return `<button class="krow" data-kat="${esc(k)}"><span class="av" style="--h:${hue(kt)}">${initial(kt)}</span><span class="kn">${esc(kt)}<small>${esc(m)} · ${plural(v.n,'Buchung','Buchungen')}</small></span><b>${eur(v.c)}</b><i class="chev">›</i></button>`}).join(''):'<div class="empty">–</div>'}</div>`;
 $('#sums').innerHTML=`<div class="hero"><span>Monatssumme</span><b id="sumTotal">${eur(items.reduce((s,b)=>s+b.cents,0))}</b><small>${plural(items.length,'Buchung','Buchungen')}</small></div>`+katCard+plzCard(items)+card('Pro Mandant',group('mandant'))+card('Pro Person',group('person'));
 renderKat();
 $('#persons').innerHTML=state.persons.map(p=>`<span class="chip">${esc(p)}<button data-delp="${esc(p)}" aria-label="entfernen">✕</button></span>`).join('');
 $('#mandanten').innerHTML=Object.entries(state.mandanten).map(([m,ks])=>`<div class="group m"><b>${esc(m)}</b><div class="chips">${ks.map(k=>`<span class="chip">${esc(k)}<button data-delk="${esc(m)}|${esc(k)}">✕</button></span>`).join('')}</div>
 <div class="row"><input placeholder="Neue Kategorie" data-newk="${esc(m)}"><button class="tinted" data-addk="${esc(m)}" style="flex:0 0 52px">＋</button></div></div>`).join('');
 const np=state.bookings.filter(b=>!normPlz(b.plz)).sort((x,y)=>y.date.localeCompare(x.date));
 $('#plzMissing').innerHTML=np.length?np.map(b=>`<div class="pm"><span><b>${esc(b.nr)}</b><small>${fmtDate(b.date)} · ${esc(b.kat)} · ${eur(b.cents)}</small></span><input data-plzfor="${esc(b.id)}" inputmode="numeric" maxlength="5" placeholder="PLZ"></div>`).join('')+'<button class="cellbtn" id="plzSave">PLZ speichern</button>':'<div class="empty">Alle Buchungen haben eine PLZ ✓</div>';
 $('#plzCount').textContent=np.length?`(${np.length} ohne PLZ)`:'';
 $('#ver').textContent=VERSION;if(window.renderClock)renderClock()}
let plzScope='m';
function plzCard(monthIt){const its=plzScope==='y'?state.bookings.filter(b=>b.date.startsWith(cur.y+'-')):monthIt;const tot=its.reduce((s,b)=>s+b.cents,0);
 const g={};its.forEach(b=>{const p=normPlz(b.plz);const k=p?p.slice(0,2):'';(g[k]=g[k]||{c:0,n:0});g[k].c+=b.cents;g[k].n++});
 const rows=Object.entries(g).sort((x,y)=>(x[0]===''?1:0)-(y[0]===''?1:0)||y[1].c-x[1].c);
 const pct=c=>tot?(Math.round(c/tot*1000)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' %':'–';
 return `<p class="gh">Umsatz nach PLZ-Gebiet</p><div class="seg plzseg"><button data-plzs="m" class="${plzScope==='m'?'on':''}">${MONTHS[cur.m]}</button><button data-plzs="y" class="${plzScope==='y'?'on':''}">Ganzes Jahr ${cur.y}</button></div>
 <div class="group kcard plz">${rows.length?rows.map(([k,v])=>`<div class="krow" style="--h:${k?(+k*37)%360:0}"><span class="av${k?'':' none'}">${k||'–'}</span><span class="kn">${k?'PLZ-Gebiet '+k:'ohne PLZ'}<small>${plural(v.n,'Buchung','Buchungen')} · ${pct(v.c)}</small><i class="bar" style="width:${tot?Math.max(2,v.c/tot*100):0}%"></i></span><b>${eur(v.c)}</b></div>`).join(''):'<div class="empty">Keine Buchungen</div>'}</div>`}
function fillSelect(sel,opts,val){sel.innerHTML=opts.map(o=>`<option${o===val?' selected':''}>${esc(o)}</option>`).join('')}
function fillKat(val){fillSelect($('#f-kat'),state.mandanten[$('#f-mandant').value]||[],val)}
function openForm(b){editId=b?b.id:null;$('#formTitle').textContent=b?'Buchung bearbeiten':'Neue Buchung';
 $('#f-nr').value=b?b.nr:'';const d=new Date();const def=(cur.y===d.getFullYear()&&cur.m===d.getMonth())?d.toISOString().slice(0,10):`${cur.y}-${String(cur.m+1).padStart(2,'0')}-01`;
 $('#f-date').value=b?b.date:def;fillSelect($('#f-mandant'),Object.keys(state.mandanten),b?b.mandant:'CMS');fillKat(b&&b.kat);
 fillSelect($('#f-person'),state.persons,b?b.person:'Janik');$('#f-betrag').value=b?(b.cents/100).toFixed(2).replace('.',','):'';$('#f-plz').value=b&&b.plz?b.plz:'';
 $('#dupWarn').hidden=true;$('#form').hidden=false;$('#addBtn').parentNode.hidden=true;$('#f-nr').focus()}
function closeForm(){$('#form').hidden=true;$('#addBtn').parentNode.hidden=false;editId=null}
function dup(nr){return state.bookings.find(x=>x.nr===nr.trim()&&x.id!==editId)}
$('#f-nr').addEventListener('input',e=>{const d=dup(e.target.value);$('#dupWarn').hidden=!d;if(d)$('#dupWarn').textContent=`Auftragsnummer ${d.nr} gibt es schon (${fmtDate(d.date)}, ${d.kat}, ${eur(d.cents)}).`});
$('#f-mandant').addEventListener('change',()=>fillKat());
$('#form').addEventListener('submit',e=>{e.preventDefault();const b={id:editId||uid(),nr:$('#f-nr').value.trim(),date:$('#f-date').value,mandant:$('#f-mandant').value,kat:$('#f-kat').value,person:$('#f-person').value,cents:parseEur($('#f-betrag').value)};const pv=$('#f-plz').value.trim();
 if(pv&&!normPlz(pv)){toast('PLZ bitte mit 5 Ziffern (oder leer lassen)');return}if(normPlz(pv))b.plz=normPlz(pv);
 if(!valid(b)){toast('Bitte alle Felder richtig ausfüllen');return}
 if(dup(b.nr)){toast('Doppelte Auftragsnummer, nicht gespeichert');$('#dupWarn').hidden=false;return}
 if(editId)state.bookings=state.bookings.map(x=>x.id===editId?b:x);else state.bookings.push(b);
 save();const[y,m]=b.date.split('-');cur={y:+y,m:+m-1};toast(editId?'Geändert':'Gespeichert');closeForm();render()});
$('#addBtn').onclick=()=>openForm();$('#cancel').onclick=closeForm;
document.querySelectorAll('.mprev').forEach(b=>b.onclick=()=>{cur.m--;if(cur.m<0){cur.m=11;cur.y--}render()});document.querySelectorAll('.mnext').forEach(b=>b.onclick=()=>{cur.m++;if(cur.m>11){cur.m=0;cur.y++}render()});
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabbar button').forEach(x=>x.classList.toggle('on',x===b));katView=null;$('#tab-kat').hidden=true;['list','sum','clock','set'].forEach(t=>$('#tab-'+t).hidden=t!==b.dataset.tab);scrollTo(0,0)});
document.addEventListener('click',e=>{if(e.target.id==='plzSave'){let n=0,bad=0;document.querySelectorAll('[data-plzfor]').forEach(i=>{const v=i.value.trim();if(!v)return;const p=normPlz(v);const b=state.bookings.find(x=>x.id===i.dataset.plzfor);if(!p){bad++;return}if(b&&!normPlz(b.plz)){b.plz=p;n++}});if(n)save();render();toast(bad?`${n} gespeichert, ${bad} ungültig (5 Ziffern)`:`${n} ${n===1?'PLZ':'PLZ'} gespeichert`);return}
 const ps=e.target.closest&&e.target.closest('[data-plzs]');if(ps){plzScope=ps.dataset.plzs;render();return}const kr=e.target.closest&&e.target.closest('[data-kat]');if(kr){const[m,...k]=kr.dataset.kat.split('|');openKat(m,k.join('|'));return}
 const t=e.target,d=t.dataset;
 if(d.edit){if($('#tab-list').hidden)document.querySelector('.tabbar [data-tab=list]').click();openForm(state.bookings.find(b=>b.id===d.edit));$('#form').scrollIntoView({block:'start'})}
 else if(d.del){const b=state.bookings.find(x=>x.id===d.del);if(b&&confirm(`Buchung ${b.nr} (${eur(b.cents)}) löschen?`)){state.bookings=state.bookings.filter(x=>x.id!==d.del);save();render();toast('Gelöscht')}}
 else if(d.delp){if(state.bookings.some(b=>b.person===d.delp))return toast('Person hat noch Buchungen');state.persons=state.persons.filter(p=>p!==d.delp);save();render()}
 else if(d.delk){const[m,k]=d.delk.split('|');if(state.bookings.some(b=>b.mandant===m&&b.kat===k))return toast('Kategorie hat noch Buchungen');state.mandanten[m]=state.mandanten[m].filter(x=>x!==k);if(!state.mandanten[m].length)delete state.mandanten[m];save();render()}
 else if(d.addk){const i=document.querySelector(`[data-newk="${CSS.escape(d.addk)}"]`);const v=i.value.trim();if(v&&!state.mandanten[d.addk].includes(v)){state.mandanten[d.addk].push(v);save();render()}}});
$('#addPerson').onclick=()=>{const v=$('#newPerson').value.trim();if(v&&!state.persons.includes(v)){state.persons.push(v);save();render()}$('#newPerson').value=''};
$('#addMandant').onclick=()=>{const v=$('#newMandant').value.trim().toUpperCase();if(v&&!state.mandanten[v]){state.mandanten[v]=['Sonstiges'];save();render()}$('#newMandant').value=''};
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
const stamp=()=>new Date().toISOString().slice(0,10);
$('#expJson').onclick=()=>download(`geldmanager-${stamp()}.json`,JSON.stringify(state,null,2),'application/json');
$('#expCsv').onclick=()=>{const q=s=>`"${String(s).replace(/"/g,'""')}"`;const rows=[['Auftragsnummer','Datum','Mandant','Kategorie','Person','Betrag EUR','PLZ'].join(';')]
 .concat([...state.bookings].sort((a,b)=>a.date.localeCompare(b.date)).map(b=>[q(b.nr),fmtDate(b.date),q(b.mandant),q(b.kat),q(b.person),(b.cents/100).toFixed(2).replace('.',','),q(b.plz||'')].join(';')));
 download(`geldmanager-${stamp()}.csv`,'\ufeff'+rows.join('\r\n'),'text/csv')};
$('#impBtn').onclick=()=>$('#impFile').click();
$('#impFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());
 if(d.persons)d.persons.forEach(p=>state.persons.includes(p)||state.persons.push(p));
 if(d.mandanten)for(const[m,ks]of Object.entries(d.mandanten)){state.mandanten[m]=state.mandanten[m]||[];ks.forEach(k=>state.mandanten[m].includes(k)||state.mandanten[m].push(k))}
 const r=mergeBookings(d.bookings||[]);const z=d.clock&&window.mergeClock?mergeClock(d.clock):0;render();toast(`Import: ${r.added} neu, ${r.skipped} übersprungen${plzFilled?`, ${plzFilled} PLZ ergänzt`:''}${z?`, ${z} Zeiten`:''}`);plzFilled=0}catch(err){toast('Datei nicht lesbar')}e.target.value=''};
/* ---------- Fotos/Screenshots: OCR lokal im Browser ---------- */
const normKey=s=>String(s).toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/[^a-z0-9]/g,'');
let ocrWorker=null,ocrBusy=false;
const LOAD_TIMEOUT=150000,MAXPX=5e6,passTimeout=()=>window.GM_PASS_TIMEOUT||90000;
function ocrStatus(t,p){const s=$('#ocrStatus');s.hidden=false;s.classList.remove('done','err');$('#ocrMsg').hidden=true;$('#ocrBarWrap').hidden=false;if(t!=null)$('#ocrText').textContent=t;if(p!=null)$('#ocrBar').style.width=Math.round(Math.max(0,Math.min(1,p))*100)+'%'}
// Ergebnis bleibt sichtbar stehen, bis man "OK" tippt (statt kurzem Toast)
function ocrDone(title,msg,isErr){const s=$('#ocrStatus');s.hidden=false;s.classList.add('done');s.classList.toggle('err',!!isErr);$('#ocrBarWrap').hidden=true;$('#ocrText').textContent=title;
 const m=$('#ocrMsg');m.hidden=!msg;m.innerHTML=msg||''}
$('#ocrOk').onclick=()=>{$('#ocrStatus').hidden=true};
function withTimeout(pr,ms,msg){let t;return Promise.race([pr,new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(msg)),ms))]).finally(()=>clearTimeout(t))}
async function killOcr(){const w=ocrWorker;ocrWorker=null;if(w)try{(await Promise.race([w,new Promise(r=>setTimeout(r,500))]))?.terminate()}catch(e){}}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Texterkennung konnte nicht geladen werden'));document.head.appendChild(s)})}
let ocrProg=null;
function getOcr(){if(!ocrWorker){const base=new URL('vendor/',location.href).href;
 ocrWorker=Tesseract.createWorker('deu',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base+'lang',workerBlobURL:false,
  errorHandler:e=>console.warn('OCR',e),
  logger:m=>{try{if(m.status==='recognizing text'){if(ocrProg)ocrProg(m.progress)}else if(/load|init/i.test(m.status||''))ocrStatus('Lade Texterkennung (beim ersten Mal ca. 9 MB) …',m.progress)}catch(e){}}})
 .then(async w=>{await w.setParameters({tessedit_pageseg_mode:'4',preserve_interword_spaces:'1'});return w});ocrWorker.catch(()=>ocrWorker=null)}return ocrWorker}
function loadImg(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Bild nicht lesbar'))};im.src=u})}
// wie Tourenplaner: skalieren (max. 5 MP, sonst stürzt die Erkennung auf dem iPhone ab), Graustufen, Dunkelmodus invertieren, Kontrast
async function prep(img,T){const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height;if(!W||!H)throw new Error('Bild nicht lesbar');
 const sc=Math.max(.25,Math.min(3,T/W,Math.sqrt(MAXPX/(W*H))));const w=Math.round(W*sc),h=Math.round(H*sc);
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});if(!x)throw new Error('Bild zu groß');x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);
 const d=x.getImageData(0,0,w,h),p=d.data;let sum=0,darkPx=0;for(let i=0;i<p.length;i+=4){const g=.299*p[i]+.587*p[i+1]+.114*p[i+2];p[i]=g;sum+=g;if(g<90)darkPx++}
 const n=p.length/4,dark=sum/n<110||darkPx/n>.55,lo=dark?25:60,hi=dark?215:235;
 // Dunkles Bildschirmfoto: helle Flächen (Vorschaubilder) ausblenden, die stören sonst die Erkennung
 if(dark){const L=Math.max(16,Math.round(w*.05)),m=new Uint8Array(n);
  for(let y=0;y<h;y++){let r=0;for(let x0=0;x0<=w;x0++){const on=x0<w&&p[(y*w+x0)*4]>200;if(on)r++;else{if(r>=L)for(let k=x0-r;k<x0;k++)m[y*w+k]=1;r=0}}}
  for(let x0=0;x0<w;x0++){let r=0;for(let y=0;y<=h;y++){const on=y<h&&p[(y*w+x0)*4]>200;if(on)r++;else{if(r>=L)for(let k=y-r;k<y;k++)m[k*w+x0]=1;r=0}}}
  // Rest im Inneren der Flächen (kleine Schrift im Vorschaubild) mit wegnehmen
  const B=new Uint8Array(n);for(let y=0;y<h;y++){let last=-1e9;for(let x0=0;x0<w;x0++){if(m[y*w+x0])last=x0;else if(x0-last<L&&last>=0){let nx=-1;for(let k=x0+1;k<Math.min(w,x0+L);k++)if(m[y*w+k]){nx=k;break}if(nx>0)B[y*w+x0]=1}}}
  for(let i=0;i<n;i++)if(m[i]||B[i])p[i*4]=0}
for(let i=0;i<p.length;i+=4){let g=p[i];if(dark)g=255-g;g=(g-lo)*255/(hi-lo);g=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=g;p[i+3]=255}
 x.putImageData(d,0,0);return c}
const ALIASES=[['WF (DE)','CMS','Wells Fargo'],['AGCO BL_DE','CMS','DLL / AGCO'],['DLL Blue','CMS','DLL / AGCO']];
const fuzz=s=>normKey(s).replace(/[il1|]/g,'l').replace(/0/g,'o');
function matchKat(mid){const n=normKey(mid);const fz=fuzz(mid);
 for(const[al,m,k]of ALIASES)if(fz.includes(fuzz(al))&&(state.mandanten[m]||[]).includes(k))return{mandant:m,kat:k,known:true};let best=null;
 for(const[m,ks]of Object.entries(state.mandanten))for(const k of ks){const kn=normKey(k);if(kn&&n.includes(kn)){const score=kn.length+(n.includes(normKey(m))?100:0);if(!best||score>best.score)best={m,k,score}}}
 if(best)return{mandant:best.m,kat:best.k,known:true};
 let raw=mid.replace(/^[\s|Il\[\]!:]+|[\s|Il\[\]!:]+$/g,'');let mandant='';
 for(const m of Object.keys(state.mandanten))if(normKey(raw).startsWith(normKey(m))){mandant=m;raw=raw.slice(m.length).replace(/^[\s·•.,:\-]+/,'');break}
 return{mandant,kat:raw.trim(),known:false}}
// OCR-Verwechsler im Betrag vor "EUR" (O→0, l→1, S→5, B→8), "EUH"/"FUR" → EUR
function normAmtLine(l){l=l.replace(/\b(?:EUR0?|EURO|EUH|FUR|EUA|ELR|EUP)\b/gi,'EUR');
 const map=x=>x.replace(/[OoQD]/g,'0').replace(/[lI|!]/g,'1').replace(/S/g,'5').replace(/B/g,'8');
 return l.replace(/(^|[^0-9A-Za-z])([0-9OoQDlI|!SB]{1,5})\s*([,.])\s*([0-9OoQDlI|!SB]{2})(?=\s*(?:€|EUR))/g,(m,pre,a,c,b)=>{const A=map(a),Bc=map(b);return /^\d+$/.test(A)&&/^\d{2}$/.test(Bc)&&/\d/.test(a+b)?pre+A+','+Bc:m})}
// Geldschein-Icon vor dem Betrag wird oft als Ziffer gelesen (z. B. "E278,90" statt 78,90):
// anhand der Zeichen-Positionen abschneiden, was nicht zur Zahl gehört (Lücke, andere Höhe, Überlappung)
function fixAmtWord(w){const s=w.symbols||[],t=w.text||'';if(/\d\.\d{3}[,.]\d{2}/.test(t))return null;const m=t.match(/(\d+)[,.](\d{2})(?!\d)/);
 if(!m||s.length!==[...t].length||m[1].length<2)return null;const ci=m.index+m[1].length;if(!/[,.]/.test(s[ci].text))return null;
 const cents=s.slice(ci+1,ci+3);if(cents.length<2)return null;const hh=y=>y.bbox.y1-y.bbox.y0,H=Math.max(...cents.map(hh));if(!(H>0))return null;
 const cg=Math.max(0,cents[1].bbox.x0-cents[0].bbox.x1);// normaler Ziffernabstand dieser Schrift
 let k=ci-1,keep=0,rightX=s[ci].bbox.x0;
 while(k>=m.index){const y=s[k],gap=rightX-y.bbox.x1;
  if(Math.abs(hh(y)-H)>.15*H||gap>(k===ci-1?Math.max(.45*H,2.5*cg):Math.max(.22*H,1.8*cg))||gap<-.15*H)break;
  if(k>0&&s[k-1].bbox.x1>y.bbox.x0+.2*(y.bbox.x1-y.bbox.x0))break;
  keep++;rightX=y.bbox.x0;k--}
 if(!keep||keep===m[1].length)return null;return t.slice(0,m.index)+' '+t.slice(ci-keep)}
const med=a=>{a=[...a].sort((x,y)=>x-y);return a.length?a[a.length>>1]:0};
// Betrag direkt vor "EUR" anhand der Zeichen-Positionen lesen: Geldschein-Icon (breiter, überlappender Zeichen-Haufen
// am Wortanfang) abschneiden; fehlt das Komma (bei dünner Schrift häufig), sind die letzten 2 Ziffern die Cent.
function amtBeforeEur(w){const s=(w.symbols||[]).filter(y=>y&&y.bbox&&y.text);if(!s.length)return null;
 const hh=y=>y.bbox.y1-y.bbox.y0,ww=y=>y.bbox.x1-y.bbox.x0;const dig=s.filter(y=>/^\d$/.test(y.text));if(dig.length<3)return null;
 const H=med(dig.map(hh));let x1=s[0].bbox.x1,j=1;while(j<s.length&&s[j].bbox.x0<x1+.12*H){x1=Math.max(x1,s[j].bbox.x1);j++}
 const rest=s.slice(j),rd=rest.filter(y=>/^\d$/.test(y.text)),mw=med(rd.map(ww));
 const icon=j<s.length&&rd.length>=3&&((x1-s[0].bbox.x0)>1.6*mw||!/^\d$/.test(s[0].text)&&j>0);
 // ein einzelnes, sehr breites Ziffer-Zeichen = Icon und erste Ziffer verschmolzen → Ziffer behalten
 const merged=icon&&j===1&&/^\d$/.test(s[0].text)&&ww(s[0])>2.5*mw;
 const body=icon?(merged?s:rest):s,bt=body.map(y=>y.text).join('');
 let m=bt.match(/(\d+)[,.](\d{2})\D*$/);if(m)return{v:m[1].replace(/^0+(?=\d)/,'')+','+m[2],icon};
 const d=body.filter(y=>/^\d$/.test(y.text)).map(y=>y.text).join('');if(d.length<3||d.length>6)return null;
 return{v:d.slice(0,-2).replace(/^0+(?=\d)/,'')+','+d.slice(-2),icon,noComma:true}}
const EUR_W=/^(?:EUR|EUH|FUR|EUA|ELR|EUP|EURO|€)/i;
function fixAmounts(data){let text=(data&&data.text)||'';try{const lines=[];for(const b of data.blocks||[])for(const p of b.paragraphs||[])for(const l of p.lines||[])lines.push(l);
 let pos=0;for(const l of lines){const ws=(l.words||[]).filter(w=>w&&w.text);
  for(let i=0;i<ws.length;i++){const w=ws[i],t=w.text;const at=text.indexOf(t,pos);if(at<0)continue;let fx=null;
   const nextEur=ws[i+1]&&EUR_W.test(ws[i+1].text)||/\d€$/.test(t);
   if(nextEur&&!/\d[,.]\d{2}(?!\d)/.test(t)){const a=amtBeforeEur(w);if(a&&(a.icon||a.noComma))fx=' '+a.v+(/€$/.test(t)?' €':'')}
   if(!fx)fx=fixAmtWord(w);
   if(fx&&fx!==t){text=text.slice(0,at)+fx+text.slice(at+t.length);pos=at+fx.length}else pos=at+t.length}}}catch(e){console.warn(e)}return text}
// Notnagel: kein sauberer Betrag, aber Ziffern direkt vor "EUR" → vorschlagen und als unsicher markieren
function guessAmt(lines){for(const l of lines){const n=normAmtLine(l);const m=n.match(/([0-9][0-9 ,.]{1,9}[0-9])\s*(?:€|EUR)\b/i);if(!m)continue;
 const d=m[1].replace(/\D/g,'');if(d.length<3)continue;const c=d.length>=5?d.slice(-4):d;return parseInt(c.slice(0,-2),10)*100+parseInt(c.slice(-2),10)}return NaN}
const HEAD=/(?:^|[^\d])(\d{6})(?!\d{2})\d?\s*[|Il1!\]\[:]?\s+(.*?)\s*[|Il!\]\[:]?\s*(\d{1,2})\s*[.,]\s*(\d{1,2})\s*[.,]\s*(\d{4})/;
function parseOcr(text){let lines=text.split(/\n/).map(l=>l.replace(/[—–]/g,'-').replace(/\s+/g,' ').trim()).filter(Boolean);for(let i=0;i<lines.length-1;i++)if(/^\D{0,3}\d{6}\D/.test(lines[i])&&!HEAD.test(lines[i])&&/^\D{0,3}\d{1,2}\s*[.,]\s*\d{1,2}\s*[.,]\s*\d{4}/.test(lines[i+1])){lines[i]+=' '+lines[i+1];lines.splice(i+1,1)}
 const out=[];let cur=null;
 for(const l of lines){const h=l.match(HEAD);
  if(h){const km=matchKat(h[2]);cur={nr:h[1],date:`${h[5]}-${h[4].padStart(2,'0')}-${h[3].padStart(2,'0')}`,...km,kunde:'',cents:NaN,lines:[]};out.push(cur);continue}
  if(cur)cur.lines.push(l)}
 // abgeschnittene letzte Karte (nur Kopfzeile, kein Betrag) ignorieren
 if(out.length){const L=out[out.length-1];if(!L.lines.some(l=>/[a-zäöü]{3}/i.test(l)||/\d[,.]\d\d\s*(€|EUR)/i.test(l)))out.pop()}
 for(const o of out){o.plz=findPlz(o.lines);o.kunde=(o.lines.find(l=>/[a-zäöü]{3}/i.test(l)&&!/^(gp|händler|haendler)/i.test(l))||'').slice(0,60);
  let amt=null;for(const l of o.lines){if(/\b(gp|händler|haendler|nr)\b/i.test(l))continue;
   const ln=normAmtLine(l);const ms=[...ln.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+)\s*[,.]\s*(\d{2})\s*(€|EUR|E\b)/gi)];if(ms.length)amt=ms[ms.length-1];
   else if(amt==null){const m2=l.match(/(?:pauschale|betrag)\D*(\d+)\s*[,.]\s*(\d{2})/i);if(m2)amt=m2}}
  if(amt)o.cents=parseInt(amt[1].replace(/\D/g,''),10)*100+parseInt(amt[2],10);
  else{const g=guessAmt(o.lines.filter(l=>!/\b(gp|händler|haendler|nr)\b/i.test(l)));if(Number.isFinite(g)){o.cents=g;o.amtGuess=true}}delete o.lines}
 return out.length?out:parseApp(text)}
// PLZ aus der Adresszeile (z. B. "DE-15517 Fürstenwalde"), nicht Dealer-/Group-Nummern
function findPlz(lines){for(const l of lines){const m=l.match(/\b[DO0][EF]\s*[-–~]?\s*(\d{5})(?!\d)/i);if(m)return m[1]}
 for(const l of lines){if(/dealer|group|gp|händler|haendler|nr\b|auftrag/i.test(l))continue;const m=l.match(/(?:^|[^\d])(\d{5})\s+[A-ZÄÖÜa-zäöü]{3}/);if(m)return m[1]}return''}
// Bildschirmfotos aus einer Einnahmen-App (Kopf: Kategorie + Mandant, "November 2026", Zeilen: Auftragsnr. + "+20,00 €")
const MON_RE='januar|februar|m.rz|april|mai|juni|juli|august|september|oktober|november|dezember';
const monIdx=s=>{s=s.toLowerCase();return s.startsWith('m')&&s.length===4?2:MONTHS.findIndex(m=>m.toLowerCase()===s)};
const isoD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function parseApp(text,today){today=today||window.GM_TODAY&&new Date(window.GM_TODAY)||new Date();
 const lines=text.split(/\n/).map(l=>l.replace(/[—–]/g,'-').replace(/\s+/g,' ').trim()).filter(Boolean);const lk=lines.map(l=>l.toLowerCase());
 if(!lk.some(l=>/einnahmen|\bbuchung(en)?\b|summe f|ausgaben/.test(l))||!lines.some(l=>/(?:^|\D)\d{6}(?!\d)/.test(l)))return[];
 const monRe=new RegExp('('+MON_RE+')\\s+(\\d{4})');let hy=null,hm=null,hIdx=-1;
 for(let i=0;i<lk.length;i++){const m=lk[i].match(monRe);if(m&&!new RegExp('\\d{1,2}\\.\\s*(?:'+MON_RE+')').test(lk[i])){hm=monIdx(m[1]);hy=+m[2];hIdx=i;break}}
 const hc=[hIdx,lk.findIndex(l=>/einnahmen|summe f/.test(l))].filter(i=>i>=0),head=lines.slice(0,hc.length?Math.min(...hc):6);
 let best=null;for(const l of head){const n=normKey(l);if(!n)continue;
  for(const[al,m,k]of ALIASES)if(fuzz(l).includes(fuzz(al))&&(state.mandanten[m]||[]).includes(k)&&(!best||best.s<99))best={m,k,s:99};
  for(const[m,ks]of Object.entries(state.mandanten))for(const k of ks){const kn=normKey(k);if(kn&&n.endsWith(kn)&&n.length-kn.length<=2){const s=kn.length;if(!best||s>best.s)best={m,k,s}}}}
 let mandant=best?best.m:'',kat=best?best.k:'';
 for(const l of head){const n=normKey(l);const m=Object.keys(state.mandanten).find(x=>normKey(x)===n);if(m){if(!best)mandant=m;else if((state.mandanten[m]||[]).includes(kat))mandant=m;break}}
 const wd='(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)';const dayRe=new RegExp('^\\W{0,3}(?:'+wd+'\\W*)?(\\d{1,2})\\s*\\.\\s*('+MON_RE+')(?:\\s+(\\d{4}))?\\W*$');
 const out=[];let cur=null,date=null,dWarn=false;
 const amtRe=/(\+|＋)?\s?(\d{1,3}(?:\.\d{3})+|\d+)\s*[,.]\s*(\d{2})\s*(?:€|EUR|E\b)/i;
 const setAmt=(o,s)=>{const m=s.match(amtRe);if(!m)return;const ds=m[2].replace(/\D/g,'');o.cents=parseInt(ds,10)*100+parseInt(m[3],10);
  if(!m[1]&&ds.length>1&&ds[0]==='4')o.alt4=parseInt(ds.slice(1),10)*100+parseInt(m[3],10)};
 for(let i=Math.max(0,hIdx+1);i<lines.length;i++){const l=lines[i],k=lk[i];
  if(/^\W{0,3}heute\W{0,3}$/.test(k)){date=isoD(today);dWarn=false;continue}
  if(/^\W{0,3}gestern\W{0,3}$/.test(k)){const d=new Date(today);d.setDate(d.getDate()-1);date=isoD(d);dWarn=false;continue}
  const dm=k.match(dayRe);if(dm){const y=dm[3]?+dm[3]:(hy||today.getFullYear());date=`${y}-${String(monIdx(dm[2])+1).padStart(2,'0')}-${dm[1].padStart(2,'0')}`;dWarn=false;continue}
  const nm=l.match(/(?:^|[^\d,.])(\d{6})(?![\d,.])/);
  if(nm){let d=date,w=dWarn;if(!d){d=hy!=null?`${hy}-${String(hm+1).padStart(2,'0')}-01`:isoD(today);w=true}
   else if(hy!=null&&d.slice(0,7)!==`${hy}-${String(hm+1).padStart(2,'0')}`)w=true;
   cur={nr:nm[1],date:d,mandant,kat,known:!!best,kunde:'Aus App-Bildschirmfoto',cents:NaN,person:'',app:true,dateWarn:w};out.push(cur);setAmt(cur,l.slice(nm.index+nm[0].length));continue}
  if(cur){if(!Number.isFinite(cur.cents))setAmt(cur,l);if(!cur.person){const p=state.persons.find(p=>new RegExp('(^|\\W)'+p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(\\W|$)','i').test(l));if(p)cur.person=p}}}
 return out}
let reviewRows=[];
const sig=p=>JSON.stringify(p.map(o=>[o.nr,o.cents,o.date,o.mandant,o.kat]));
async function handlePhotos(files){files=[...(files||[])];if(!files.length||ocrBusy)return;ocrBusy=true;$('#photoBtn').disabled=true;$('#review').hidden=true;
 const found=[],errors=[];let empty=0;
 try{ocrStatus('Starte Texterkennung …',0);
  if(!window.Tesseract)await withTimeout(loadScript('vendor/tesseract.min.js'),30000,'Texterkennung lädt nicht');
  if(!window.Tesseract)throw new Error('Texterkennung nicht geladen');
  const SIZES=window.GM_SIZES||[1000,1400,2400],tot=files.length*SIZES.length;
  for(let i=0;i<files.length;i++){const passes=[];
   try{const img=await loadImg(files[i]);
    for(let j=0;j<SIZES.length;j++){
     // 2 gleiche Ergebnisse = Mehrheit steht schon fest, 3. Durchgang sparen
     if(j===2&&passes[0].length&&sig(passes[0])===sig(passes[1]))break;
     const w=await withTimeout(getOcr(),LOAD_TIMEOUT,'Texterkennung lädt zu lange (Internet?)');
     const label=`Lese Bild ${i+1}/${files.length} · Durchgang ${j+1}/${SIZES.length} …`;const step=i*SIZES.length+j;ocrStatus(label,step/tot);
     ocrProg=p=>ocrStatus(null,(step+p)/tot);
     const canvas=await prep(img,SIZES[j]);
     let data;try{({data}=await withTimeout(w.recognize(canvas,{},{text:true,blocks:true}),passTimeout(),'Zeitüberschreitung beim Lesen'))}catch(e){await killOcr();throw e}
     passes.push(parseOcr(fixAmounts(data)))}
    const v=vote(passes);if(!v.length)empty++;found.push(...v)}
   catch(e){console.warn(e);errors.push(`Bild ${i+1}: ${e.message||e}`)}}
 }catch(e){console.warn(e);errors.push(e.message||String(e))}
 finally{ocrProg=null;ocrBusy=false;$('#photoBtn').disabled=false;$('#photoFile').value=''}
 try{const tips='<p><b>Tipps:</b></p><p>• Auftrag gerade und scharf fotografieren, ganzes Blatt im Bild, gutes Licht</p><p>• Auftragsnummer (6 Ziffern) und Betrag müssen lesbar sein</p><p>• Bildschirmfotos aus der Einnahmen-App gehen auch</p>';
  const errHtml=errors.length?`<p>${errors.map(esc).join('<br>')}</p><p>Bitte nochmal versuchen. Hilft das nicht: App ganz schließen und neu öffnen.</p>`:'';
  if(!found.length){if(errors.length&&!empty)ocrDone('Fehler beim Lesen',errHtml,true);else ocrDone('Keine Buchung erkannt',errHtml+tips,!!errors.length);return}
  const pm={};found.forEach(o=>{if(o.plz&&state.bookings.some(b=>b.nr===o.nr))pm[o.nr]=o.plz});const plzN=fillPlz(pm);if(plzN)render();
  reviewRows=found.map(o=>({...o,person:o.person||'Janik',on:true}));markRows(true);renderReview();
  const dups=reviewRows.filter(r=>state.bookings.some(b=>b.nr===r.nr)).length,n=reviewRows.length;
  ocrDone(`${n} ${n===1?'Auftrag':'Aufträge'} erkannt`+(dups===n?' – alle schon gebucht':dups?`, davon ${dups} schon gebucht`:''),errHtml+(plzN?`<p><b>${plzN} ${plzN===1?'Buchung':'Buchungen'}: PLZ ergänzt</b> (Betrag unverändert).</p>`:'')+(dups===n?'<p>Es gibt nichts Neues zu buchen. Die Aufträge stehen unten zur Kontrolle.</p>':'<p>Bitte unten prüfen und auf „Buchen“ tippen.</p>'),!!errors.length);
  $('#review').scrollIntoView({behavior:'smooth',block:'start'})}
 catch(e){console.warn(e);ocrDone('Fehler',esc(e.message||String(e)),true)}}
window.addEventListener('unhandledrejection',e=>{if(ocrBusy)console.warn('OCR',e.reason)});
// Mehrere OCR-Durchgänge, pro Feld Mehrheitsentscheid (gegen OCR-Rauschen)
function vote(passes){passes=passes.filter(Array.isArray);if(!passes.length)return[];const cnt={};passes.forEach(p=>cnt[p.length]=(cnt[p.length]||0)+1);const n=+Object.entries(cnt).sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0];
 const use=passes.filter(p=>p.length===n);const pick=(vals,tie)=>{const c={};vals.forEach(v=>c[v]=(c[v]||0)+1);const best=Object.entries(c).sort((a,b)=>b[1]-a[1]||tie(a[0],b[0]))[0];if(!best)return{v:undefined,sure:false};return{v:best[0],sure:best[1]>vals.length/2}};
 return Array.from({length:n},(_,i)=>{const os=use.map(p=>p[i]);const o={...os[0]};const warn=[];
  const nr=pick(os.map(x=>x.nr),(a,b)=>0);o.nr=nr.v;if(!nr.sure)warn.push('Auftragsnr. unsicher');
  // App-Bildschirmfoto: "+" wird manchmal als "4" gelesen (+20,00 → 420,00)
  let cs=os.map(x=>x.cents).filter(Number.isFinite);if(o.app){const al=os.filter(x=>Number.isFinite(x.alt4));cs=cs.map(c=>{const a=al.find(x=>x.cents===c);return a&&(cs.includes(a.alt4)||os.length===1)?a.alt4:c})}
  const am=pick(cs.map(String),(a,b)=>a-b);if(am.v!==undefined){o.cents=+am.v;if(!am.sure||os.some(x=>x.cents===o.cents&&x.amtGuess)||(o.app&&os.some(x=>x.cents===o.cents&&Number.isFinite(x.alt4))))warn.push('Betrag unsicher')}else o.cents=NaN;
  const kt=pick(os.map(x=>x.mandant+'|'+x.kat),(a,b)=>0);[o.mandant,o.kat]=kt.v.split('|');
  const dt=pick(os.map(x=>x.date),(a,b)=>0);o.date=dt.v;if(!dt.sure||os.some(x=>x.dateWarn))warn.push('Datum unsicher');
  const pp=pick(os.map(x=>x.person||'').filter(Boolean),(a,b)=>0);o.person=pp.v||'';const pz=pick(os.map(x=>x.plz||'').filter(Boolean),(a,b)=>0);o.plz=pz.v||'';o.ocrWarn=warn;delete o.alt4;delete o.dateWarn;delete o.amtGuess;return o})}
function markRows(init){const seen={};reviewRows.forEach(r=>{r.notes=init?[...(r.ocrWarn||[])]:(r.notes||[]).filter(n=>/unsicher/.test(n)&&!r.touched);r.known=!!(state.mandanten[r.mandant]||[]).includes(r.kat);
 if(!r.known)r.notes.push('Kategorie unbekannt');if(state.bookings.some(b=>b.nr===r.nr))r.notes.push('Auftragsnummer schon gebucht');
 if(seen[r.nr])r.notes.push('Doppelt in diesem Import');seen[r.nr]=1;if(!Number.isFinite(r.cents))r.notes.push('Betrag fehlt');if(init&&r.notes.length)r.on=false})}
function renderReview(){const el=$('#review');el.hidden=false;const opt=(a,v)=>a.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('');
 el.innerHTML=`<p class="gh">Erkannte Aufträge (${reviewRows.length})</p><div class="group pad"><label class="cell" style="padding:0">Person für alle<select id="rvAll">${opt(state.persons,'Janik')}</select></label></div>`+
 byDay(reviewRows).map(([d,list])=>`<section class="day">${dayHead(d,list,['Auftrag','Aufträge'])}`+list.map(([r,i])=>`<div class="rv${r.notes.length?' flag':''}"><div class="h"><input type="checkbox" data-rv="${i}" data-f="on"${r.on?' checked':''}><b>${esc(r.nr)}</b><span style="margin-left:auto;font-weight:600">${Number.isFinite(r.cents)?eur(r.cents):'–'}</span></div>
 <div class="k">${esc(r.kunde||'Kunde unbekannt')}</div><div class="g">
 <div><label>Auftragsnr.</label><input data-rv="${i}" data-f="nr" value="${esc(r.nr)}" inputmode="numeric"></div>
 <div><label>Datum</label><input type="date" data-rv="${i}" data-f="date" value="${esc(r.date)}"></div>
 <div><label>Mandant</label><select data-rv="${i}" data-f="mandant">${r.mandant?'':'<option selected value="">–</option>'}${opt(Object.keys(state.mandanten),r.mandant)}</select></div>
 <div><label>Kategorie</label><select data-rv="${i}" data-f="kat">${r.known?'':`<option selected value="">${esc(r.kat||'–')} ?</option>`}${opt(state.mandanten[r.mandant]||[],r.kat)}</select></div>
 <div><label>Betrag €</label><input data-rv="${i}" data-f="betrag" inputmode="decimal" value="${Number.isFinite(r.cents)?(r.cents/100).toFixed(2).replace('.',','):''}"></div>
 <div><label>Person</label><select data-rv="${i}" data-f="person">${opt(state.persons,r.person)}</select></div>
 <div><label>PLZ</label><input data-rv="${i}" data-f="plz" value="${esc(r.plz||'')}" inputmode="numeric" maxlength="5" placeholder="–"></div></div>
 ${r.notes.length?`<div class="note">⚠︎ ${r.notes.join(' · ')}</div>`:''}</div>`).join('')+'</section>').join('')+
 `<div class="row"><button id="rvCancel">Verwerfen</button><button id="rvBook" class="primary">Buchen (${reviewRows.filter(r=>r.on).length})</button></div>`;
 $('#rvAll').onchange=e=>{reviewRows.forEach(r=>r.person=e.target.value);renderReview()};
 el.querySelectorAll('[data-rv]').forEach(inp=>inp.addEventListener('change',e=>{const r=reviewRows[+inp.dataset.rv],f=inp.dataset.f;
  if(f!=='on')r.touched=true;if(f==='on')r.on=inp.checked;else if(f==='betrag')r.cents=parseEur(inp.value);else if(f==='plz')r.plz=normPlz(inp.value);else{r[f]=inp.value.trim();if(f==='mandant')r.kat=(state.mandanten[r.mandant]||[]).includes(r.kat)?r.kat:''}
  markRows(false);renderReview()}));
 $('#rvCancel').onclick=()=>{reviewRows=[];el.hidden=true};
 $('#rvBook').onclick=()=>{const sel=reviewRows.filter(r=>r.on);if(!sel.length){toast('Nichts ausgewählt');return}const bad=sel.filter(r=>r.notes.length);
  if(bad.length){toast(`${bad.length} markierte Zeile(n) erst korrigieren oder abwählen`);return}
  sel.forEach(r=>state.bookings.push({id:uid(),nr:r.nr,date:r.date,mandant:r.mandant,kat:r.kat,person:r.person,cents:r.cents,...(normPlz(r.plz)?{plz:normPlz(r.plz)}:{})}));save();
  reviewRows=reviewRows.filter(r=>!r.on);if(!reviewRows.length)el.hidden=true;else{markRows(false);renderReview()}
  if(sel[0]){const[y,m]=sel[0].date.split('-');cur={y:+y,m:+m-1}}render();toast(`${sel.length} gebucht`)}}
$('#photoBtn').onclick=()=>$('#photoFile').click();$('#photoFile').onchange=e=>handlePhotos(e.target.files);
window.GM_parseOcr=parseOcr;window.GM_fixAmounts=fixAmounts;window.GM_vote=vote;

$('#katBack').onclick=closeKat;
fromFragment();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
