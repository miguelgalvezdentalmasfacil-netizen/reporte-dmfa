
window.dmfStorage = (function(){
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

let SHEET_URL = window.dmfStorage.getItem('dmf_sheet_url') || '';

function getSheetURL(){
  const saved = window.dmfStorage.getItem('dmf_sheet_url');
  if(saved) return saved;
  return '';
}

function guardarConfig(){
  const raw = document.getElementById('sheet-url-input').value.trim();
  if(!raw || !raw.startsWith('https://script.google.com/')){
    document.getElementById('config-err').style.display='block';
    document.getElementById('config-err').textContent='⚠ Pega la URL de tu Apps Script (debe empezar con https://script.google.com/ y terminar en /exec).';
    return;
  }
  SHEET_URL = raw;
  window.dmfStorage.setItem('dmf_sheet_url', SHEET_URL);
  document.getElementById('config').style.display='none';
  document.getElementById('app').style.display='block';
  cargarDatos();
  startAutoRefresh();
}

function abrirConfig(){
  const savedUrl = window.dmfStorage.getItem('dmf_sheet_url')||'';
  document.getElementById('sheet-url-input').value = savedUrl;
  document.getElementById('app').style.display='none';
  document.getElementById('config').style.display='flex';
}
const USERS={'carlos':{pwd:'dir2026',name:'Carlos',role:'Director general',init:'CG'},'estefania':{pwd:'ops2026',name:'Estefanía Longoria',role:'Directora operativa',init:'EL'}};
const fmt=v=>'$'+parseFloat(v||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmt2=v=>'$'+parseFloat(v||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const bc=p=>p>=100?'#3B6D11':p>=80?'#EF9F27':'#E24B4A';
// Meta mensual única por clínica-ciudad. Todo (Metas, Resumen, Anual, Proyección) gira
// en torno a esta cifra por clínica. La sección de Deuda NO usa esta meta.
const META_CLINICA = 361189.042;
const CLINICAS_META=[
  {k:'Tijuana ,Plaza del Zapato',n:'Plaza del Zapato',c:'Tijuana',code:'tj',s:'blue-s',color:'#185FA5',meta:META_CLINICA},
  {k:'Mexicali, Av Alvaro Obregon 771',n:'Obregón',c:'Mexicali',code:'ob',s:'green-s',color:'#3B6D11',meta:META_CLINICA},
  {k:'Mexicali, Rio verde 631',n:'Villa Verde',c:'Mexicali',code:'vv',s:'amber-s',color:'#EF9F27',meta:META_CLINICA},
  {k:'Ensenada, Av Ruiz 631',n:'Ensenada',c:'Ensenada',code:'en',s:'purple-s',color:'#534AB7',meta:META_CLINICA}
];
const META_TOTAL = META_CLINICA * CLINICAS_META.length;
// Deuda de remodelación: el monto TOTAL todavía no está definido.
// En cuanto lo tengas, cámbialo aquí (por ejemplo: const DEUDA_TOTAL = 1412000;)
// y automáticamente se calculará el pendiente y los porcentajes reales.
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
    const init=(opts.avatarMap&&opts.avatarMap[value])||'—';
    icon=`<span class="csel-avatar">${init}</span>`;
  } else if(opts.kind==='icon'){
    const ic=(opts.iconMap&&opts.iconMap[value])||'▫️';
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
  btn.innerHTML='<span class="csel-label"></span><span class="csel-arrow">▾</span>';

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

function doLogin(){
  const u=document.getElementById('l-u').value.trim().toLowerCase();
  const p=document.getElementById('l-p').value;
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
    buildCharts();
    const savedSheet = window.dmfStorage.getItem('dmf_sheet_url');
    if(!savedSheet){
      document.getElementById('login').style.display='none';
      document.getElementById('config').style.display='flex';
      document.getElementById('app').style.display='none';
    } else {
      SHEET_URL = savedSheet;
      cargarDatos();
      startAutoRefresh();
    }
  } else {document.getElementById('lerr').style.display='block';}
}
function doLogout(){
  stopAutoRefresh();
  document.getElementById('login').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('l-u').value='';
  document.getElementById('l-p').value='';
}
document.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

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
    renderDashboardMensual();
    renderGastos();
    actualizarNeto();
    renderCharts();
    renderProyeccion();
    renderDeuda();
    actualizarVerificacionEnDatos();
    document.getElementById('conn-error').style.display='none';
  } catch(err){
    console.error('Error cargando datos:',err);
    const banner = document.getElementById('conn-error');
    banner.textContent = '⚠ No se pudo conectar con el Apps Script (' + err.message + '). Reintentando…';
    banner.style.display='block';
  }
}

function actualizarCorte(){
  // Solo mes actual — el corte se reinicia cada mes
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const datosMes=datosCarolina.filter(r=>{
    const f=parseFechaFlexible(r.fecha);
    return f && f.year===anioActual && f.month===mesActual;
  });
  const tv=datosMes.reduce((a,x)=>a+x.venta,0);
  const tb=datosMes.reduce((a,x)=>a+x.banco,0);
  const te=datosMes.reduce((a,x)=>a+x.efec,0);
  const mesNombre=hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  document.querySelector('.eh-label').innerHTML='💵 Efectivo total en clínicas · '+mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1);
  document.getElementById('corte-total').textContent=fmt(te);
  document.getElementById('corte-banco').textContent=fmt(tb);
  document.getElementById('corte-ventas').textContent=fmt(tv);
  document.getElementById('corte-regs').textContent=datosMes.length+' reg. este mes';
  const cls={'Tijuana ,Plaza del Zapato':{ef:'c-tj-ef',b:'c-tj-b',v:'c-tj-v'},'Mexicali, Av Alvaro Obregon 771':{ef:'c-ob-ef',b:'c-ob-b',v:'c-ob-v'},'Mexicali, Rio verde 631':{ef:'c-vv-ef',b:'c-vv-b',v:'c-vv-v'},'Ensenada, Av Ruiz 631':{ef:'c-en-ef',b:'c-en-b',v:'c-en-v'}};
  Object.keys(cls).forEach(cl=>{
    const d=datosMes.filter(x=>x.clinica===cl);
    const ids=cls[cl];
    document.getElementById(ids.ef).textContent=fmt(d.reduce((a,x)=>a+x.efec,0));
    document.getElementById(ids.b).textContent=fmt(d.reduce((a,x)=>a+x.banco,0));
    document.getElementById(ids.v).textContent=fmt(d.reduce((a,x)=>a+x.venta,0));
  });
  actualizarPanelVerificacion();
}

function actualizarPanelVerificacion(){
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const datosMes=datosCarolina.filter(r=>{
    const f=parseFechaFlexible(r.fecha);
    return f && f.year===anioActual && f.month===mesActual;
  });
  const te=datosMes.reduce((a,x)=>a+(x.efec||0),0);
  const tb=datosMes.reduce((a,x)=>a+(x.banco||0),0);
  
  const elEfec = document.getElementById('cv-sis-efec');
  const elBanco = document.getElementById('cv-sis-banco');
  if(elEfec) {
      elEfec.textContent = fmt(te);
      elEfec.dataset.val = te;
  }
  if(elBanco) {
      elBanco.textContent = fmt(tb);
      elBanco.dataset.val = tb;
  }
  
  calcDiferencia();
  renderHistorialVerificacion();
}

function calcDiferencia(){
  const elEfec = document.getElementById('cv-sis-efec');
  const elBanco = document.getElementById('cv-sis-banco');
  if(!elEfec || !elBanco) return;

  const sisEfec = parseFloat(elEfec.dataset.val || 0);
  const sisBanco = parseFloat(elBanco.dataset.val || 0);
  
  const inEfec = document.getElementById('cv-real-efec').value;
  const inBanco = document.getElementById('cv-real-banco').value;
  
  const dBox = document.getElementById('cv-dif-box');
  if(!inEfec && !inBanco) {
    if(dBox) dBox.style.display='none';
    return;
  }
  
  if(dBox) dBox.style.display='block';
  
  const realEfec = parseFloat(inEfec || 0);
  const realBanco = parseFloat(inBanco || 0);
  
  const difEfec = realEfec - sisEfec;
  const difBanco = realBanco - sisBanco;
  
  const eBox = document.getElementById('cv-dif-efec');
  const bBox = document.getElementById('cv-dif-banco');
  
  if(eBox) {
      eBox.textContent = (difEfec > 0 ? '+' : '') + fmt(difEfec);
      eBox.style.color = difEfec === 0 ? 'var(--green)' : 'var(--red)';
  }
  if(bBox) {
      bBox.textContent = (difBanco > 0 ? '+' : '') + fmt(difBanco);
      bBox.style.color = difBanco === 0 ? 'var(--green)' : 'var(--red)';
  }
  
  if(dBox) {
      dBox.style.borderColor = (difEfec === 0 && difBanco === 0) ? 'var(--green-s)' : 'var(--red-s)';
      dBox.style.backgroundColor = (difEfec === 0 && difBanco === 0) ? 'var(--green-s)' : 'var(--red-s)';
  }
}

function marcarCorteVerificado(){
  const inEfec = document.getElementById('cv-real-efec').value;
  const inBanco = document.getElementById('cv-real-banco').value;
  if(!inEfec || !inBanco) {
    alert("Por favor ingresa los montos físicos recibidos antes de verificar.");
    return;
  }
  
  const hoy = new Date();
  const mesNombre = hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const sisEfec = parseFloat(document.getElementById('cv-sis-efec').dataset.val || 0);
  const sisBanco = parseFloat(document.getElementById('cv-sis-banco').dataset.val || 0);
  const difEfec = parseFloat(inEfec) - sisEfec;
  const difBanco = parseFloat(inBanco) - sisBanco;
  
  const nota = document.getElementById('cv-nota').value;
  
  const registro = {
    fecha: hoy.toLocaleString('es-MX'),
    mes: mesNombre,
    sisEfec: sisEfec, sisBanco: sisBanco,
    realEfec: parseFloat(inEfec), realBanco: parseFloat(inBanco),
    difEfec: difEfec, difBanco: difBanco, nota: nota
  };
  
  let hist = [];
  try {
    const raw = window.dmfStorage.getItem('verif_corte');
    if(raw) hist = JSON.parse(raw);
  } catch(e){}
  
  hist.unshift(registro); 
  window.dmfStorage.setItem('verif_corte', JSON.stringify(hist));
  
  alert("Corte de " + mesNombre + " marcado como verificado.");
  
  document.getElementById('cv-real-efec').value = '';
  document.getElementById('cv-real-banco').value = '';
  document.getElementById('cv-nota').value = '';
  calcDiferencia();
  renderHistorialVerificacion();
}

function renderHistorialVerificacion(){
  let hist = [];
  try {
    const raw = window.dmfStorage.getItem('verif_corte');
    if(raw) hist = JSON.parse(raw);
  } catch(e){}
  
  const badge = document.getElementById('corte-verificado-badge');
  const hoy = new Date();
  const mesNombre = hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const esteMes = hist.find(h => h.mes === mesNombre);
  if(badge) {
      if(esteMes) {
        badge.style.display = 'inline-block';
        badge.textContent = 'Verificado el ' + esteMes.fecha.split(',')[0];
      } else {
        badge.style.display = 'none';
      }
  }
  
  const list = document.getElementById('cv-historial');
  if(!list) return;

  if(!hist.length) {
    list.innerHTML = '<i>No hay cortes verificados aún.</i>';
    return;
  }
  
  list.innerHTML = '<h4 style="margin-bottom:8px">Historial de verificaciones</h4>' + 
    hist.map(h => {
      const ok = (h.difEfec === 0 && h.difBanco === 0);
      const color = ok ? 'var(--green)' : 'var(--red)';
      return "<div style=\"padding:10px;border-radius:8px;background:var(--card);margin-bottom:8px;border-left:4px solid " + color + "\">" +
        "<div style=\"font-weight:700;margin-bottom:4px\">" + h.mes + " <span style=\"font-weight:400;font-size:11px;color:var(--soft)\">(" + h.fecha + ")</span></div>" +
        "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px\">" +
          "<div>Sist: " + fmt(h.sisEfec) + "<br/>Real: " + fmt(h.realEfec) + "<br/><b style=\"color:" + (h.difEfec===0?'var(--green)':'var(--red)') + "\">Dif: " + fmt(h.difEfec) + "</b></div>" +
          "<div>Sist: " + fmt(h.sisBanco) + "<br/>Real: " + fmt(h.realBanco) + "<br/><b style=\"color:" + (h.difBanco===0?'var(--green)':'var(--red)') + "\">Dif: " + fmt(h.difBanco) + "</b></div>" +
        "</div>" +
        (h.nota ? "<div style=\"margin-top:6px;font-size:11px;color:var(--soft);font-style:italic\">\&"" + h.nota + "\"</div>" : '') +
      "</div>";
    }).join('');
}

function renderHistorial(){
  const cl=document.getElementById('f-cl').value;
  const list=document.getElementById('hist-list');

  const tots=document.getElementById('hist-totales');
  if(!cl){
    list.innerHTML='<div class="empty">👆 Selecciona una clínica arriba (o "Todas las clínicas") para ver su historial.</div>';
    tots.innerHTML='';
    return;
  }
  let datos=[...datosCarolina].reverse();
  if(cl!=='__todas__') datos=datos.filter(d=>d.clinica===cl);
  if(!datos.length){list.innerHTML='<div class="empty">📭 Sin registros.</div>';tots.innerHTML='';return;}
  const tv=datos.reduce((a,x)=>a+x.venta,0);
  const tb=datos.reduce((a,x)=>a+x.banco,0);
  const te=datos.reduce((a,x)=>a+x.efec,0);
  tots.innerHTML=`<div class="mc blue"><div class="ml">Total ventas</div><div class="mv">${fmt(tv)}</div></div><div class="mc blue"><div class="ml">Total banco</div><div class="mv">${fmt(tb)}</div></div><div class="mc green"><div class="ml">Total efectivo</div><div class="mv">${fmt(te)}</div></div><div class="mc amber"><div class="ml">Registros</div><div class="mv">${datos.length}</div></div>`;
  const COLS={'Tijuana ,Plaza del Zapato':'#185FA5','Mexicali, Av Alvaro Obregon 771':'#3B6D11','Mexicali, Rio verde 631':'#EF9F27','Ensenada, Av Ruiz 631':'#534AB7'};
  list.innerHTML=datos.map(d=>`<div class="hrow"><div class="hcl"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLS[d.clinica]||'#999'};margin-right:6px;vertical-align:middle"></span>${d.clinica.replace(',','·')}</div><div class="hmeta">📅 ${d.fecha} · ${d.capturado}${d.nota?' · '+d.nota:''}</div><div class="hvals"><span class="hv v">💰 ${fmt(d.venta)}</span><span class="hv b">🏦 ${fmt(d.banco)}</span><span class="hv e">💵 ${fmt(d.efec)}</span></div></div>`).join('');
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
    return`<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">📍</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${p}%</span></div><div class="sr"><span class="sl">Ventas</span><span class="sv">${fmt(v)}</span></div><div class="sr"><span class="sl">Banco</span><span class="sv b">${fmt(b)}</span></div><div class="sr"><span class="sl">Efectivo</span><span class="sv g">${fmt(e)}</span></div><div class="sr"><span class="sl">Meta</span><span class="sv">${fmt(cl.meta)}</span></div></div>`;
  }).join('');
}

function renderMetasTab(){
  document.getElementById('metas-header').textContent='Meta mensual por clínica · '+fmt2(META_CLINICA)+' c/u · Total '+fmt2(META_TOTAL);
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
    document.getElementById('an-mejor-mes').textContent='—';
    document.getElementById('an-mejor-val').textContent='—';
  }
  document.getElementById('anual-header').textContent='Acumulado 2026 · '+(ML.length?ML[0].replace('*','')+'–'+ML[ML.length-1].replace('*',''):'sin datos');
}

function renderDashboardMensual(){
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const mesNombre=hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const datosMes=datosCarolina.filter(r=>{
    const f=parseFechaFlexible(r.fecha);
    return f && f.year===anioActual && f.month===mesActual;
  });

  const tj={v:0,e:0,b:0}, ob={v:0,e:0,b:0}, vv={v:0,e:0,b:0}, en={v:0,e:0,b:0};
  const W={}; 
  datosMes.forEach(r=>{
    const c=r.clinica;
    const f=parseFechaFlexible(r.fecha);
    if(!f) return;
    const wk='Semana '+Math.ceil(f.day/7);
    if(!W[wk]) W[wk]={tj:0,ob:0,vv:0,en:0};
    
    if(c.includes('Tijuana')) { tj.v+=(r.venta||0); tj.e+=(r.efec||0); tj.b+=(r.banco||0); W[wk].tj+=(r.venta||0); }
    else if(c.includes('Obreg')) { ob.v+=(r.venta||0); ob.e+=(r.efec||0); ob.b+=(r.banco||0); W[wk].ob+=(r.venta||0); }
    else if(c.includes('verde')) { vv.v+=(r.venta||0); vv.e+=(r.efec||0); vv.b+=(r.banco||0); W[wk].vv+=(r.venta||0); }
    else if(c.includes('Ensenada')) { en.v+=(r.venta||0); en.e+=(r.efec||0); en.b+=(r.banco||0); W[wk].en+=(r.venta||0); }
  });

  const totalVentas=tj.v+ob.v+vv.v+en.v;
  const totalEfec=tj.e+ob.e+vv.e+en.e;
  const totalBanco=tj.b+ob.b+vv.b+en.b;

  const gastosMes=gastos.filter(g=>{
    const f=parseFechaGasto(g.fecha);
    const abrMes=Object.keys(MESES_ABR_MAP)[mesActual-1];
    return f && f.mon===abrMes;
  });
  const totalGastos=gastosMes.reduce((a,g)=>a+g.monto,0);
  const neto=totalEfec-totalGastos;
  const pctMeta=META_TOTAL?Math.round(totalVentas/META_TOTAL*100):0;

  document.getElementById('tri-empty').style.display=datosMes.length?'none':'block';
  document.getElementById('tri-metrics').innerHTML=`
    <div class="mc blue"><div class="ml">Ventas de ${mesNombre}</div><div class="mv">${fmt(totalVentas)}</div><div class="ms">${pctMeta}% de meta (${fmt(META_TOTAL)})</div></div>
    <div class="mc green"><div class="ml">Efectivo</div><div class="mv">${fmt(totalEfec)}</div></div>
    <div class="mc blue"><div class="ml">Banco</div><div class="mv">${fmt(totalBanco)}</div></div>
    <div class="mc red"><div class="ml">Gastos corporativos</div><div class="mv">${fmt(totalGastos)}</div></div>
    <div class="mc ${neto>=0?'green':'red'}"><div class="ml">Neto (efectivo - gastos)</div><div class="mv">${fmt(neto)}</div></div>`;

  const cls=[{n:'Plaza del Zapato',c:'Tijuana',s:'blue',d:tj},{n:'Obregón',c:'Mexicali',s:'green',d:ob},{n:'Villa Verde',c:'Mexicali',s:'amber',d:vv},{n:'Ensenada',c:'Ensenada',s:'purple',d:en}];
  document.getElementById('tri-clinicas').innerHTML=cls.map(cl=>{
    const pct=META_CLINICA?Math.round(cl.d.v/META_CLINICA*100):0;
    const badge=pct>=100?'ok':pct>=70?'par':'no';
    return `<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">🏥</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${pct}%</span></div><div class="sr"><span class="sl">Ventas</span><span class="sv">${fmt(cl.d.v)}</span></div><div class="sr"><span class="sl">Efectivo</span><span class="sv g">${fmt(cl.d.e)}</span></div><div class="sr"><span class="sl">Banco</span><span class="sv b">${fmt(cl.d.b)}</span></div><div class="sr"><span class="sl">Meta mensual</span><span class="sv">${fmt(META_CLINICA)}</span></div></div>`;
  }).join('');

  if(chTrimestral) chTrimestral.destroy();
  const dlBarTop={anchor:'end',align:'top',color:'#3A4150',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const keysW=Object.keys(W).sort();
  const maxW=keysW.length ? Math.max(1, ...keysW.flatMap(k=>[W[k].tj,W[k].ob,W[k].vv,W[k].en])) : 1; 
  
  const baseW={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}},scales:{x:{ticks:{font:{size:11}}},y:{max:maxW*1.35,ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}};
  chTrimestral=new Chart(document.getElementById('cTrimestral'),{type:'bar',data:{labels:keysW.length?keysW:['Sin datos'],datasets:[
    {label:'Plaza del Zapato',data:keysW.map(k=>W[k].tj),backgroundColor:'#185FA5',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'Obregón',data:keysW.map(k=>W[k].ob),backgroundColor:'#3B6D11',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'Villa Verde',data:keysW.map(k=>W[k].vv),backgroundColor:'#EF9F27',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},
    {label:'Ensenada',data:keysW.map(k=>W[k].en),backgroundColor:'#534AB7',borderRadius:4,borderSkipped:false,datalabels:dlBarTop}
  ]},options:{...baseW,layout:{padding:{top:34}}}});
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
    const faltaTxt=falta>0?fmt(falta):'¡Meta cumplida! 🎉';
    const faltaColor=falta>0?'#A32D2D':'#3B6D11';
    return`<div class="card"><div class="ch"><div class="chl"><div class="ci" style="background:var(--${cl.s})">📍</div><div><div class="cn">${cl.n}</div><div class="cs">${cl.c}</div></div></div><span class="badge ${badge}">${cl.pct}%</span></div><div class="sr"><span class="sl">Proyección</span><span class="sv" style="color:${cl.color}">${fmt(cl.proj)}</span></div><div class="sr"><span class="sl">Meta</span><span class="sv">${fmt(cl.meta)}</span></div><div class="sr"><span class="sl">Falta para meta</span><span class="sv" style="color:${faltaColor};font-weight:700">${faltaTxt}</span></div></div>`;
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
    warnEl.textContent='⚠ '+peor.n+' requiere atención prioritaria ('+peor.pct+'% de meta proyectado).';
    okEl.style.display='block';
    okEl.textContent='✓ '+mejor.n+' es la más cercana a cumplir su meta individual ('+mejor.pct+'%).';
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
  list.innerHTML=gastosMes.length?gastosMes.map((g,i)=>`<div class="gasto-row"><div class="ginfo"><div class="gconc">${g.concepto}</div><div class="gcat">${g.cat}</div><div class="gasto-quien">👤 ${g.quien} · ${g.fecha}</div></div><div style="display:flex;align-items:center;gap:8px"><div class="gmonto">${fmt(g.monto)}</div><button class="gdel" onclick="eliminarGasto(${gastos.indexOf(g)})">✕</button></div></div>`).join(''):'<div class="empty" style="padding:16px">Sin gastos registrados este mes.</div>';
  const total=gastosMes.reduce((a,g)=>a+g.monto,0);
  document.getElementById('total-g').textContent=fmt(total);
  actualizarNeto();
}

function toggleGasto(){const f=document.getElementById('add-form');f.style.display=f.style.display==='none'?'block':'none';toggleClinicaDeuda();}

function parseFechaGasto(str){
  // Los gastos guardan la fecha como "13 jul" (día + mes abreviado en español), no como dd/mm/aaaa.
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
    else if(c.includes('obregon')||c.includes('obregón')) abonoObr+=g.monto;
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
    document.getElementById('dd-tj-lbl').textContent='Plaza del Zapato · '+pctTj+'%';
    document.getElementById('dd-obr-lbl').textContent='Obregón · '+pctObr+'%';
    document.getElementById('dd-vv-lbl').textContent='Villa Verde · '+pctVv+'%';
    document.getElementById('dd-ens-lbl').textContent='Ensenada · '+pctEns+'%';
    document.getElementById('dd-pend-lbl').textContent='Pendiente · '+pctPend+'%';
    document.getElementById('dd-tj-bar').style.width=Math.min(100,pctTj)+'%';
    document.getElementById('dd-obr-bar').style.width=Math.min(100,pctObr)+'%';
    document.getElementById('dd-vv-bar').style.width=Math.min(100,pctVv)+'%';
    document.getElementById('dd-ens-bar').style.width=Math.min(100,pctEns)+'%';
    document.getElementById('dd-pend-bar').style.width=Math.min(100,pctPend)+'%';
    document.getElementById('dd-note').style.display='none';
  } else {
    ddTotal.textContent='🔍 Por definir';
    ddPend.textContent='🔍 Por definir';
    ddPendVal.textContent='🔍 Por definir';
    const pctTj=totalAbonado?Math.round(abonoTj/totalAbonado*100):0;
    const pctObr=totalAbonado?Math.round(abonoObr/totalAbonado*100):0;
    const pctVv=totalAbonado?Math.round(abonoVv/totalAbonado*100):0;
    const pctEns=totalAbonado?Math.round(abonoEns/totalAbonado*100):0;
    document.getElementById('dd-tj-lbl').textContent='Plaza del Zapato · '+pctTj+'% de lo abonado';
    document.getElementById('dd-obr-lbl').textContent='Obregón · '+pctObr+'% de lo abonado';
    document.getElementById('dd-vv-lbl').textContent='Villa Verde · '+pctVv+'% de lo abonado';
    document.getElementById('dd-ens-lbl').textContent='Ensenada · '+pctEns+'% de lo abonado';
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
    wrap.innerHTML='<div class="empty" style="padding:16px">Aún no hay ahorro registrado.</div>';
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
    if(!cl){alert('Selecciona a qué clínica corresponde el abono.');return;}
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

const CLINICA_COLOR={'Plaza del Zapato':'#185FA5','Obregón':'#3B6D11','Villa Verde':'#EF9F27','Ensenada':'#534AB7'};

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
  const nombres=['Plaza del Zapato','Obregón','Villa Verde','Ensenada'];
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
    document.getElementById('pct-wrap').innerHTML='<div class="empty" style="padding:16px">Aún no hay registros para calcular cumplimiento.</div>';
    return;
  }

  if(chMetas) chMetas.destroy();
  const dlBar={anchor:'center',align:'center',color:'#fff',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const dlBarTop={anchor:'end',align:'top',color:'#3A4150',font:{weight:'700',size:10},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
  const maxMetasVal=Math.max(1,META,...MES.flatMap(m=>[D[m].tj,D[m].ob,D[m].vv,D[m].en]));
  chMetas=new Chart(document.getElementById('cMetas'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>D[m].tj),backgroundColor:'#185FA5',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Obregón',data:MES.map(m=>D[m].ob),backgroundColor:'#3B6D11',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>D[m].vv),backgroundColor:'#EF9F27',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>D[m].en),backgroundColor:'#534AB7',borderRadius:4,borderSkipped:false,datalabels:dlBarTop},{label:'Meta',type:'line',data:MES.map(()=>META),borderColor:'#E24B4A',borderWidth:2,borderDash:[6,4],pointRadius:0,fill:false,order:0,datalabels:{display:false}}]},options:{...base,layout:{padding:{top:34}},scales:{x:{ticks:{font:{size:11}}},y:{max:maxMetasVal*1.35,ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}}});

  const ultimoMes=MES[MES.length-1];
  if(chMetasPie) chMetasPie.destroy();
  chMetasPie=ultimoMes?renderPie('cMetasPie',[D[ultimoMes].tj,D[ultimoMes].ob,D[ultimoMes].vv,D[ultimoMes].en]):null;

  document.getElementById('pct-wrap').innerHTML=MES.map((m,i)=>{const p=Math.min(100,Math.round((TOT[m]||0)/META*100));return`<div style="margin-bottom:12px"><div class="plb"><span>${ML[i]}</span><span style="font-weight:700;color:${bc(p)}">${p}% · ${fmt(TOT[m])}</span></div><div class="pbg"><div class="pf" style="width:${p}%;background:${bc(p)}"></div></div></div>`;}).join('');

  if(chAnual) chAnual.destroy();
  const maxAnual=Math.max(1,...MES.flatMap(m=>[D[m].tj,D[m].ob,D[m].vv,D[m].en]));
  chAnual=new Chart(document.getElementById('cAnual'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>D[m].tj),backgroundColor:'#185FA5',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Obregón',data:MES.map(m=>D[m].ob),backgroundColor:'#3B6D11',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>D[m].vv),backgroundColor:'#EF9F27',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>D[m].en),backgroundColor:'#534AB7',borderRadius:2,borderSkipped:false,datalabels:dlBarTop}]},options:{...base,layout:{padding:{top:34}},scales:{...base.scales,y:{...base.scales.y,suggestedMax:maxAnual*1.3}}}});

  if(chEfec) chEfec.destroy();
  const maxEfec=Math.max(1,...MES.flatMap(m=>[EF[m].tj,EF[m].ob,EF[m].vv,EF[m].en]));
  chEfec=new Chart(document.getElementById('cEfec'),{type:'bar',data:{labels:ML,datasets:[{label:'Plaza del Zapato',data:MES.map(m=>EF[m].tj),backgroundColor:'#185FA5',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Obregón',data:MES.map(m=>EF[m].ob),backgroundColor:'#3B6D11',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Villa Verde',data:MES.map(m=>EF[m].vv),backgroundColor:'#EF9F27',borderRadius:2,borderSkipped:false,datalabels:dlBarTop},{label:'Ensenada',data:MES.map(m=>EF[m].en),backgroundColor:'#534AB7',borderRadius:2,borderSkipped:false,datalabels:dlBarTop}]},options:{...base,layout:{padding:{top:34}},scales:{...base.scales,y:{...base.scales.y,suggestedMax:maxEfec*1.3}}}});

  if(chEfecPie) chEfecPie.destroy();
  chEfecPie=ultimoMes?renderPie('cEfecPie',[EF[ultimoMes].tj,EF[ultimoMes].ob,EF[ultimoMes].vv,EF[ultimoMes].en]):null;
}

function buildCharts(){
  if(chartsBuilt)return;chartsBuilt=true;
  // La gráfica de Proyección (cProy) se construye con datos reales en renderProyChart(),
  // llamada desde renderProyeccion() cada vez que se cargan datos.
}

let chProy=null;
function renderProyChart(p){
  const {MES,ML,TOT}=computeAgg(datosCarolina);
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.dataset.label||'')+': '+fmt(c.parsed.y)}}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}}}};
  const labels=[...ML,'Próx. mes (proj.)'];
  const real=MES.map(m=>TOT[m]);
  const proyLine=labels.map((_,i)=>i===labels.length-2?TOT[MES[MES.length-1]]:(i===labels.length-1?p.totalProj:null));
  if(chProy) chProy.destroy();
  const proyLabelBg={backgroundColor:'rgba(255,255,255,.92)',borderRadius:5,padding:{top:3,bottom:3,left:6,right:6}};
  chProy=new Chart(document.getElementById('cProy'),{type:'line',data:{labels,datasets:[
    {label:'Real',data:[...real,null],borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,.07)',fill:true,tension:.3,pointRadius:6,pointBackgroundColor:'#185FA5',
      datalabels:{align:'top-right',anchor:'center',offset:6,clamp:true,color:'#185FA5',font:{weight:'700',size:11},...proyLabelBg,borderColor:'#185FA5',borderWidth:1,display:c=>c.dataset.data[c.dataIndex]!=null,formatter:v=>fmt(v)}},
    {label:'Proyección',data:proyLine,borderColor:'#534AB7',borderDash:[6,4],backgroundColor:'rgba(83,74,183,.07)',fill:true,tension:.3,pointRadius:6,pointBackgroundColor:'#534AB7',
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
buildCustomSelect('g-cat',{kind:'icon',iconMap:{
  'Viáticos':'🚗','Socios':'🤝','Transporte / Cherokee':'🚙','Reembolso deuda':'🏦',
  'Ahorro':'💰','Personal':'👤','Operativo':'🏢','Otro':'📦'
}});
buildCustomSelect('g-clinica',{kind:'dot',colorMap:{
  '':'#C7CDD6','Plaza del Zapato':'#185FA5','Obregón':'#3B6D11','Villa Verde':'#EF9F27','Ensenada':'#534AB7'
}});
buildCustomSelect('g-quien',{kind:'avatar',avatarMap:{'Carlos':'CG','Estefanía':'EL'}});



// =====================================================
// VERIFICACIÓN DE CORTE MENSUAL
// =====================================================
function actualizarPanelVerificacion(){
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const datosMes=datosCarolina.filter(r=>{
    const f=parseFechaFlexible(r.fecha);
    return f && f.year===anioActual && f.month===mesActual;
  });
  const sysEfec=datosMes.reduce((a,x)=>a+x.efec,0);
  const sysBanco=datosMes.reduce((a,x)=>a+x.banco,0);
  document.getElementById('cv-sis-efec').textContent=fmt(sysEfec);
  document.getElementById('cv-sis-banco').textContent=fmt(sysBanco);

  // Cargar corte verificado guardado
  const key='dmf_corte_'+anioActual+'_'+mesActual;
  const saved=window.dmfStorage.getItem(key);
  if(saved){
    try{
      const d=JSON.parse(saved);
      document.getElementById('cv-real-efec').value=d.realEfec||'';
      document.getElementById('cv-real-banco').value=d.realBanco||'';
      document.getElementById('cv-nota').value=d.nota||'';
      const badge=document.getElementById('corte-verificado-badge');
      badge.style.display='inline-block';
      badge.textContent='✓ Verificado el '+d.fecha+' por '+d.quien;
      calcDiferencia();
    }catch(e){}
  }
}

function calcDiferencia(){
  const sysEfecEl=document.getElementById('cv-sis-efec').textContent;
  const sysBancoEl=document.getElementById('cv-sis-banco').textContent;
  const parseF=s=>parseFloat(String(s).replace(/[^0-9.-]/g,'').replace(/,/g,''))||0;
  const sysEfec=parseF(sysEfecEl);
  const sysBanco=parseF(sysBancoEl);
  const realEfec=parseFloat(document.getElementById('cv-real-efec').value)||0;
  const realBanco=parseFloat(document.getElementById('cv-real-banco').value)||0;
  if(!realEfec && !realBanco){ document.getElementById('cv-dif-box').style.display='none'; return; }
  const difEfec=realEfec-sysEfec;
  const difBanco=realBanco-sysBanco;
  const box=document.getElementById('cv-dif-box');
  box.style.display='block';
  const ok=(difEfec===0&&difBanco===0);
  const warn=(Math.abs(difEfec)>100||Math.abs(difBanco)>100);
  box.style.background=ok?'var(--green-s)':warn?'var(--red-s)':'var(--amber-s)';
  box.style.borderColor=ok?'#A3C98A':warn?'#F5AAAA':'#FDE047';
  const fmtDif=v=>(v>=0?'+':'')+fmt(v);
  const color=v=>v===0?'var(--green)':v>0?'var(--blue)':'var(--red)';
  document.getElementById('cv-dif-efec').textContent=fmtDif(difEfec);
  document.getElementById('cv-dif-efec').style.color=color(difEfec);
  document.getElementById('cv-dif-banco').textContent=fmtDif(difBanco);
  document.getElementById('cv-dif-banco').style.color=color(difBanco);
}

function marcarCorteVerificado(){
  const realEfec=parseFloat(document.getElementById('cv-real-efec').value)||0;
  const realBanco=parseFloat(document.getElementById('cv-real-banco').value)||0;
  const nota=document.getElementById('cv-nota').value.trim();
  if(!realEfec&&!realBanco){alert('Ingresa al menos el efectivo físico recibido.');return;}
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const key='dmf_corte_'+anioActual+'_'+mesActual;
  const fechaStr=hoy.toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const data={realEfec,realBanco,nota,fecha:fechaStr,quien:usuarioActual};
  window.dmfStorage.setItem(key,JSON.stringify(data));
  const badge=document.getElementById('corte-verificado-badge');
  badge.style.display='inline-block';
  badge.textContent='✓ Verificado el '+fechaStr+' por '+usuarioActual;
  calcDiferencia();
  alert('¡Corte verificado y guardado!');
}

// Llamar actualizarPanelVerificacion cuando se carguen datos
const _origCargarDatos=cargarDatos;
// ya integrado arriba, pero aseguramos que se llame
function actualizarVerificacionEnDatos(){
  if(document.getElementById('cv-sis-efec')) actualizarPanelVerificacion();
}

// =====================================================
// DESCARGA CSV MENSUAL
// =====================================================
function descargarMensual(){
  const hoy=new Date();
  const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
  const mesNombre=hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const filas=datosCarolina.filter(r=>{
    const f=parseFechaFlexible(r.fecha);
    return f && f.year===anioActual && f.month===mesActual;
  });
  const abrActual=Object.keys(MESES_ABR_MAP)[mesActual-1];
  const filasGastos=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && f.mon===abrActual;});

  let csv='REPORTE MENSUAL · '+mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1)+'\r\n\r\n';
  csv+='VENTAS\r\n';
  csv+=['Fecha','Clínica','Venta','Banco','Efectivo','Capturado','Nota'].map(csvEscape).join(',')+'\r\n';
  filas.forEach(r=>{csv+=[r.fecha,r.clinica,r.venta,r.banco,r.efec,r.capturado,r.nota].map(csvEscape).join(',')+'\r\n';});
  csv+='\r\nGASTOS\r\n';
  csv+=['Fecha','Concepto','Categoría','Monto','Registrado por'].map(csvEscape).join(',')+'\r\n';
  filasGastos.forEach(g=>{csv+=[g.fecha,g.concepto,g.cat,g.monto,g.quien].map(csvEscape).join(',')+'\r\n';});

  const tv=filas.reduce((a,x)=>a+(x.venta||0),0);
  const te=filas.reduce((a,x)=>a+(x.efec||0),0);
  const tb=filas.reduce((a,x)=>a+(x.banco||0),0);
  const tg=filasGastos.reduce((a,g)=>a+(g.monto||0),0);
  csv+='\r\nRESUMEN\r\n';
  csv+='Ventas,'+tv+'\r\nEfectivo,'+te+'\r\nBanco,'+tb+'\r\nGastos,'+tg+'\r\nNeto,'+(te-tg)+'\r\n';

  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='reporte_mensual_'+anioActual+'_'+String(mesActual).padStart(2,'0')+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

// =====================================================
// DESCARGA PDF MENSUAL CON GRÁFICAS
// =====================================================
async function descargarDashboardMensual(){
  const btn=document.getElementById('btn-dash-pdf');
  btn.disabled=true;
  btn.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg> Generando...';
  try{
    const hoy=new Date();
    const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
    const mesNombre=hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    const mesNombreCap=mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1);

    // Esperar a que html2canvas esté disponible (cargar si no lo está)
    if(!window.html2canvas){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload=resolve; s.onerror=reject;
        document.head.appendChild(s);
      });
    }

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
      doc.text('Dental+Fácil',textX,30);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);
      doc.setFontSize(9);
      doc.text('Generado el '+hoy.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}),pageW-margin,48,{align:'right'});
      doc.setTextColor(26,36,51);
    }
    drawHeader();

    // Datos mes actual
    const datosMes=datosCarolina.filter(r=>{const f=parseFechaFlexible(r.fecha);return f && f.year===anioActual && f.month===mesActual;});
    const CLS=[
      {key:'Tijuana ,Plaza del Zapato',n:'Plaza del Zapato',c:'Tijuana'},
      {key:'Mexicali, Av Alvaro Obregon 771',n:'Obregón',c:'Mexicali'},
      {key:'Mexicali, Rio verde 631',n:'Villa Verde',c:'Mexicali'},
      {key:'Ensenada, Av Ruiz 631',n:'Ensenada',c:'Ensenada'}
    ];
    const byC={}; CLS.forEach(cl=>{byC[cl.key]={v:0,e:0,b:0};});
    datosMes.forEach(r=>{if(byC[r.key]!==undefined){byC[r.key].v+=r.venta||0;byC[r.key].e+=r.efec||0;byC[r.key].b+=r.banco||0;}});
    // fix: usar r.clinica
    const byClinica={}; CLS.forEach(cl=>{byClinica[cl.key]={v:0,e:0,b:0};});
    datosMes.forEach(r=>{if(byClinica[r.clinica]!==undefined){byClinica[r.clinica].v+=r.venta||0;byClinica[r.clinica].e+=r.efec||0;byClinica[r.clinica].b+=r.banco||0;}});
    const totalVentas=CLS.reduce((a,cl)=>a+byClinica[cl.key].v,0);
    const totalEfec=CLS.reduce((a,cl)=>a+byClinica[cl.key].e,0);
    const totalBanco=CLS.reduce((a,cl)=>a+byClinica[cl.key].b,0);
    const abrActual=Object.keys(MESES_ABR_MAP)[mesActual-1];
    const gastosM=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && f.mon===abrActual;});
    const totalGastos=gastosM.reduce((a,g)=>a+g.monto,0);
    const neto=totalEfec-totalGastos;
    const pctMeta=META_TOTAL?Math.round(totalVentas/META_TOTAL*100):0;

    let y=100;
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.text('Resumen del mes',margin,y);
    y+=10;

    doc.autoTable({
      startY:y, margin:{left:margin,right:margin},
      head:[['Indicador','Valor']],
      body:[
        ['Ventas',fmt(totalVentas)+'   ('+pctMeta+'% de meta: '+fmt(META_TOTAL)+')'],
        ['Efectivo',fmt(totalEfec)],
        ['Banco',fmt(totalBanco)],
        ['Gastos del mes',fmt(totalGastos)],
        ['Neto (efectivo − gastos)',fmt(neto)]
      ],
      theme:'grid',
      headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
      styles:{fontSize:10,cellPadding:6,textColor:[26,36,51]},
      columnStyles:{0:{fontStyle:'bold',cellWidth:190}}
    });

    y=doc.lastAutoTable.finalY+26;
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.text('Desempeño por clínica',margin,y);
    y+=10;

    doc.autoTable({
      startY:y, margin:{left:margin,right:margin},
      head:[['Clínica','Ciudad','Ventas','Efectivo','Banco','% Meta']],
      body:CLS.map(cl=>{
        const d=byClinica[cl.key];
        const pct=META_CLINICA?Math.round(d.v/META_CLINICA*100):0;
        return [cl.n,cl.c,fmt(d.v),fmt(d.e),fmt(d.b),pct+'%'];
      }),
      theme:'grid',
      headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
      styles:{fontSize:9.5,cellPadding:6,textColor:[26,36,51]}
    });

    y=doc.lastAutoTable.finalY+26;

    // Captura de la gráfica de barras mensual con html2canvas
    const chartEl=document.getElementById('cTrimestral');
    if(chartEl && window.html2canvas){
      if(y>pageH-160){doc.addPage();drawHeader();y=90;}
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      doc.text('Gráfica de ventas por clínica',margin,y);
      y+=14;
      try{
        const canvas=await html2canvas(chartEl.parentElement,{scale:2,backgroundColor:'#ffffff',logging:false});
        const imgData=canvas.toDataURL('image/png');
        const imgW=pageW-margin*2;
        const imgH=imgW*(canvas.height/canvas.width);
        if(y+imgH>pageH-40){doc.addPage();drawHeader();y=90;}
        doc.addImage(imgData,'PNG',margin,y,imgW,Math.min(imgH,220));
        y+=Math.min(imgH,220)+20;
      }catch(e){console.warn('html2canvas error:',e);}
    }

    // Gastos del mes
    if(gastosM.length){
      if(y>pageH-120){doc.addPage();drawHeader();y=90;}
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      doc.text('Gastos del mes',margin,y);
      y+=10;
      doc.autoTable({
        startY:y, margin:{left:margin,right:margin},
        head:[['Concepto','Categoría','Monto','Registrado por','Fecha']],
        body:gastosM.map(g=>[g.concepto,g.cat,fmt(g.monto),g.quien,g.fecha]),
        foot:[['Total gastos','',''+fmt(totalGastos),'','']],
        theme:'grid',
        headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
        footStyles:{fillColor:[230,241,251],textColor:[26,36,51],fontStyle:'bold'},
        styles:{fontSize:9,cellPadding:5,textColor:[26,36,51]}
      });
      y=doc.lastAutoTable.finalY+20;
    }

    // Verificación de corte si existe
    const key2='dmf_corte_'+anioActual+'_'+mesActual;
    const savedCorte=window.dmfStorage.getItem(key2);
    if(savedCorte){
      try{
        const dc=JSON.parse(savedCorte);
        if(y>pageH-120){doc.addPage();drawHeader();y=90;}
        doc.setFont('helvetica','bold');
        doc.setFontSize(13);
        doc.text('Verificación de corte',margin,y);
        y+=10;
        const sysEfec=datosMes.reduce((a,x)=>a+x.efec,0);
        const sysBanco=datosMes.reduce((a,x)=>a+x.banco,0);
        const difEfec=(dc.realEfec||0)-sysEfec;
        const difBanco=(dc.realBanco||0)-sysBanco;
        doc.autoTable({
          startY:y, margin:{left:margin,right:margin},
          head:[['Concepto','Sistema','Físico recibido','Diferencia']],
          body:[
            ['Efectivo',fmt(sysEfec),fmt(dc.realEfec||0),(difEfec>=0?'+':'')+fmt(difEfec)],
            ['Banco',fmt(sysBanco),fmt(dc.realBanco||0),(difBanco>=0?'+':'')+fmt(difBanco)]
          ],
          theme:'grid',
          headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold'},
          styles:{fontSize:10,cellPadding:6,textColor:[26,36,51]}
        });
        y=doc.lastAutoTable.finalY+10;
        doc.setFont('helvetica','normal');
        doc.setFontSize(9);
        doc.setTextColor(91,102,120);
        doc.text('Verificado el '+dc.fecha+' por '+dc.quien+(dc.nota?' · Nota: '+dc.nota:''),margin,y);
        doc.setTextColor(26,36,51);
        y+=20;
      }catch(e){}
    }

    // Paginación
    const pageCount=doc.internal.getNumberOfPages();
    for(let p=1;p<=pageCount;p++){
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120,130,145);
      doc.text('Dental+Fácil · Reporte Mensual · '+mesNombreCap+' · Página '+p+' de '+pageCount,pageW/2,pageH-16,{align:'center'});
    }
    doc.save('reporte_mensual_'+anioActual+'_'+String(mesActual).padStart(2,'0')+'.pdf');
  }catch(err){
    console.error(err);
    alert('No se pudo generar el PDF: '+err.message);
  }finally{
    btn.disabled=false;
    btn.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg> Descargar PDF';
  }
}


