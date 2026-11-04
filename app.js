'use strict';
const VERSION='gm-v3', KEY='geldmanager-v1';
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
function render(){document.querySelectorAll('.mlabel').forEach(e=>e.textContent=`${MONTHS[cur.m]} ${cur.y}`);const items=monthItems();
 $('#total').textContent=eur(items.reduce((s,b)=>s+b.cents,0));$('#count').textContent=`${items.length} Buchung${items.length===1?'':'en'}`;
 $('#list').innerHTML=items.length?items.map(b=>`<li><div><div class="t">${esc(b.nr)} · ${esc(b.kat)}</div><div class="s">${fmtDate(b.date)} · ${esc(b.mandant)} · ${esc(b.person)}</div></div>
 <div><div class="b">${eur(b.cents)}</div><div class="act"><button data-edit="${b.id}">Bearbeiten</button><button class="del" data-del="${b.id}">Löschen</button></div></div></li>`).join(''):'<li class="empty">Keine Buchungen in diesem Monat</li>';
 const group=k=>{const m={};items.forEach(b=>m[b[k]]=(m[b[k]]||0)+b.cents);return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 const card=(t,rows)=>`<p class="gh">${t}</p><div class="group card">${rows.length?rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${eur(v)}</b></div>`).join(''):'<div><span>–</span></div>'}</div>`;
 $('#sums').innerHTML=`<div class="hero"><span>Monatssumme</span><b id="sumTotal">${eur(items.reduce((s,b)=>s+b.cents,0))}</b><small>${items.length} Buchungen</small></div>`+card('Pro Mandant',group('mandant'))+card('Pro Kategorie',group('kat'))+card('Pro Person',group('person'));
 $('#persons').innerHTML=state.persons.map(p=>`<span class="chip">${esc(p)}<button data-delp="${esc(p)}" aria-label="entfernen">✕</button></span>`).join('');
 $('#mandanten').innerHTML=Object.entries(state.mandanten).map(([m,ks])=>`<div class="group m"><b>${esc(m)}</b><div class="chips">${ks.map(k=>`<span class="chip">${esc(k)}<button data-delk="${esc(m)}|${esc(k)}">✕</button></span>`).join('')}</div>
 <div class="row"><input placeholder="Neue Kategorie" data-newk="${esc(m)}"><button class="tinted" data-addk="${esc(m)}" style="flex:0 0 52px">＋</button></div></div>`).join('');
 $('#ver').textContent=VERSION}
function fillSelect(sel,opts,val){sel.innerHTML=opts.map(o=>`<option${o===val?' selected':''}>${esc(o)}</option>`).join('')}
function fillKat(val){fillSelect($('#f-kat'),state.mandanten[$('#f-mandant').value]||[],val)}
function openForm(b){editId=b?b.id:null;$('#formTitle').textContent=b?'Buchung bearbeiten':'Neue Buchung';
 $('#f-nr').value=b?b.nr:'';const d=new Date();const def=(cur.y===d.getFullYear()&&cur.m===d.getMonth())?d.toISOString().slice(0,10):`${cur.y}-${String(cur.m+1).padStart(2,'0')}-01`;
 $('#f-date').value=b?b.date:def;fillSelect($('#f-mandant'),Object.keys(state.mandanten),b?b.mandant:'CMS');fillKat(b&&b.kat);
 fillSelect($('#f-person'),state.persons,b?b.person:'Janik');$('#f-betrag').value=b?(b.cents/100).toFixed(2).replace('.',','):'';
 $('#dupWarn').hidden=true;$('#form').hidden=false;$('#addBtn').parentNode.hidden=true;$('#f-nr').focus()}
function closeForm(){$('#form').hidden=true;$('#addBtn').parentNode.hidden=false;editId=null}
function dup(nr){return state.bookings.find(x=>x.nr===nr.trim()&&x.id!==editId)}
$('#f-nr').addEventListener('input',e=>{const d=dup(e.target.value);$('#dupWarn').hidden=!d;if(d)$('#dupWarn').textContent=`Auftragsnummer ${d.nr} gibt es schon (${fmtDate(d.date)}, ${d.kat}, ${eur(d.cents)}).`});
$('#f-mandant').addEventListener('change',()=>fillKat());
$('#form').addEventListener('submit',e=>{e.preventDefault();const b={id:editId||uid(),nr:$('#f-nr').value.trim(),date:$('#f-date').value,mandant:$('#f-mandant').value,kat:$('#f-kat').value,person:$('#f-person').value,cents:parseEur($('#f-betrag').value)};
 if(!valid(b)){toast('Bitte alle Felder richtig ausfüllen');return}
 if(dup(b.nr)){toast('Doppelte Auftragsnummer, nicht gespeichert');$('#dupWarn').hidden=false;return}
 if(editId)state.bookings=state.bookings.map(x=>x.id===editId?b:x);else state.bookings.push(b);
 save();const[y,m]=b.date.split('-');cur={y:+y,m:+m-1};toast(editId?'Geändert':'Gespeichert');closeForm();render()});
$('#addBtn').onclick=()=>openForm();$('#cancel').onclick=closeForm;
document.querySelectorAll('.mprev').forEach(b=>b.onclick=()=>{cur.m--;if(cur.m<0){cur.m=11;cur.y--}render()});document.querySelectorAll('.mnext').forEach(b=>b.onclick=()=>{cur.m++;if(cur.m>11){cur.m=0;cur.y++}render()});
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabbar button').forEach(x=>x.classList.toggle('on',x===b));['list','sum','set'].forEach(t=>$('#tab-'+t).hidden=t!==b.dataset.tab);scrollTo(0,0)});
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
/* ---------- Fotos/Screenshots: OCR lokal im Browser ---------- */
const normKey=s=>String(s).toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/[^a-z0-9]/g,'');
let ocrWorker=null;
function ocrStatus(t,p){$('#ocrStatus').hidden=false;if(t!=null)$('#ocrText').textContent=t;if(p!=null)$('#ocrBar').style.width=Math.round(p*100)+'%'}
function getOcr(){if(!ocrWorker){const base=new URL('vendor/',location.href).href;
 ocrWorker=Tesseract.createWorker('deu',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base+'lang',workerBlobURL:false,
  logger:m=>{if(m.status==='recognizing text')ocrStatus(null,m.progress);else if(/load|init/i.test(m.status||''))ocrStatus('Lade Texterkennung (einmalig) …',m.progress)}})
 .then(async w=>{await w.setParameters({tessedit_pageseg_mode:'4',preserve_interword_spaces:'1'});return w});ocrWorker.catch(()=>ocrWorker=null)}return ocrWorker}
function loadImg(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>rej(new Error('Bild nicht lesbar'));im.src=u})}
// wie Tourenplaner: skalieren, Graustufen, Dunkelmodus invertieren, Kontrast
async function prep(img,T){const sc=Math.max(.5,Math.min(3,T/img.width));const w=Math.round(img.width*sc),h=Math.round(img.height*sc);
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);
 const d=x.getImageData(0,0,w,h),p=d.data;let sum=0;for(let i=0;i<p.length;i+=4){const g=.299*p[i]+.587*p[i+1]+.114*p[i+2];p[i]=g;sum+=g}
 const dark=sum/(p.length/4)<110,lo=60,hi=235;for(let i=0;i<p.length;i+=4){let g=p[i];if(dark)g=255-g;g=(g-lo)*255/(hi-lo);g=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=g;p[i+3]=255}
 x.putImageData(d,0,0);return c}
function matchKat(mid){const n=normKey(mid);let best=null;
 for(const[m,ks]of Object.entries(state.mandanten))for(const k of ks){const kn=normKey(k);if(kn&&n.includes(kn)){const score=kn.length+(n.includes(normKey(m))?100:0);if(!best||score>best.score)best={m,k,score}}}
 if(best)return{mandant:best.m,kat:best.k,known:true};
 let raw=mid.replace(/^[\s|Il\[\]!:]+|[\s|Il\[\]!:]+$/g,'');let mandant='';
 for(const m of Object.keys(state.mandanten))if(normKey(raw).startsWith(normKey(m))){mandant=m;raw=raw.slice(m.length).replace(/^[\s·•.,:\-]+/,'');break}
 return{mandant,kat:raw.trim(),known:false}}
const HEAD=/(?:^|[^\d])(\d{6})(?!\d{2})\d?\s*[|Il1!\]\[:]?\s+(.*?)\s*[|Il!\]\[:]?\s*(\d{1,2})\s*[.,]\s*(\d{1,2})\s*[.,]\s*(\d{4})/;
function parseOcr(text){let lines=text.split(/\n/).map(l=>l.replace(/[—–]/g,'-').replace(/\s+/g,' ').trim()).filter(Boolean);for(let i=0;i<lines.length-1;i++)if(/^\D{0,3}\d{6}\D/.test(lines[i])&&!HEAD.test(lines[i])&&/^\D{0,3}\d{1,2}\s*[.,]\s*\d{1,2}\s*[.,]\s*\d{4}/.test(lines[i+1])){lines[i]+=' '+lines[i+1];lines.splice(i+1,1)}
 const out=[];let cur=null;
 for(const l of lines){const h=l.match(HEAD);
  if(h){const km=matchKat(h[2]);cur={nr:h[1],date:`${h[5]}-${h[4].padStart(2,'0')}-${h[3].padStart(2,'0')}`,...km,kunde:'',cents:NaN,lines:[]};out.push(cur);continue}
  if(cur)cur.lines.push(l)}
 for(const o of out){o.kunde=(o.lines.find(l=>/[a-zäöü]{3}/i.test(l)&&!/^(gp|händler|haendler)/i.test(l))||'').slice(0,60);
  let amt=null;for(const l of o.lines){if(/\b(gp|händler|haendler|nr)\b/i.test(l))continue;
   const ms=[...l.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+)\s*[,.]\s*(\d{2})\s*(€|EUR|E\b)/gi)];if(ms.length)amt=ms[ms.length-1];
   else if(amt==null){const m2=l.match(/(?:pauschale|betrag)\D*(\d+)\s*[,.]\s*(\d{2})/i);if(m2)amt=m2}}
  if(amt)o.cents=parseInt(amt[1].replace(/\D/g,''),10)*100+parseInt(amt[2],10);delete o.lines}
 return out}
let reviewRows=[];
async function handlePhotos(files){files=[...files];if(!files.length)return;$('#photoBtn').disabled=true;
 try{if(!window.Tesseract)throw new Error('Texterkennung nicht geladen');const w=await getOcr();const found=[];
  const SIZES=window.GM_SIZES||[1000,1400,2400];
  for(let i=0;i<files.length;i++){const img=await loadImg(files[i]);const passes=[];
   for(let j=0;j<SIZES.length;j++){ocrStatus(`Lese Bild ${i+1}/${files.length} (Durchgang ${j+1}/${SIZES.length}) …`,0);const{data}=await w.recognize(await prep(img,SIZES[j]));passes.push(parseOcr(data.text))}
   found.push(...vote(passes))}
  $('#ocrStatus').hidden=true;if(!found.length){toast('Keine Aufträge erkannt');return}
  reviewRows=found.map(o=>({...o,person:'Janik',on:true}));markRows(true);renderReview()}
 catch(e){$('#ocrStatus').hidden=true;toast('Fehler: '+e.message)}finally{$('#photoBtn').disabled=false;$('#photoFile').value=''}}
// Mehrere OCR-Durchgänge, pro Feld Mehrheitsentscheid (gegen OCR-Rauschen)
function vote(passes){const cnt={};passes.forEach(p=>cnt[p.length]=(cnt[p.length]||0)+1);const n=+Object.entries(cnt).sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0];
 const use=passes.filter(p=>p.length===n);const pick=(vals,tie)=>{const c={};vals.forEach(v=>c[v]=(c[v]||0)+1);const best=Object.entries(c).sort((a,b)=>b[1]-a[1]||tie(a[0],b[0]))[0];if(!best)return{v:undefined,sure:false};return{v:best[0],sure:best[1]>vals.length/2}};
 return Array.from({length:n},(_,i)=>{const os=use.map(p=>p[i]);const o={...os[0]};const warn=[];
  const nr=pick(os.map(x=>x.nr),(a,b)=>0);o.nr=nr.v;if(!nr.sure)warn.push('Auftragsnr. unsicher');
  const am=pick(os.map(x=>x.cents).filter(Number.isFinite).map(String),(a,b)=>a-b);if(am.v!==undefined){o.cents=+am.v;if(!am.sure)warn.push('Betrag unsicher')}
  const kt=pick(os.map(x=>x.mandant+'|'+x.kat),(a,b)=>0);[o.mandant,o.kat]=kt.v.split('|');
  const dt=pick(os.map(x=>x.date),(a,b)=>0);o.date=dt.v;if(!dt.sure)warn.push('Datum unsicher');o.ocrWarn=warn;return o})}
function markRows(init){const seen={};reviewRows.forEach(r=>{r.notes=init?[...(r.ocrWarn||[])]:(r.notes||[]).filter(n=>/unsicher/.test(n)&&!r.touched);r.known=!!(state.mandanten[r.mandant]||[]).includes(r.kat);
 if(!r.known)r.notes.push('Kategorie unbekannt');if(state.bookings.some(b=>b.nr===r.nr))r.notes.push('Auftragsnummer schon gebucht');
 if(seen[r.nr])r.notes.push('Doppelt in diesem Import');seen[r.nr]=1;if(!Number.isFinite(r.cents))r.notes.push('Betrag fehlt');if(init&&r.notes.length)r.on=false})}
function renderReview(){const el=$('#review');el.hidden=false;const opt=(a,v)=>a.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('');
 el.innerHTML=`<p class="gh">Erkannte Aufträge (${reviewRows.length})</p><div class="group pad"><label class="cell" style="padding:0">Person für alle<select id="rvAll">${opt(state.persons,'Janik')}</select></label></div>`+
 reviewRows.map((r,i)=>`<div class="rv${r.notes.length?' flag':''}"><div class="h"><input type="checkbox" data-rv="${i}" data-f="on"${r.on?' checked':''}><b>${esc(r.nr)}</b><span style="margin-left:auto;font-weight:600">${Number.isFinite(r.cents)?eur(r.cents):'–'}</span></div>
 <div class="k">${esc(r.kunde||'Kunde unbekannt')}</div><div class="g">
 <div><label>Auftragsnr.</label><input data-rv="${i}" data-f="nr" value="${esc(r.nr)}" inputmode="numeric"></div>
 <div><label>Datum</label><input type="date" data-rv="${i}" data-f="date" value="${esc(r.date)}"></div>
 <div><label>Mandant</label><select data-rv="${i}" data-f="mandant">${r.mandant?'':'<option selected value="">–</option>'}${opt(Object.keys(state.mandanten),r.mandant)}</select></div>
 <div><label>Kategorie</label><select data-rv="${i}" data-f="kat">${r.known?'':`<option selected value="">${esc(r.kat||'–')} ?</option>`}${opt(state.mandanten[r.mandant]||[],r.kat)}</select></div>
 <div><label>Betrag €</label><input data-rv="${i}" data-f="betrag" inputmode="decimal" value="${Number.isFinite(r.cents)?(r.cents/100).toFixed(2).replace('.',','):''}"></div>
 <div><label>Person</label><select data-rv="${i}" data-f="person">${opt(state.persons,r.person)}</select></div></div>
 ${r.notes.length?`<div class="note">⚠︎ ${r.notes.join(' · ')}</div>`:''}</div>`).join('')+
 `<div class="row"><button id="rvCancel">Verwerfen</button><button id="rvBook" class="primary">Buchen (${reviewRows.filter(r=>r.on).length})</button></div>`;
 $('#rvAll').onchange=e=>{reviewRows.forEach(r=>r.person=e.target.value);renderReview()};
 el.querySelectorAll('[data-rv]').forEach(inp=>inp.addEventListener('change',e=>{const r=reviewRows[+inp.dataset.rv],f=inp.dataset.f;
  if(f!=='on')r.touched=true;if(f==='on')r.on=inp.checked;else if(f==='betrag')r.cents=parseEur(inp.value);else{r[f]=inp.value.trim();if(f==='mandant')r.kat=(state.mandanten[r.mandant]||[]).includes(r.kat)?r.kat:''}
  markRows(false);renderReview()}));
 $('#rvCancel').onclick=()=>{reviewRows=[];el.hidden=true};
 $('#rvBook').onclick=()=>{const sel=reviewRows.filter(r=>r.on);if(!sel.length){toast('Nichts ausgewählt');return}const bad=sel.filter(r=>r.notes.length);
  if(bad.length){toast(`${bad.length} markierte Zeile(n) erst korrigieren oder abwählen`);return}
  sel.forEach(r=>state.bookings.push({id:uid(),nr:r.nr,date:r.date,mandant:r.mandant,kat:r.kat,person:r.person,cents:r.cents}));save();
  reviewRows=reviewRows.filter(r=>!r.on);if(!reviewRows.length)el.hidden=true;else{markRows(false);renderReview()}
  if(sel[0]){const[y,m]=sel[0].date.split('-');cur={y:+y,m:+m-1}}render();toast(`${sel.length} gebucht`)}}
$('#photoBtn').onclick=()=>$('#photoFile').click();$('#photoFile').onchange=e=>handlePhotos(e.target.files);
window.GM_parseOcr=parseOcr;

fromFragment();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
