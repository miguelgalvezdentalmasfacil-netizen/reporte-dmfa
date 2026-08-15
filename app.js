
/* Si algo falla en el celular, mostrarlo EN PANTALLA en vez de que
   "no pase nada". AsÃ­ podemos ver exactamente quÃ© error es. */
window.addEventListener('error', function(ev){
  try{
    let box=document.getElementById('js-fatal-error');
    if(!box){
      box=document.createElement('div');
      box.id='js-fatal-error';
      box.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#A32D2D;color:#fff;padding:14px;font-size:13px;font-family:monospace;white-space:pre-wrap;max-height:50vh;overflow:auto';
      document.body.insertBefore(box, document.body.firstChild);
    }
    box.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Error: '+(ev.message||'desconocido')+' â€” lÃ­nea '+(ev.lineno||'?')+' â€” '+(ev.error&&ev.error.stack?ev.error.stack:'');
  }catch(e){}
});

/* Algunos navegadores/webviews en celular (ej. abrir el archivo directamente,
   o el navegador interno de WhatsApp) bloquean localStorage y lanzan un
   SecurityError. Si eso pasa, usamos un respaldo en memoria para que el
   resto de la app NO se rompa. */
const safeStorage = (function(){
  try{
    const testKey='__dmf_test__';
    window.localStorage.setItem(testKey,'1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  }catch(err){
    console.warn('localStorage no disponible, usando memoria temporal:', err);
    const mem={};
    return {
      getItem:k=>(k in mem? mem[k] : null),
      setItem:(k,v)=>{mem[k]=String(v);},
      removeItem:k=>{delete mem[k];}
    };
  }
})();

let SHEET_URL = safeStorage.getItem('dmf_sheet_url') || '';

function getSheetURL(){
  const saved = safeStorage.getItem('dmf_sheet_url');
  if(saved) return saved;
  return '';
}

function guardarConfig(){
  const raw = document.getElementById('sheet-url-input').value.trim();
  if(!raw || !raw.startsWith('https://script.google.com/')){
    document.getElementById('config-err').style.display='block';
    document.getElementById('config-err').innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Pega la URL de tu Apps Script (debe empezar con https://script.google.com/ y terminar en /exec).';
    return;
  }
  SHEET_URL = raw;
  safeStorage.setItem('dmf_sheet_url', SHEET_URL);
  document.getElementById('config').style.display='none';
  document.getElementById('app').style.display='block';
  cargarDatos();
  startAutoRefresh();
}

function abrirConfig(){
  const savedUrl = safeStorage.getItem('dmf_sheet_url')||'';
  document.getElementById('sheet-url-input').value = savedUrl;
  document.getElementById('app').style.display='none';
  document.getElementById('config').style.display='flex';
}
const USERS={'carlos':{pwd:'dir2026',name:'Carlos',role:'Director general',init:'CG'},'estefania':{pwd:'ops2026',name:'EstefanÃ­a Longoria',role:'Directora operativa',init:'EL'}};
const fmt=v=>'$'+parseFloat(v||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmt2=v=>'$'+parseFloat(v||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const bc=p=>p>=100?'#3B6D11':p>=80?'#EF9F27':'#E24B4A';
// Meta mensual Ãºnica por clÃ­nica-ciudad. Todo (Metas, Resumen, Anual, ProyecciÃ³n) gira
// en torno a esta cifra por clÃ­nica. La secciÃ³n de Deuda NO usa esta meta.
const META_CLINICA = 361189.042;
const CLINICAS_META=[
  {k:'Tijuana ,Plaza del Zapato',n:'Plaza del Zapato',c:'Tijuana',code:'tj',s:'blue-s',color:'#185FA5',meta:META_CLINICA},
  {k:'Mexicali, Av Alvaro Obregon 771',n:'ObregÃ³n',c:'Mexicali',code:'ob',s:'green-s',color:'#3B6D11',meta:META_CLINICA},
  {k:'Mexicali, Rio verde 631',n:'Villa Verde',c:'Mexicali',code:'vv',s:'amber-s',color:'#EF9F27',meta:META_CLINICA},
  {k:'Ensenada, Av Ruiz 631',n:'Ensenada',c:'Ensenada',code:'en',s:'purple-s',color:'#534AB7',meta:META_CLINICA}
];
const META_TOTAL = META_CLINICA * CLINICAS_META.length;
// Deuda de remodelaciÃ³n: el monto TOTAL todavÃ­a no estÃ¡ definido.
// En cuanto lo tengas, cÃ¡mbialo aquÃ­ (por ejemplo: const DEUDA_TOTAL = 1412000;)
// y automÃ¡ticamente se calcularÃ¡ el pendiente y los porcentajes reales.
const DEUDA_TOTAL = null;
const MESES_ABR_MAP={ene:'Enero',feb:'Febrero',mar:'Marzo',abr:'Abril',may:'Mayo',jun:'Junio',jul:'Julio',ago:'Agosto',sep:'Septiembre',oct:'Octubre',nov:'Noviembre',dic:'Diciembre'};
let gastos=[],chartsBuilt=false,datosCarolina=[],usuarioActual='';

/* ---- Selector personalizado (csel): reemplaza el <select> nativo por un dropdown propio ---- */
const CSEL_OPTS={};
function renderCselContent(value,text,opts){
  let icon='';
  if(opts.kind==='dot'){
    const color=(opts.colorMap&&opts.colorMap[value])||'#C7CDD6';
    icon=`<span class="csel-dot" style="background:${color}"></span>`;
  } else if(opts.kind==='avatar'){
    const init=(opts.avatarMap&&opts.avatarMap[value])||'â€”';
    icon=`<span class="csel-avatar">${init}</span>`;
  } else if(opts.kind==='icon'){
    const ic=(opts.iconMap&&opts.iconMap[value])||'â–«ï¸';
    icon=`<span class="csel-icon">${ic}</span>`;
  }
  return `${icon}<span>${text}</span>`;
}
function closeCsel(wrap){wrap.classList.remove('open');}
function syncCustomSelect(selectId){
  const nativeSel=document.getElementById(selectId);
  const wrap=document.getElementById('csel-'+selectId);
  if(!nativeSel||!wrap) return;
  const opts=CSEL_OPTS[selectId]||{kind:'none'};
  const val=nativeSel.value;
  const selectedOption=Array.from(nativeSel.options).find(o=>o.value===val)||nativeSel.options[0];
  const label=wrap.querySelector('.csel-label');
  label.innerHTML=renderCselContent(selectedOption?selectedOption.value:'',selectedOption?selectedOption.textContent:'',opts);
  wrap.querySelectorAll('.csel-opt').forEach(o=>{o.classList.toggle('sel',o.dataset.value===val);});
}
function buildCustomSelect(selectId,opts){
  const nativeSel=document.getElementById(selectId);
  if(!nativeSel||nativeSel.dataset.cselInit) return;
  nativeSel.dataset.cselInit='1';
  CSEL_OPTS[selectId]=opts;
  nativeSel.style.display='none';

  const wrap=document.createElement('div');
  wrap.className='csel';
  wrap.id='csel-'+selectId;

  const btn=document.createElement('button');
  btn.type='button';
  btn.className='csel-btn';
  btn.innerHTML='<span class="csel-label"></span><span class="csel-arrow">â–¾</span>';

  const panel=document.createElement('div');
  panel.className='csel-panel';
  panel.setAttribute('role','listbox');

  Array.from(nativeSel.options).forEach(o=>{
    const opt=document.createElement('div');
    opt.className='csel-opt'+(o.value===''?' placeholder':'');
    opt.dataset.value=o.value;
    opt.innerHTML=renderCselContent(o.value,o.textContent,opts);
    opt.addEventListener('click',()=>{
      nativeSel.value=o.value;
      nativeSel.dispatchEvent(new Event('change',{bubbles:true}));
      closeCsel(wrap);
      syncCustomSelect(selectId);
    });
    panel.appendChild(opt);
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  nativeSel.insertAdjacentElement('afterend',wrap);

  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    document.querySelectorAll('.csel.open').forEach(c=>{if(c!==wrap)closeCsel(c);});
    wrap.classList.toggle('open');
  });

  syncCustomSelect(selectId);
}
document.addEventListener('click',()=>{document.querySelectorAll('.csel.open').forEach(closeCsel);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.csel.open').forEach(closeCsel);});
const AUTO_REFRESH_MS = 5000;
let autoRefreshTimer = null;

function startAutoRefresh(){
  if(autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(cargarDatos, AUTO_REFRESH_MS);
}

function stopAutoRefresh(){
  if(autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

function quitarAcentos(s){
  const map={'Ã¡':'a','Ã©':'e','Ã­':'i','Ã³':'o','Ãº':'u','Ã±':'n','Ã¼':'u'};
  let out='';
  for(let i=0;i<s.length;i++){
    const c=s[i];
    out += (map[c] !== undefined ? map[c] : c);
  }
  return out;
}
function doLogin(){
  try{
    const uRaw=document.getElementById('l-u').value.trim().toLowerCase();
    const u=quitarAcentos(uRaw);
    const p=document.getElementById('l-p').value.trim();
    if(USERS[u]&&USERS[u].pwd===p){
      document.getElementById('lerr').style.display='none';
      document.getElementById('login').style.display='none';
      document.getElementById('app').style.display='block';
      const usr=USERS[u];
      usuarioActual=usr.name;
      document.getElementById('av').textContent=usr.init;
      document.getElementById('uname').textContent=usr.name;
      document.getElementById('urole').textContent=usr.role;
      document.getElementById('uw').style.display='block';
      document.getElementById('g-quien').value=usr.name;
      syncCustomSelect('g-quien');
      try{ buildCharts(); }catch(chartErr){ console.warn('buildCharts fallÃ³ (no crÃ­tico):', chartErr); }
      const savedSheet = safeStorage.getItem('dmf_sheet_url');
      if(!savedSheet){
        document.getElementById('login').style.display='none';
        document.getElementById('config').style.display='flex';
        document.getElementById('app').style.display='none';
      } else {
        SHEET_URL = savedSheet;
        cargarDatos();
        startAutoRefresh();
      }
    } else {
      const lerr=document.getElementById('lerr');
      lerr.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Credenciales incorrectas';
      lerr.style.display='block';
    }
  }catch(err){
    const lerr=document.getElementById('lerr');
    lerr.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Error tÃ©cnico: '+err.message;
    lerr.style.display='block';
    console.error('Error en doLogin:', err);
  }
}
function doLogout(){
  stopAutoRefresh();
  document.getElementById('login').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('l-u').value='';
  document.getElementById('l-p').value='';
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doLogin();}});
['l-u','l-p'].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doLogin();}});
});

function showTab(t){
  document.querySelectorAll('.view').forEach(v=>v.style.display='none');
  document.getElementById('v-'+t).style.display='block';
  document.querySelectorAll('.bntab,.dtab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('[data-tab="'+t+'"]').forEach(b=>b.classList.add('on'));
}
document.querySelectorAll('.bntab,.dtab').forEach(b=>{b.addEventListener('click',()=>showTab(b.dataset.tab));});

async function cargarDatos(){
  try{
    const r=await fetch(SHEET_URL, {cache:"no-store"});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const json=await r.json();
    if(!json || !Array.isArray(json.ventas)) throw new Error('Respuesta inesperada del Apps Script');
    datosCarolina = json.ventas;
    gastos = Array.isArray(json.gastos) ? json.gastos : [];
    actualizarCorte();
    renderHistorial();
    renderResumen();
    renderMetasTab();
    renderAnualTab();
    renderTrimestral();
    renderGastos();
    actualizarNeto();
    renderCharts();
    renderProyeccion();
    renderDeuda();
    document.getElementById('conn-error').style.display='none';
  } catch(err){
    console.error('Error cargando datos:',err);
    const banner = document.getElementById('conn-error');
    banner.innerHTML = '<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> No se pudo conectar con el Apps Script (' + err.message + '). Reintentando.';
    banner.style.display='block';
  }
}

function actualizarCorte(){
  const tv=datosCarolina.reduce((a,x)=>a+x.venta,0);
  const tb=datosCarolina.reduce((a,x)=>a+x.banco,0);
  const te=datosCarolina.reduce((a,x)=>a+x.efec,0);
  document.getElementById('corte-total').textContent=fmt(te);
  document.getElementById('corte-banco').textContent=fmt(tb);
  document.getElementById('corte-ventas').textContent=fmt(tv);
  document.getElementById('corte-regs').textContent=datosCarolina.length+' reg.';
  const cls={'Tijuana ,Plaza del Zapato':{ef:'c-tj-ef',b:'c-tj-b',v:'c-tj-v'},'Mexicali, Av Alvaro Obregon 771':{ef:'c-ob-ef',b:'c-ob-b',v:'c-ob-v'},'Mexicali, Rio verde 631':{ef:'c-vv-ef',b:'c-vv-b',v:'c-vv-v'},'Ensenada, Av Ruiz 631':{ef:'c-en-ef',b:'c-en-b',v:'c-en-v'}};
  Object.keys(cls).forEach(cl=>{
    const d=datosCarolina.filter(x=>x.clinica===cl);
    const ids=cls[cl];
    document.getElementById(ids.ef).textContent=fmt(d.reduce((a,x)=>a+x.efec,0));
    document.getElementById(ids.b).textContent=fmt(d.reduce((a,x)=>a+x.banco,0));
    document.getElementById(ids.v).textContent=fmt(d.reduce((a,x)=>a+x.venta,0));
  });
}

function renderHistorial(){
  const cl=document.getElementById('f-cl').value;
  const list=document.getElementById('hist-list');
  const tots=document.getElementById('hist-totales');
  if(!cl){
    list.innerHTML='<div class="empty">ðŸ‘† Selecciona una clÃ­nica arriba (o "Todas las clÃ­nicas") para ver su historial.</div>';
    tots.innerHTML='';
    return;
  }
  let datos=[...datosCarolina].reverse();
  if(cl!=='__todas__') datos=datos.filter(d=>d.clinica===cl);
  if(!datos.length){list.innerHTML='<div class="empty">ðŸ“­ Sin registros.</div>';tots.innerHTML='';return;}
  const tv=datos.reduce((a,x)=>a+x.venta,0);
  const tb=datos.reduce((a,x)=>a+x.banco,0);
  const te=datos.reduce((a,x)=>a+x.efec,0);
  tots.innerHTML=`<div class="mc blue"><div class="ml">Total ventas</div><div class="mv">${fmt(tv)}</div></div><div class="mc blue"><div class="ml">Total banco</div><div class="mv">${fmt(tb)}</div></div><div class="mc green"><div class="ml">Total efectivo</div><div class="mv">${fmt(te)}</div></div><div class="mc amber"><div class="ml">Registros</div><div class="mv">${datos.length}</div></div>`;
  const COLS={'Tijuana ,Plaza del Zapato':'#185FA5','Mexicali, Av Alvaro Obregon 771':'#3B6D11','Mexicali, Rio verde 631':'#EF9F27','Ensenada, Av Ruiz 631':'#534AB7'};
  list.innerHTML=datos.map(d=>`<div class="hrow"><div class="hcl"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLS[d.clinica]||'#999'};margin-right:6px;vertical-align:middle"></span>${d.clinica.replace(',','Â·')}</div><div class="hmeta"><svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${d.fecha} Â· ${d.capturado}${d.nota?' Â· '+d.nota:''}</div><div class="hvals"><span class="hv v"><svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg> ${fmt(d.venta)}</span><span class="hv b"><svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> ${fmt(d.banco)}</span><span class="hv e"><svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg> ${fmt(d.efec)}</span></div></div>`).join('');
}

function renderResumen(){
  const tv=datosCarolina.reduce((a,x)=>a+x.venta,0);
  const tb=datosCarolina.reduce((a,x)=>a+x.banco,0);
  const te=datosCarolina.reduce((a,x)=>a+x.efec,0);
  const pct=Math.round(tv/META_TOTAL*100);
  document.getElementById('res-metrics').innerHTML=`<div class="mc blue"><div class="ml">Ventas</div><div class="mv">${fmt(tv)}</div><div class="ms">${pct}% de meta (${fmt(META_TOTAL)})</div></div><div class="mc blue"><div class="ml">Banco</div><div class="mv">${fmt(tb)}</div></div><div class="mc green"><div class="ml">Efectivo</div><div class="mv">${fmt(te)}</div></div><div class="mc amber"><div class="ml">Registros</div><div class="mv">${datosCarolina.length}</div></div>`;
  document.getElementById('res-clinicas').innerHTML=CLINICAS_META.map(cl=>{
    const d=datosCarolina.filter(x=>x.clinica===cl.k);
    const v=d.reduce((a,x)=>a+x.venta,0);
    const b=d.reduce((a,x)=>a+x.banco,0);
    const e=d.reduce((a,x)=>a+x.efec,0);
    const p=Math.round(v/cl.meta*100);
    const badge=p>=100?'ok':p>=70?'par':'no';
    return`<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">ðŸ“</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${p}%</span></div><div class="sr"><span class="sl">Ventas</span><span class="sv">${fmt(v)}</span></div><div class="sr"><span class="sl">Banco</span><span class="sv b">${fmt(b)}</span></div><div class="sr"><span class="sl">Efectivo</span><span class="sv g">${fmt(e)}</span></div><div class="sr"><span class="sl">Meta</span><span class="sv">${fmt(cl.meta)}</span></div></div>`;
  }).join('');
}

function renderMetasTab(){
  document.getElementById('metas-header').textContent='Meta mensual por clÃ­nica Â· '+fmt2(META_CLINICA)+' c/u Â· Total '+fmt2(META_TOTAL);
  const hoy=new Date(), anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  CLINICAS_META.forEach(cl=>{
    const d=datosCarolina.filter(x=>{
      if(x.clinica!==cl.k) return false;
      const f=parseFechaFlexible(x.fecha);
      return f && f.year===anioActual && f.month===mesActual;
    });
    const v=d.reduce((a,x)=>a+x.venta,0);
    const pct=cl.meta?Math.round(v/cl.meta*100):0;
    document.getElementById('mt-'+cl.code+'-v').textContent=fmt(v);
    document.getElementById('mt-'+cl.code+'-p').textContent=pct+'% de meta ('+fmt(cl.meta)+')';
  });
}

function renderAnualTab(){
  const {MES,ML,TOT}=computeAgg(datosCarolina);
  const tv=datosCarolina.reduce((a,x)=>a+x.venta,0);
  const tb=datosCarolina.reduce((a,x)=>a+x.banco,0);
  const te=datosCarolina.reduce((a,x)=>a+x.efec,0);
  document.getElementById('an-ventas').textContent=fmt(tv);
  document.getElementById('an-ventas-pct').textContent=(MES.length?Math.round(tv/(META_TOTAL*MES.length)*100):0)+'% de meta acumulada';
  document.getElementById('an-banco').textContent=fmt(tb);
  document.getElementById('an-efec').textContent=fmt(te);
  if(MES.length){
    let mejorIdx=0,mejorVal=-Infinity;
    MES.forEach((m,i)=>{if((TOT[m]||0)>mejorVal){mejorVal=TOT[m];mejorIdx=i;}});
    document.getElementById('an-mejor-mes').textContent=ML[mejorIdx].replace('*','');
    document.getElementById('an-mejor-val').textContent=fmt(mejorVal);
  } else {
    document.getElementById('an-mejor-mes').textContent='â€”';
    document.getElementById('an-mejor-val').textContent='â€”';
  }
  document.getElementById('anual-header').textContent='Acumulado 2026 Â· '+(ML.length?ML[0].replace('*','')+'â€“'+ML[ML.length-1].replace('*',''):'sin datos');
}

function quarterKeyOf(y,m){return y+'-Q'+Math.ceil(m/3);}
function quarterLabel(qk){
  const [y,q]=qk.split('-Q');
  const rangos={1:'Ene-Mar',2:'Abr-Jun',3:'Jul-Sep',4:'Oct-Dic'};
  return 'Q'+q+' '+y+' ('+rangos[q]+')';
}
function poblarSelectorTrimestre(){
  const sel=document.getElementById('tri-select');
  const hoy=new Date();
  const actual=quarterKeyOf(hoy.getFullYear(),hoy.getMonth()+1);
  const set=new Set([actual]);
  datosCarolina.forEach(r=>{
    const f=parseFechaFlexible(r.fecha);
    if(f) set.add(quarterKeyOf(f.year,f.month));
  });
  const claves=[...set].sort().reverse();
  const prev=sel.value;
  sel.innerHTML=claves.map(k=>`<option value="${k}">${quarterLabel(k)}</option>`).join('');
  sel.value=claves.includes(prev)?prev:actual;
}

const LOGO_DMF_PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AACCT0lEQVR42u39eZwk2V0dip/zvRGZtXT3TM8iCYHYBVgjMIvYwSDAyBYg0INuARIC8cMIMGBjDM/g91518bw8/2yQ2S3MJrPIdCNkbIExYIQMxo/NFqARYhdC26w9vdWSGfd73h/3RmRkVm5VPQPTo/vVp9U9VZlRWZGRJ77L+Z4DlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiVKlChRokSJEiUej8FyCko8KteRtOA7BACVU1SiAFaJv3xQugDinkvEJQDPuFe4cEEgVwCSiJ0LBC7g+M8tUaIAVol1YmfHcM89xL33Cru7Pu/iIQAj8frf+73BG69eDQfXrtn+4Z36gNPX/O677/Z77rlnHEhpUZolEZcuGe4tAFaiAFaJk4LU+XMOTMBDkn3BK3/6KW+7evD+lyPer9monjayzScfor7bo581aAtADTCQAMlGRAPoQOD1gfGR23R4nw7331Ifjv7k9pp//Jzr8e3f+A0vvjGFUDsy3HOJOHfOC3iVKIBVYjFQAWgzqQrAl77829/v97n9iY+o+uhrTfiAg3H9ARH1U0bVZtXUQ8S6QmOAIEDKKZS6y4oEQAMIGIBq5GAcA4c3gDi6XGP052e27PfvrPBbdxxe/5W/tfeHb/zGb/jWCYDtyIALmJfdlSiAVaIAFT7s3/70+z8Uq+d4HP/NqOZjR8PBk0b1Bg5HgrvBnRDMAQOMEmO/vsvXkwC12VEGMAlAAAwE3ACBQRhResultSetTotal(qk){
  const [yStr,qStr]=qk.split('-Q');
  const y=parseInt(yStr,10), q=parseInt(qStr,10);
  const mesesQ=[q*3-2,q*3-1,q*3];
  const {MES,ML,D,EF,BA}=computeAgg(datosCarolina);
  const keysQ=MES.filter(k=>{const [ky,km]=k.split('-').map(Number);return ky===y && mesesQ.includes(km);});
  const sum=(obj,code)=>keysQ.reduce((a,k)=>a+(obj[k]?obj[k][code]:0),0);
  const tj={v:sum(D,'tj'),e:sum(EF,'tj'),b:sum(BA,'tj')};
  const ob={v:sum(D,'ob'),e:sum(EF,'ob'),b:sum(BA,'ob')};
  const vv={v:sum(D,'vv'),e:sum(EF,'vv'),b:sum(BA,'vv')};
  const en={v:sum(D,'en'),e:sum(EF,'en'),b:sum(BA,'en')};
  const totalVentas=tj.v+ob.v+vv.v+en.v;
  const totalEfec=tj.e+ob.e+vv.e+en.e;
  const totalBanco=tj.b+ob.b+vv.b+en.b;
  // Gastos: solo guardan dÃ­a+mes (sin aÃ±o), asÃ­ que se agrupan por mes del trimestre sin distinguir aÃ±o.
  const abrPorMes=Object.keys(MESES_ABR_MAP);
  const abrsQ=mesesQ.map(m=>abrPorMes[m-1]);
  const gastosQ=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && abrsQ.includes(f.mon);});
  const totalGastos=gastosQ.reduce((a,g)=>a+g.monto,0);
  const neto=totalEfec-totalGastos;
  const metaTrimestral=META_TOTAL*3;
  const pctMeta=metaTrimestral?Math.round(totalVentas/metaTrimestral*100):0;
  const labelsQ=keysQ.map(k=>ML[MES.indexOf(k)]);
  return {y,q,mesesQ,keysQ,MES,ML,D,EF,BA,tj,ob,vv,en,totalVentas,totalEfec,totalBanco,totalGastos,neto,metaTrimestral,pctMeta,labelsQ};
}

function renderTrimestral(){
  poblarSelectorTrimestre();
  const sel=document.getElementById('tri-select');
  const qk=sel.value;
  const {keysQ,D,tj,ob,vv,en,totalVentas,totalEfec,totalBanco,totalGastos,neto,metaTrimestral,pctMeta,labelsQ}=computeTrimestralData(qk);

  document.getElementById('tri-empty').style.display=keysQ.length?'none':'block';
  document.getElementById('tri-metrics').innerHTML=`
    <div class="mc blue"><div class="ml">Ventas del trimestre</div><div class="mv">${fmt(totalVentas)}</div><div class="ms">${pctMeta}% de meta (${fmt(metaTrimestral)})</div></div>
    <div class="mc green"><div class="ml">Efectivo</div><div class="mv">${fmt(totalEfec)}</div></div>
    <div class="mc blue"><div class="ml">Banco</div><div class="mv">${fmt(totalBanco)}</div></div>
    <div class="mc red"><div class="ml">Gastos</div><div class="mv">${fmt(totalGastos)}</div></div>
    <div class="mc ${neto>=0?'green':'red'}"><div class="ml">Neto (efectivo âˆ’ gastos)</div><div class="mv">${fmt(neto)}</div></div>`;

  const cls=[{n:'Plaza del Zapato',c:'Tijuana',s:'blue',d:tj},{n:'ObregÃ³n',c:'Mexicali',s:'green',d:ob},{n:'Villa Verde',c:'Mexicali',s:'amber',d:vv},{n:'Ensenada',c:'Ensenada',s:'purple',d:en}];
  document.getElementById('tri-clinicas').innerHTML=cls.map(cl=>{
    const pct=META_CLINICA?Math.round(cl.d.v/(META_CLINICA*3)*100):0;
    const badge=pct>=100?'ok':pct>=70?'par':'no';
    return`<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">ðŸ“</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${pct}%</span></div><div class="sr"><span class="sl">Ventas</span><span class="sv">${fmt(cl.d.v)}</span></div><div class="sr"><span class="sl">Efectivo</span><span class="sv g">${fmt(cl.d.e)}</span></div><div class="sr"><span class="sl">Banco</span><span class="sv b">${fmt(cl.d.b)}</span></div><div class="sr"><span class="sl">Meta trimestral</span><span class="sv">${fmt(META_CLINICA*3)}</span></div></div>`;
  }).join('');

  if(chTrimestral) chTrimestral.destroy();
  const dlBarTop={anchor:'end',align:'top',color:'#3A4150',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const maxQ=Math.max(1,...keysQ.flatMap(k=>[D[k].tj,D[k].ob,D[k].vv,D[k].en]));
  const baseQ={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}},scales:{x:{ticks:{font:{size:11}}},y:{max:maxQ*1.35,ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}};
  chTrimestral=new Chart(document.getElementById('cTrimestral'),{type:'bar',data:{labels:labelsQ.length?labelsQ:['Sin datos'],datasets:[
    {label:'Plaza del Zapato',data:keysQ.map(k=>D[k].tj),backgroundColor:'#185FA5',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'ObregÃ³n',data:keysQ.map(k=>D[k].ob),backgroundColor:'#3B6D11',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'Villa Verde',data:keysQ.map(k=>D[k].vv),backgroundColor:'#EF9F27',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'Ensenada',data:keysQ.map(k=>D[k].en),backgroundColor:'#534AB7',borderRadius:4,borderSkipped:false,datalabels:dlBarTop}
  ]},options:{...baseQ,layout:{padding:{top:34}}}});
}

function csvEscape(v){
  const s=String(v==null?'':v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}

function descargarTrimestre(){
  const sel=document.getElementById('tri-select');
  const qk=sel.value;
  const [yStr,qStr]=qk.split('-Q');
  const y=parseInt(yStr,10), q=parseInt(qStr,10);
  const mesesQ=[q*3-2,q*3-1,q*3];
  const filas=datosCarolina.filter(r=>{const f=parseFechaFlexible(r.fecha);return f && f.year===y && mesesQ.includes(f.month);});

  const abrPorMes=Object.keys(MESES_ABR_MAP);
  const abrsQ=mesesQ.map(m=>abrPorMes[m-1]);
  const filasGastos=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && abrsQ.includes(f.mon);});

  let csv='REPORTE TRIMESTRAL Â· '+quarterLabel(qk)+'\r\n\r\n';
  csv+='VENTAS\r\n';
  csv+=['Fecha','ClÃ­nica','Venta','Banco','Efectivo','Capturado','Nota'].map(csvEscape).join(',')+'\r\n';
  filas.forEach(r=>{csv+=[r.fecha,r.clinica,r.venta,r.banco,r.efec,r.capturado,r.nota].map(csvEscape).join(',')+'\r\n';});
  csv+='\r\nGASTOS\r\n';
  csv+=['Fecha','Concepto','CategorÃ­a','Monto','Registrado por'].map(csvEscape).join(',')+'\r\n';
  filasGastos.forEach(g=>{csv+=[g.fecha,g.concepto,g.cat,g.monto,g.quien].map(csvEscape).join(',')+'\r\n';});

  const totalVentas=filas.reduce((a,x)=>a+(x.venta||0),0);
  const totalEfec=filas.reduce((a,x)=>a+(x.efec||0),0);
  const totalBanco=filas.reduce((a,x)=>a+(x.banco||0),0);
  const totalGastos=filasGastos.reduce((a,g)=>a+(g.monto||0),0);
  csv+='\r\nRESUMEN\r\n';
  csv+='Ventas totales,'+totalVentas+'\r\n';
  csv+='Efectivo total,'+totalEfec+'\r\n';
  csv+='Banco total,'+totalBanco+'\r\n';
  csv+='Gastos totales,'+totalGastos+'\r\n';
  csv+='Neto (efectivo - gastos),'+(totalEfec-totalGastos)+'\r\n';

  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='reporte_'+qk+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function descargarDashboardTrimestral(){
  const btn=document.getElementById('btn-tri-pdf');
  const origText=btn.textContent;
  btn.disabled=true;
  btn.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg> Generando...';
  try{
    const sel=document.getElementById('tri-select');
    const qk=sel.value;
    const data=computeTrimestralData(qk);
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'pt',format:'a4'});
    const pageW=doc.internal.pageSize.getWidth();
    const pageH=doc.internal.pageSize.getHeight();
    const margin=40;

    function drawHeader(){
      doc.setFillColor(24,95,165);
      doc.rect(0,0,pageW,68,'F');
      const logoSize=42;
      doc.addImage(LOGO_DMF_PNG,'PNG',margin,13,logoSize,logoSize);
      const textX=margin+logoSize+12;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(17);
      doc.text('Dental+FÃ¡cil',textX,30);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Trimestral Â· '+quarterLabel(qk),textX,48);
      doc.setFontSize(9);
      const hoyGen=new Date();
      doc.text('Generado el '+hoyGen.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}),pageW-margin,48,{align:'right'});
      doc.setTextColor(26,36,51);
    }
    drawHeader();

    let y=100;
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.text('Resumen del trimestre',margin,y);
    y+=10;

    doc.autoTable({
      startY:y,
      margin:{left:margin,right:margin},
      head:[['Indicador','Valor']],
      body:[
        ['Ventas del trimestre',fmt(data.totalVentas)+'   ('+data.pctMeta+'% de meta: '+fmt(data.metaTrimestral)+')'],
        ['Efectivo',fmt(data.totalEfec)],
        ['Banco',fmt(data.totalBanco)],
        ['Gastos',fmt(data.totalGastos)],
        ['Neto (efectivo âˆ’ gastos)',fmt(data.neto)]
      ],
      theme:'grid',
      headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
      styles:{fontSize:10,cellPadding:6,textColor:[26,36,51]},
      columnStyles:{0:{fontStyle:'bold',cellWidth:190}}
    });

    y=doc.lastAutoTable.finalY+26;
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.text('DesempeÃ±o por clÃ­nica',margin,y);
    y+=10;

    const cls=[
      {n:'Plaza del Zapato',c:'Tijuana',d:data.tj},
      {n:'ObregÃ³n',c:'Mexicali',d:data.ob},
      {n:'Villa Verde',c:'Mexicali',d:data.vv},
      {n:'Ensenada',c:'Ensenada',d:data.en}
    ];
    const metaCl=META_CLINICA*3;
    doc.autoTable({
      startY:y,
      margin:{left:margin,right:margin},
      head:[['ClÃ­nica','Ciudad','Ventas','Efectivo','Banco','% Meta trim.']],
      body:cls.map(cl=>{
        const pct=metaCl?Math.round(cl.d.v/metaCl*100):0;
        return [cl.n,cl.c,fmt(cl.d.v),fmt(cl.d.e),fmt(cl.d.b),pct+'%'];
      }),
      theme:'grid',
      headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
      styles:{fontSize:9.5,cellPadding:6,textColor:[26,36,51]}
    });

    y=doc.lastAutoTable.finalY+26;
    if(y>pageH-140){doc.addPage();y=40;}
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.text('Ventas por mes',margin,y);
    y+=10;

    const mesesRows=data.keysQ.map((k,i)=>{
      const m=data.D[k];
      const total=m.tj+m.ob+m.vv+m.en;
      return [data.labelsQ[i],fmt(m.tj),fmt(m.ob),fmt(m.vv),fmt(m.en),fmt(total)];
    });
    doc.autoTable({
      startY:y,
      margin:{left:margin,right:margin},
      head:[['Mes','Plaza del Zapato','ObregÃ³n','Villa Verde','Ensenada','Total']],
      body:mesesRows.length?mesesRows:[['Sin datos','-','-','-','-','-']],
      theme:'grid',
      headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
      styles:{fontSize:9,cellPadding:5,textColor:[26,36,51]},
      foot:mesesRows.length?[['Total trimestre',fmt(data.tj.v),fmt(data.ob.v),fmt(data.vv.v),fmt(data.en.v),fmt(data.totalVentas)]]:undefined,
      footStyles:{fillColor:[230,241,251],textColor:[26,36,51],fontStyle:'bold'}
    });

    // NumeraciÃ³n de pÃ¡ginas
    const pageCount=doc.internal.getNumberOfPages();
    for(let p=1;p<=pageCount;p++){
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120,130,145);
      doc.text('Dental+FÃ¡cil Â· Reporte Trimestral Â· '+quarterLabel(qk)+' Â· PÃ¡gina '+p+' de '+pageCount,pageW/2,pageH-16,{align:'center'});
    }

    doc.save('dashboard_trimestral_'+qk+'.pdf');
  }catch(err){
    alert('No se pudo generar el PDF: '+err.message);
  }finally{
    btn.disabled=false;
    btn.textContent=origText;
  }
}

function computeProyeccion(){
  const {MES,D}=computeAgg(datosCarolina);
  const nMeses=Math.min(3,MES.length);
  const ultimos=MES.slice(-nMeses);
  const porClinica=CLINICAS_META.map(cl=>{
    const vals=ultimos.map(m=>(D[m]&&D[m][cl.code])||0);
    const prom=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const pct=cl.meta?Math.round(prom/cl.meta*100):0;
    return {...cl,proj:prom,pct};
  });
  const totalProj=porClinica.reduce((a,c)=>a+c.proj,0);
  const tv=datosCarolina.reduce((a,x)=>a+x.venta,0);
  const te=datosCarolina.reduce((a,x)=>a+x.efec,0);
  const tb=datosCarolina.reduce((a,x)=>a+x.banco,0);
  const ratioEf=tv?te/tv:0;
  const ratioB=tv?tb/tv:0;
  const efecEst=totalProj*ratioEf;
  const bancoEst=totalProj*ratioB;
  const gastosEst=gastos.filter(esGastoMesActual).reduce((a,g)=>a+g.monto,0);
  return {porClinica,totalProj,efecEst,bancoEst,gastosEst,tieneDatos:nMeses>0};
}

function renderProyeccion(){
  const p=computeProyeccion();
  const pctTotal=Math.round(p.totalProj/META_TOTAL*100);
  document.getElementById('pj-ventas').textContent=fmt(p.totalProj);
  document.getElementById('pj-pct').textContent=(p.tieneDatos?pctTotal:0)+'% de meta ('+fmt(META_TOTAL)+')';
  document.getElementById('pj-efec').textContent=fmt(p.efecEst);
  document.getElementById('pj-banco').textContent=fmt(p.bancoEst);
  document.getElementById('pj-gastos').textContent=fmt(p.gastosEst);

  document.getElementById('pj-clinicas').innerHTML=p.porClinica.map(cl=>{
    const badge=cl.pct>=100?'ok':cl.pct>=70?'par':'no';
    const falta=Math.max(0,cl.meta-cl.proj);
    const faltaTxt=falta>0?fmt(falta):'Â¡Meta cumplida! ðŸŽ‰';
    const faltaColor=falta>0?'#A32D2D':'#3B6D11';
    return`<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">ðŸ“</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${cl.pct}%</span></div><div class="sr"><span class="sl">ProyecciÃ³n</span><span class="sv" style="color:${cl.color}">${fmt(cl.proj)}</span></div><div class="sr"><span class="sl">Meta</span><span class="sv">${fmt(cl.meta)}</span></div><div class="sr"><span class="sl">Falta para meta</span><span class="sv" style="color:${faltaColor};font-weight:700">${faltaTxt}</span></div></div>`;
  }).join('');

  const warnEl=document.getElementById('pj-note-warn');
  const okEl=document.getElementById('pj-note-ok');
  if(!p.tieneDatos || p.porClinica.every(c=>c.proj===0)){
    warnEl.style.display='none';
    okEl.style.display='none';
  } else {
    const peor=p.porClinica.reduce((a,b)=>b.pct<a.pct?b:a);
    const mejor=p.porClinica.reduce((a,b)=>b.pct>a.pct?b:a);
    warnEl.style.display='block';
    warnEl.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> '+peor.n+' requiere atenciÃ³n prioritaria ('+peor.pct+'% de meta proyectado).';
    okEl.style.display='block';
    okEl.textContent='âœ“ '+mejor.n+' es la mÃ¡s cercana a cumplir su meta individual ('+mejor.pct+'%).';
  }

  renderProyChart(p);
}

function actualizarNeto(){
  const te=datosCarolina.reduce((a,x)=>a+x.efec,0);
  const tb=datosCarolina.reduce((a,x)=>a+x.banco,0);
  const tg=gastos.filter(esGastoMesActual).reduce((a,g)=>a+g.monto,0);
  const ing=te+tb;
  const neto=ing-tg;
  document.getElementById('n-ef').textContent=fmt(te);
  document.getElementById('n-banco').textContent=fmt(tb);
  document.getElementById('n-ing').textContent=fmt(ing);
  document.getElementById('n-g').textContent=fmt(tg);
  document.getElementById('n-neto').textContent=fmt(neto);
  document.getElementById('n-neto').style.color=neto>=0?'var(--green)':'var(--red)';
  document.getElementById('neto-box').className='neto-box '+(neto>=0?'pos':'neg');
}

function renderGastos(){
  const list=document.getElementById('gastos-list');
  const gastosMes=gastos.filter(esGastoMesActual);
  list.innerHTML=gastosMes.length?gastosMes.map((g,i)=>`<div class="gasto-row"><div class="ginfo"><div class="gconc">${g.concepto}</div><div class="gcat">${g.cat}</div><div class="gasto-quien">ðŸ‘¤ ${g.quien} Â· ${g.fecha}</div></div><div style="display:flex;align-items:center;gap:8px"><div class="gmonto">${fmt(g.monto)}</div><button class="gdel" onclick="eliminarGasto(${gastos.indexOf(g)})">âœ•</button></div></div>`).join(''):'<div class="empty" style="padding:16px">Sin gastos registrados este mes.</div>';
  const total=gastosMes.reduce((a,g)=>a+g.monto,0);
  document.getElementById('total-g').textContent=fmt(total);
  actualizarNeto();
}

function toggleGasto(){const f=document.getElementById('add-form');f.style.display=f.style.display==='none'?'block':'none';toggleClinicaDeuda();}

function parseFechaGasto(str){
  // Los gastos guardan la fecha como "13 jul" (dÃ­a + mes abreviado en espaÃ±ol), no como dd/mm/aaaa.
  if(!str) return null;
  const s=String(str).trim().toLowerCase().replace(/\./g,'');
  const parts=s.split(/\s+/);
  if(parts.length<2) return null;
  const day=parseInt(parts[0],10);
  const mon=parts[1].slice(0,3);
  if(!MESES_ABR_MAP[mon]) return null;
  return {day,mon,monName:MESES_ABR_MAP[mon]};
}

function esGastoMesActual(g){
  const f=parseFechaGasto(g.fecha);
  if(!f) return false;
  const abrActual=Object.keys(MESES_ABR_MAP)[new Date().getMonth()];
  return f.mon===abrActual;
}

function renderDeuda(){
  const norm=s=>String(s||'').toLowerCase();
  const reembolsos=gastos.filter(g=>g.cat==='Reembolso deuda');
  let abonoTj=0,abonoObr=0,abonoVv=0,abonoEns=0;
  reembolsos.forEach(g=>{
    const c=norm(g.concepto);
    if(c.includes('tijuana')||c.includes('plaza del zapato')||c.includes('zapato')) abonoTj+=g.monto;
    else if(c.includes('villa verde')||c.includes('rio verde')) abonoVv+=g.monto;
    else if(c.includes('obregon')||c.includes('obregÃ³n')) abonoObr+=g.monto;
    else if(c.includes('ensenada')) abonoEns+=g.monto;
  });
  const totalAbonado=abonoTj+abonoObr+abonoVv+abonoEns;
  document.getElementById('dd-tj').textContent=fmt(abonoTj);
  document.getElementById('dd-obr').textContent=fmt(abonoObr);
  document.getElementById('dd-vv').textContent=fmt(abonoVv);
  document.getElementById('dd-ens').textContent=fmt(abonoEns);
  document.getElementById('dd-tj-val').textContent=fmt(abonoTj);
  document.getElementById('dd-obr-val').textContent=fmt(abonoObr);
  document.getElementById('dd-vv-val').textContent=fmt(abonoVv);
  document.getElementById('dd-ens-val').textContent=fmt(abonoEns);

  const ddTotal=document.getElementById('dd-total');
  const ddPend=document.getElementById('dd-pend');
  const ddPendVal=document.getElementById('dd-pend-val');

  if(DEUDA_TOTAL!=null){
    const pendiente=Math.max(0,DEUDA_TOTAL-totalAbonado);
    const pctTj=DEUDA_TOTAL?Math.round(abonoTj/DEUDA_TOTAL*100):0;
    const pctObr=DEUDA_TOTAL?Math.round(abonoObr/DEUDA_TOTAL*100):0;
    const pctVv=DEUDA_TOTAL?Math.round(abonoVv/DEUDA_TOTAL*100):0;
    const pctEns=DEUDA_TOTAL?Math.round(abonoEns/DEUDA_TOTAL*100):0;
    const pctPend=DEUDA_TOTAL?Math.round(pendiente/DEUDA_TOTAL*100):0;
    ddTotal.textContent=fmt(DEUDA_TOTAL);ddTotal.style.color='';ddTotal.style.fontSize='';
    ddPend.textContent=fmt(pendiente);ddPend.style.color='';ddPend.style.fontSize='';
    ddPendVal.textContent=fmt(pendiente);
    document.getElementById('dd-tj-lbl').textContent='Plaza del Zapato Â· '+pctTj+'%';
    document.getElementById('dd-obr-lbl').textContent='ObregÃ³n Â· '+pctObr+'%';
    document.getElementById('dd-vv-lbl').textContent='Villa Verde Â· '+pctVv+'%';
    document.getElementById('dd-ens-lbl').textContent='Ensenada Â· '+pctEns+'%';
    document.getElementById('dd-pend-lbl').textContent='Pendiente Â· '+pctPend+'%';
    document.getElementById('dd-tj-bar').style.width=Math.min(100,pctTj)+'%';
    document.getElementById('dd-obr-bar').style.width=Math.min(100,pctObr)+'%';
    document.getElementById('dd-vv-bar').style.width=Math.min(100,pctVv)+'%';
    document.getElementById('dd-ens-bar').style.width=Math.min(100,pctEns)+'%';
    document.getElementById('dd-pend-bar').style.width=Math.min(100,pctPend)+'%';
    document.getElementById('dd-note').style.display='none';
  } else {
    ddTotal.textContent='ðŸ” Por definir';
    ddPend.textContent='ðŸ” Por definir';
    ddPendVal.textContent='ðŸ” Por definir';
    const pctTj=totalAbonado?Math.round(abonoTj/totalAbonado*100):0;
    const pctObr=totalAbonado?Math.round(abonoObr/totalAbonado*100):0;
    const pctVv=totalAbonado?Math.round(abonoVv/totalAbonado*100):0;
    const pctEns=totalAbonado?Math.round(abonoEns/totalAbonado*100):0;
    document.getElementById('dd-tj-lbl').textContent='Plaza del Zapato Â· '+pctTj+'% de lo abonado';
    document.getElementById('dd-obr-lbl').textContent='ObregÃ³n Â· '+pctObr+'% de lo abonado';
    document.getElementById('dd-vv-lbl').textContent='Villa Verde Â· '+pctVv+'% de lo abonado';
    document.getElementById('dd-ens-lbl').textContent='Ensenada Â· '+pctEns+'% de lo abonado';
    document.getElementById('dd-pend-lbl').textContent='Pendiente';
    document.getElementById('dd-tj-bar').style.width=pctTj+'%';
    document.getElementById('dd-obr-bar').style.width=pctObr+'%';
    document.getElementById('dd-vv-bar').style.width=pctVv+'%';
    document.getElementById('dd-ens-bar').style.width=pctEns+'%';
    document.getElementById('dd-pend-bar').style.width='0%';
    document.getElementById('dd-note').style.display='block';
  }

  const ahorros=gastos.filter(g=>g.cat==='Ahorro');
  const porMes={},orden=[];
  ahorros.forEach(g=>{
    const f=parseFechaGasto(g.fecha);
    if(!f) return;
    if(!(f.mon in porMes)){porMes[f.mon]=0;orden.push(f.mon);}
    porMes[f.mon]+=g.monto;
  });
  const mesesOrden=Object.keys(MESES_ABR_MAP);
  orden.sort((a,b)=>mesesOrden.indexOf(a)-mesesOrden.indexOf(b));
  const totalAhorrado=ahorros.reduce((a,g)=>a+g.monto,0);
  const wrap=document.getElementById('dd-ahorro');
  if(!orden.length){
    wrap.innerHTML='<div class="empty" style="padding:16px">AÃºn no hay ahorro registrado.</div>';
  } else {
    wrap.innerHTML=orden.map(m=>`<div class="mc green"><div class="ml">${MESES_ABR_MAP[m]}</div><div class="mv">${fmt(porMes[m])}</div></div>`).join('')
      +`<div class="mc blue"><div class="ml">Total ahorrado</div><div class="mv">${fmt(totalAhorrado)}</div></div>`;
  }
}


function toggleClinicaDeuda(){
  const cat=document.getElementById('g-cat').value;
  document.getElementById('g-clinica-wrap').style.display = cat==='Reembolso deuda' ? 'block' : 'none';
}

async function agregarGasto(){
  let c=document.getElementById('g-con').value.trim();
  const m=parseFloat(document.getElementById('g-mon').value)||0;
  const k=document.getElementById('g-cat').value;
  const q=document.getElementById('g-quien').value;
  if(k==='Reembolso deuda'){
    const cl=document.getElementById('g-clinica').value;
    if(!cl){alert('Selecciona a quÃ© clÃ­nica corresponde el abono.');return;}
    c = c ? (cl+' - '+c) : ('Abono deuda '+cl);
  }
  if(!c||!m){alert('Ingresa concepto y monto.');return;}
  const hoy=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short'});
  const btn=document.querySelector('#add-form .btn')||null;
  try{
    const res=await fetch(SHEET_URL,{method:'POST',body:JSON.stringify({action:'add',concepto:c,monto:m,cat:k,quien:q,fecha:hoy})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'No se pudo guardar');
    document.getElementById('g-con').value='';
    document.getElementById('g-mon').value='';
    document.getElementById('g-clinica').value='';
    syncCustomSelect('g-clinica');
    document.getElementById('g-clinica-wrap').style.display='none';
    document.getElementById('add-form').style.display='none';
    await cargarDatos();
  } catch(err){
    alert('No se pudo guardar el gasto: '+err.message);
  }
}

async function eliminarGasto(i){
  const g=gastos[i];
  if(!g || !g.id) return;
  try{
    const res=await fetch(SHEET_URL,{method:'POST',body:JSON.stringify({action:'delete',id:g.id})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'No se pudo eliminar');
    await cargarDatos();
  } catch(err){
    alert('No se pudo eliminar el gasto: '+err.message);
  }
}

function parseFechaFlexible(str){
  if(!str) return null;
  const s=String(str).trim();
  let parts;
  if(s.includes('/')) parts=s.split('/');
  else if(s.includes('-')) parts=s.split('-');
  else return null;
  if(parts.length!==3) return null;
  const nums=parts.map(p=>parseInt(p,10));
  let day,month,year;
  if(String(nums[0]).length===4){ [year,month,day]=nums; }
  else { [day,month,year]=nums; } // formato mexicano dd/mm/yyyy
  if(!year||!month) return null;
  if(year<100) year+=2000;
  return {year,month,day};
}

function computeAgg(datos){
  const claves={
    'Tijuana ,Plaza del Zapato':'tj',
    'Mexicali, Av Alvaro Obregon 771':'ob',
    'Mexicali, Rio verde 631':'vv',
    'Ensenada, Av Ruiz 631':'en'
  };
  const nombresMes=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const D={},EF={},BA={};
  const hoy=new Date();
  datos.forEach(r=>{
    const code=claves[r.clinica];
    if(!code) return;
    const f=parseFechaFlexible(r.fecha);
    if(!f) return;
    const key=f.year+'-'+String(f.month).padStart(2,'0');
    if(!D[key]) D[key]={tj:0,ob:0,vv:0,en:0};
    if(!EF[key]) EF[key]={tj:0,ob:0,vv:0,en:0};
    if(!BA[key]) BA[key]={tj:0,ob:0,vv:0,en:0};
    D[key][code]+=r.venta||0;
    EF[key][code]+=r.efec||0;
    BA[key][code]+=r.banco||0;
  });
  const keys=Object.keys(D).sort();
  const ML=keys.map(k=>{
    const [y,m]=k.split('-').map(Number);
    const esMesActual=(y===hoy.getFullYear()&&m===(hoy.getMonth()+1));
    return nombresMes[m-1]+(esMesActual?'*':'');
  });
  const TOT={};
  keys.forEach(k=>{TOT[k]=D[k].tj+D[k].ob+D[k].vv+D[k].en;});
  return {MES:keys,ML,D,EF,BA,TOT};
}

if(window.ChartDataLabels){ Chart.register(ChartDataLabels); Chart.defaults.set('plugins.datalabels',{display:false}); }

const CLINICA_COLOR={'Plaza del Zapato':'#185FA5','ObregÃ³n':'#3B6D11','Villa Verde':'#EF9F27','Ensenada':'#534AB7'};

let chMetas=null,chAnual=null,chEfec=null,chMetasPie=null,chEfecPie=null,chTrimestral=null;

const pieCalloutsPlugin={
  id:'pieCallouts',
  afterDraw(chart){
    if(chart.config.type!=='pie') return;
    const meta=chart.getDatasetMeta(0);
    const arcs=meta.data;
    if(!arcs||!arcs.length) return;
    const ds=chart.data.datasets[0];
    const items=arcs.map((arc,i)=>({arc,i,value:ds.data[i],label:chart.data.labels[i],color:ds.backgroundColor[i]})).filter(it=>it.value>0);
    if(!items.length) return;
    const total=items.reduce((a,b)=>a+b.value,0);
    const cx=arcs[0].x, cy=arcs[0].y, outerR=arcs[0].outerRadius;
    const {ctx,chartArea}=chart;
    const left=[], right=[];
    items.forEach(it=>{
      const mid=(it.arc.startAngle+it.arc.endAngle)/2;
      it.px=cx+Math.cos(mid)*outerR;
      it.py=cy+Math.sin(mid)*outerR;
      (Math.cos(mid)>=0?right:left).push(it);
    });
    const gap=32;
    function layout(side,isRight){
      const n=side.length; if(!n) return;
      side.sort((a,b)=>a.py-b.py);
      const totalH=(n-1)*gap;
      let startY=Math.max(chartArea.top+16,Math.min(cy-totalH/2,chartArea.bottom-16-totalH));
      side.forEach((it,idx)=>{ it.lx=isRight?(cx+outerR+52):(cx-outerR-52); it.ly=startY+idx*gap; });
    }
    layout(left,false); layout(right,true);
    ctx.save();
    ctx.font='700 12px system-ui,-apple-system,sans-serif';
    [...left,...right].forEach(it=>{
      const isRight=right.includes(it);
      const pct=Math.round(it.value/total*100);
      const text=it.label+'  '+pct+'%';
      const elbowX=it.lx+(isRight?-20:20);
      ctx.strokeStyle=it.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(it.px,it.py); ctx.lineTo(elbowX,it.ly); ctx.lineTo(it.lx,it.ly); ctx.stroke();
      ctx.beginPath(); ctx.arc(it.px,it.py,3,0,Math.PI*2); ctx.fillStyle=it.color; ctx.fill();
      const tw=ctx.measureText(text).width, padX=10, boxH=24;
      let boxW=tw+padX*2;
      let boxX=isRight?it.lx:it.lx-boxW, boxY=it.ly-boxH/2, r=8;
      const margin=4;
      if(boxX<margin){ boxX=margin; }
      if(boxX+boxW>chart.width-margin){ boxX=chart.width-margin-boxW; }
      if(boxX<margin){ boxW=chart.width-margin*2; boxX=margin; }
      ctx.beginPath();
      ctx.moveTo(boxX+r,boxY);
      ctx.arcTo(boxX+boxW,boxY,boxX+boxW,boxY+boxH,r);
      ctx.arcTo(boxX+boxW,boxY+boxH,boxX,boxY+boxH,r);
      ctx.arcTo(boxX,boxY+boxH,boxX,boxY,r);
      ctx.arcTo(boxX,boxY,boxX+boxW,boxY,r);
      ctx.closePath();
      ctx.fillStyle='#fff'; ctx.fill();
      ctx.strokeStyle=it.color; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#22262E'; ctx.textBaseline='middle'; ctx.textAlign='left';
      ctx.fillText(text,boxX+padX,boxY+boxH/2+0.5);
    });
    ctx.restore();
  }
};

function renderPie(canvasId,valores,prevChartRef){
  const nombres=['Plaza del Zapato','ObregÃ³n','Villa Verde','Ensenada'];
  const colores=nombres.map(n=>CLINICA_COLOR[n]);
  const total=valores.reduce((a,b)=>a+b,0);
  if(prevChartRef) prevChartRef.destroy();
  const el=document.getElementById(canvasId);
  if(!el) return null;
  return new Chart(el,{type:'pie',data:{labels:nombres,datasets:[{data:valores,backgroundColor:colores,borderColor:'#fff',borderWidth:2}]},
    plugins:[pieCalloutsPlugin],
    options:{
      responsive:true,maintainAspectRatio:false,
      layout:{padding:{left:150,right:150,top:24,bottom:24}},
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>c.label+': '+fmt(c.parsed)+(total>0?' ('+Math.round(c.parsed/total*100)+'%)':'')}},
        datalabels:{display:false}
      }
    }
  });
}

function renderCharts(){
  const {MES,ML,D,EF,TOT}=computeAgg(datosCarolina);
  const META=META_TOTAL;
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}};

  if(MES.length===0){
    document.getElementById('pct-wrap').innerHTML='<div class="empty" style="padding:16px">AÃºn no hay registros para calcular cumplimiento.</div>';
    return;
  }

  if(chMetas) chMetas.destroy();
  const dlBar={anchor:'center',align:'center',color:'#fff',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const dlBarTop={anchor:'end',align:'top',color:'#3A4150',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const maxMetasVal=Math.max(1,META,...MES.flatMap(m=>[D[m].tj,D[m].ob,D[m].vv,D[m].en]));
  chMetas=new Chart(document.getElementById('cMetas'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>D[m].tj),backgroundColor:'#185FA5',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'ObregÃ³n',data:MES.map(m=>D[m].ob),backgroundColor:'#3B6D11',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>D[m].vv),backgroundColor:'#EF9F27',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>D[m].en),backgroundColor:'#534AB7',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Meta',type:'line',data:MES.map(()=>META),borderColor:'#E24B4A',borderWidth:2,borderDash:[6,4],pointRadius:0,fill:false,order:0,datalabels:{display:false}}]},options:{...base,layout:{padding:{top:34}},scales:{x:{ticks:{font:{size:11}}},y:{max:maxMetasVal*1.35,ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}}});

  const ultimoMes=MES[MES.length-1];
  if(chMetasPie) chMetasPie.destroy();
  chMetasPie=ultimoMes?renderPie('cMetasPie',[D[ultimoMes].tj,D[ultimoMes].ob,D[ultimoMes].vv,D[ultimoMes].en]):null;

  document.getElementById('pct-wrap').innerHTML=MES.map((m,i)=>{const p=Math.min(100,Math.round((TOT[m]||0)/META*100));return`<div style="margin-bottom:12px"><div class="plb"><span>${ML[i]}</span><span style="font-weight:700;color:${bc(p)}">${p}% Â· ${fmt(TOT[m])}</span></div><div class="pbg"><div class="pf" style="width:${p}%;background:${bc(p)}"></div></div></div>`;}).join('');

  if(chAnual) chAnual.destroy();
  const maxAnual=Math.max(1,...MES.flatMap(m=>[D[m].tj,D[m].ob,D[m].vv,D[m].en]));
  chAnual=new Chart(document.getElementById('cAnual'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>D[m].tj),backgroundColor:'#185FA5',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'ObregÃ³n',data:MES.map(m=>D[m].ob),backgroundColor:'#3B6D11',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>D[m].vv),backgroundColor:'#EF9F27',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>D[m].en),backgroundColor:'#534AB7',borderRadius:2,borderSkipped:false,datalabels:dlBarTop}]},options:{...base,layout:{padding:{top:34}},scales:{...base.scales,y:{...base.scales.y,suggestedMax:maxAnual*1.3}}}});

  if(chEfec) chEfec.destroy();
  const maxEfec=Math.max(1,...MES.flatMap(m=>[EF[m].tj,EF[m].ob,EF[m].vv,EF[m].en]));
  chEfec=new Chart(document.getElementById('cEfec'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>EF[m].tj),backgroundColor:'#185FA5',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'ObregÃ³n',data:MES.map(m=>EF[m].ob),backgroundColor:'#3B6D11',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>EF[m].vv),backgroundColor:'#EF9F27',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>EF[m].en),backgroundColor:'#534AB7',borderRadius:2,borderSkipped:false,datalabels:dlBarTop}]},options:{...base,layout:{padding:{top:34}},scales:{...base.scales,y:{...base.scales.y,suggestedMax:maxEfec*1.3}}}});

  if(chEfecPie) chEfecPie.destroy();
  chEfecPie=ultimoMes?renderPie('cEfecPie',[EF[ultimoMes].tj,EF[ultimoMes].ob,EF[ultimoMes].vv,EF[ultimoMes].en]):null;
}

function buildCharts(){
  if(chartsBuilt)return;chartsBuilt=true;
  // La grÃ¡fica de ProyecciÃ³n (cProy) se construye con datos reales en renderProyChart(),
  // llamada desde renderProyeccion() cada vez que se cargan datos.
}

let chProy=null;
function renderProyChart(p){
  const {MES,ML,TOT}=computeAgg(datosCarolina);
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}};
  const labels=[...ML,'PrÃ³x. mes (proj.)'];
  const real=MES.map(m=>TOT[m]);
  const proyLine=labels.map((_,i)=>i===labels.length-2?TOT[MES[MES.length-1]]:(i===labels.length-1?p.totalProj:null));
  if(chProy) chProy.destroy();
  const proyLabelBg={backgroundColor:'rgba(255,255,255,.92)',borderRadius:5,padding:{top:3,bottom:3,left:6,right:6}};
  chProy=new Chart(document.getElementById('cProy'),{type:'line',data:{labels,datasets:[
    {label:'Real',data:[...real,null],borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,.07)',fill:true,tension:.3,pointRadius:6,pointBackgroundColor:'#185FA5',
      datalabels:{align:'top-right',anchor:'center',offset:6,clamp:true,color:'#185FA5',font:{weight:'700',size:11},...proyLabelBg,borderColor:'#185FA5',borderWidth:1,display:c=>c.dataset.data[c.dataIndex]!=null,formatter:v=>fmt(v)}},
    {label:'ProyecciÃ³n',data:proyLine,borderColor:'#534AB7',borderDash:[6,4],backgroundColor:'rgba(83,74,183,.07)',fill:true,tension:.3,pointRadius:6,pointBackgroundColor:'#534AB7',
      datalabels:{align:'top-left',anchor:'center',offset:6,clamp:true,color:'#534AB7',font:{weight:'700',size:11},...proyLabelBg,borderColor:'#534AB7',borderWidth:1,display:c=>c.dataIndex===labels.length-1&&c.dataset.data[c.dataIndex]!=null,formatter:v=>['Proyectado',fmt(v)]}},
    {label:'Meta',data:labels.map(()=>META_TOTAL),borderColor:'#E24B4A',borderDash:[3,3],pointRadius:0,fill:false,borderWidth:2,
      datalabels:{align:'bottom',anchor:'center',offset:6,clamp:true,color:'#E24B4A',font:{weight:'700',size:11},...proyLabelBg,borderColor:'#E24B4A',borderWidth:1,display:c=>c.dataIndex===Math.floor(labels.length/2),formatter:v=>'Meta '+fmt(v)}}
  ]},options:{...base,layout:{padding:{top:26,right:70,left:10,bottom:10}},plugins:{...base.plugins,tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}}}});
}

/* ---- Inicializar los selectores personalizados de toda la app ---- */
buildCustomSelect('f-cl',{kind:'dot',colorMap:{
  '':'#C7CDD6','__todas__':'#5B6678',
  'Tijuana ,Plaza del Zapato':'#185FA5',
  'Mexicali, Av Alvaro Obregon 771':'#3B6D11',
  'Mexicali, Rio verde 631':'#EF9F27',
  'Ensenada, Av Ruiz 631':'#534AB7'
}});
const ICONOS_GASTO = {
  'Ahorro':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v4h-2zm0 6h2v2h-2z"/></svg>','Personal':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>','Operativo':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>','Otro':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
};
buildCustomSelect('g-cat',{kind:'icon',iconMap:{
  'ViÃ¡ticos':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>','Socios':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>','Transporte / Cherokee':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2" ry="2"></rect><circle cx="7" cy="19" r="2"></circle><circle cx="17" cy="19" r="2"></circle><path d="M3 11V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"></path></svg>','Reembolso deuda':'<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
  ...ICONOS_GASTO
}});
buildCustomSelect('g-clinica',{kind:'dot',colorMap:{
  '':'#C7CDD6','Plaza del Zapato':'#185FA5','ObregÃ³n':'#3B6D11','Villa Verde':'#EF9F27','Ensenada':'#534AB7'
}});
buildCustomSelect('g-quien',{kind:'avatar',avatarMap:{'Carlos':'CG','EstefanÃ­a':'EL'}});

