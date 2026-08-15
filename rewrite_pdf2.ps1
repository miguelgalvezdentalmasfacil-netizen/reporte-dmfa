$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Extract logo
$logoRegex = "(?s)const CLINIC_LOGO_B64='(data:image/png;base64,.*?)';"
$logoMatch = [regex]::Match($text, $logoRegex)
if (-not $logoMatch.Success) {
    Write-Output "Could not find logo string!"
    exit 1
}
$logoB64 = $logoMatch.Groups[1].Value

# The new JS code (notice $$ for literal $ in Regex Replace)
$newJS = @"
async function descargarDashboardMensual(){
  const btn=document.getElementById('btn-dash-pdf');
  btn.disabled=true;
  const originalBtnHTML = btn.innerHTML;
  btn.innerHTML='<svg class="i-svg i-mr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg> Generando...';
  
  try{
    const hoy=new Date();
    const anioActual=hoy.getFullYear(), mesActual=hoy.getMonth()+1;
    let mesAnt = mesActual - 1;
    let anioAnt = anioActual;
    if(mesAnt === 0) { mesAnt = 12; anioAnt = anioActual - 1; }
    
    const mesNombre=hoy.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    const mesNombreCap=mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1);

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
    
    function addFooter(doc) {
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150,150,150);
        doc.text('Dental+Fácil · Informe Mensual · ' + mesNombreCap + ' · Página ' + i + ' de ' + pageCount, pageW / 2, pageH - 20, {align: 'center'});
      }
    }

    const colorAzul = [24,95,165];
    const colorVerde = [59,109,17];
    const colorAmbar = [239,159,39];
    const colorRojo = [203,50,52];
    const colorMorado = [83,74,183];
    
    function drawHeader(doc){
      doc.setFillColor(24,95,165);
      doc.rect(0,0,pageW,80,'F');
      const CLINIC_LOGO_B64='$logoB64';
      doc.addImage(CLINIC_LOGO_B64, 'PNG', margin, 10, 60, 60);
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(16);
      doc.text('INFORME MENSUAL DE RENDIMIENTO DE VENTAS', margin + 75, 35);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Mes de Evaluación: '+mesNombreCap, margin + 75, 55);
      doc.setFontSize(9);
      doc.text('Generado el '+hoy.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}), pageW-margin, 55, {align:'right'});
    }
    drawHeader(doc);

    const datosMes=datosCarolina.filter(r=>{const f=parseFechaFlexible(r.fecha);return f && f.year===anioActual && f.month===mesActual;});
    const datosAnt=datosCarolina.filter(r=>{const f=parseFechaFlexible(r.fecha);return f && f.year===anioAnt && f.month===mesAnt;});
    
    const CLS=[
      {key:'Tijuana ,Plaza del Zapato',n:'Plaza del Zapato',c:'Tijuana'},
      {key:'Mexicali, Av Alvaro Obregon 771',n:'Obregón',c:'Mexicali'},
      {key:'Mexicali, Rio verde 631',n:'Villa Verde',c:'Mexicali'},
      {key:'Ensenada, Av Ruiz 631',n:'Ensenada',c:'Ensenada'}
    ];
    
    const byClinica={}; CLS.forEach(cl=>{byClinica[cl.key]={v:0,e:0,b:0, pct:0};});
    datosMes.forEach(r=>{if(byClinica[r.clinica]!==undefined){byClinica[r.clinica].v+=r.venta||0;byClinica[r.clinica].e+=r.efec||0;byClinica[r.clinica].b+=r.banco||0;}});
    
    const byClinicaAnt={}; CLS.forEach(cl=>{byClinicaAnt[cl.key]={v:0,e:0,b:0};});
    datosAnt.forEach(r=>{if(byClinicaAnt[r.clinica]!==undefined){byClinicaAnt[r.clinica].v+=r.venta||0;byClinicaAnt[r.clinica].e+=r.efec||0;byClinicaAnt[r.clinica].b+=r.banco||0;}});

    let totalVentas=0, totalEfec=0, totalBanco=0;
    let totalVentasAnt=0, totalEfecAnt=0, totalBancoAnt=0;
    let bestCl = null, worstCl = null;
    let maxPct = -1, minPct = 9999;
    
    CLS.forEach(cl=>{
       totalVentas+=byClinica[cl.key].v;
       totalEfec+=byClinica[cl.key].e;
       totalBanco+=byClinica[cl.key].b;
       
       totalVentasAnt+=byClinicaAnt[cl.key].v;
       totalEfecAnt+=byClinicaAnt[cl.key].e;
       totalBancoAnt+=byClinicaAnt[cl.key].b;

       const meta = META_CLINICA || 1;
       const pct = (byClinica[cl.key].v / meta) * 100;
       byClinica[cl.key].pct = pct;
       if(pct > maxPct) { maxPct = pct; bestCl = cl.n; }
       if(pct < minPct) { minPct = pct; worstCl = cl.n; }
    });
    
    if(!bestCl) { bestCl = "N/A"; }
    if(!worstCl) { worstCl = "N/A"; }
    
    const abrActual=Object.keys(MESES_ABR_MAP)[mesActual-1];
    const abrAnt=Object.keys(MESES_ABR_MAP)[mesAnt-1];
    const gastosM=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && f.mon===abrActual;});
    const gastosA=gastos.filter(g=>{const f=parseFechaGasto(g.fecha);return f && f.mon===abrAnt;});
    
    const totalGastos=gastosM.reduce((a,g)=>a+g.monto,0);
    const totalGastosAnt=gastosA.reduce((a,g)=>a+g.monto,0);
    const neto=totalEfec-totalGastos;
    const netoAnt=totalEfecAnt-totalGastosAnt;
    
    function fmt(n){return '$$'+(n||0).toLocaleString('en-US');}

    const pctMeta=META_TOTAL?Math.round(totalVentas/META_TOTAL*100):0;
    
    let varSales = totalVentasAnt > 0 ? ((totalVentas - totalVentasAnt)/totalVentasAnt)*100 : 0;
    let txtGrowth = varSales >= 0 ? 'un crecimiento del ' + varSales.toFixed(1) + '%' : 'una disminución del ' + Math.abs(varSales).toFixed(1) + '%';
    let txtMeta = pctMeta >= 100 ? 'superando la meta general con un ' + pctMeta + '% de cumplimiento.' : 'alcanzando un ' + pctMeta + '% de la meta general.';
    let resumenText = 'Durante este mes, se registró un total de ventas de ' + fmt(totalVentas) + ', lo que representa ' + txtGrowth + ' respecto al mes anterior, ' + txtMeta + ' La clínica con mejor desempeño fue ' + bestCl + ' (' + maxPct.toFixed(1) + '%), mientras que ' + worstCl + ' reportó el menor alcance (' + minPct.toFixed(1) + '%).';

    let y = 110;
    doc.setTextColor(24,95,165);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('RESUMEN EJECUTIVO', margin, y);
    doc.setDrawColor(24,95,165);
    doc.setLineWidth(1);
    doc.line(margin, y+5, 290, y+5);
    y+=20;
    doc.setTextColor(50,50,50);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(resumenText, 250);
    doc.text(splitText, margin, y);
    y += (splitText.length * 12) + 15;
    
    let generadoPor = 'Dirección Operativa';
    const userSpan = document.querySelector('.user-info strong');
    if(userSpan && userSpan.innerText.trim() !== '') {
       generadoPor = userSpan.innerText.trim();
    }
    
    doc.autoTable({
      startY: y,
      margin: {left: margin},
      tableWidth: 250,
      body: [
        ['Mes Evaluado', mesNombreCap],
        ['Generado por', generadoPor],
        ['Fecha de Reporte', hoy.toLocaleDateString('es-MX')],
        ['Estatus Global', pctMeta >= 100 ? 'Meta Cumplida' : 'Por debajo de meta']
      ],
      theme: 'grid',
      styles: {fontSize: 9, cellPadding: 4, textColor: [50,50,50]},
      columnStyles: {0: {fontStyle: 'bold', fillColor: [240,240,240], cellWidth: 100}}
    });

    const chartEl=document.getElementById('cTrimestral');
    if(chartEl && window.html2canvas){
      try{
        const canvas=await html2canvas(chartEl.parentElement,{scale:2,backgroundColor:'#ffffff',logging:false});
        const imgData=canvas.toDataURL('image/png');
        const chartW = 240;
        const chartH = chartW*(canvas.height/canvas.width);
        doc.addImage(imgData,'PNG', 310, 110, chartW, chartH);
        
        doc.setDrawColor(200,200,200);
        doc.setLineWidth(0.5);
        doc.rect(310, 110, chartW, chartH);
      }catch(e){console.warn('html2canvas error:',e);}
    }

    y = Math.max(doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 250, 260);
    
    doc.setTextColor(24,95,165);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('RESUMEN FINANCIERO MENSUAL', margin, y);
    doc.setDrawColor(24,95,165);
    doc.setLineWidth(1);
    doc.line(margin, y+5, pageW-margin, y+5);
    y+=20;
    
    function getVarObj(act, ant) {
        if(ant===0) return {v:'N/A', c:[50,50,50]};
        const p = ((act-ant)/ant)*100;
        const isUp = p >= 0;
        return {
            v: (isUp?'+':'') + p.toFixed(1) + '%',
            c: isUp ? colorVerde : colorRojo
        };
    }
    
    const vVentas = getVarObj(totalVentas, totalVentasAnt);
    const vEfec = getVarObj(totalEfec, totalEfecAnt);
    const vBanco = getVarObj(totalBanco, totalBancoAnt);
    const vGastos = getVarObj(totalGastos, totalGastosAnt);
    if(totalGastos > totalGastosAnt) { vGastos.c = colorRojo; } else if(totalGastosAnt > 0) { vGastos.c = colorVerde; }
    const vNeto = getVarObj(neto, netoAnt);
    
    doc.autoTable({
      startY: y,
      margin: {left: margin, right: margin},
      head: [['Concepto', 'Mes Anterior', 'Mes Actual', 'Variación']],
      body: [
        ['Ingresos (Ventas)', fmt(totalVentasAnt), fmt(totalVentas), vVentas],
        ['Efectivo Registrado', fmt(totalEfecAnt), fmt(totalEfec), vEfec],
        ['Bancos', fmt(totalBancoAnt), fmt(totalBanco), vBanco],
        ['Gastos Operativos', fmt(totalGastosAnt), fmt(totalGastos), vGastos],
        ['Flujo Neto', fmt(netoAnt), fmt(neto), vNeto],
      ],
      theme: 'grid',
      headStyles: {fillColor: colorAzul, textColor: 255, fontStyle: 'bold', halign: 'center'},
      styles: {fontSize: 10, cellPadding: 6, textColor: [50,50,50], halign: 'center'},
      columnStyles: {0: {fontStyle: 'bold', halign: 'left'}},
      didParseCell: function(data) {
        if(data.section === 'body' && data.column.index === 3 && data.cell.raw && data.cell.raw.c) {
            data.cell.styles.textColor = data.cell.raw.c;
            data.cell.text = data.cell.raw.v;
        }
      }
    });
    
    y = doc.lastAutoTable.finalY + 30;

    if(y > pageH - 220) { doc.addPage(); drawHeader(doc); y = 110; }
    
    doc.setTextColor(24,95,165);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('DESEMPEÑO Y CUMPLIMIENTO POR CLÍNICA', margin, y);
    doc.setDrawColor(24,95,165);
    doc.setLineWidth(1);
    doc.line(margin, y+5, pageW-margin, y+5);
    y+=20;
    
    doc.autoTable({
      startY: y,
      margin: {left: margin, right: margin},
      head: [['Clínica', 'Meta', 'Alcanzado', '% Cumplido', 'Estado', 'Progreso vs Meta']],
      body: CLS.map(cl => {
        const d = byClinica[cl.key];
        const pct = d.pct;
        let estado = 'ÓPTIMO';
        let badgeColor = colorVerde;
        if(pct < 100 && pct >= 70) { estado = 'REGULAR'; badgeColor = colorAmbar; }
        if(pct < 70) { estado = 'CRÍTICO'; badgeColor = colorRojo; }
        
        return [cl.n, fmt(META_CLINICA), fmt(d.v), pct.toFixed(1) + '%', {e: estado, c: badgeColor}, pct];
      }),
      theme: 'striped',
      headStyles: {fillColor: [240,240,240], textColor: colorAzul, fontStyle: 'bold', halign: 'center'},
      styles: {fontSize: 9.5, cellPadding: 8, textColor: [50,50,50], halign: 'center', valign: 'middle'},
      columnStyles: {0: {fontStyle: 'bold', halign: 'left'}, 4: {cellWidth: 60}, 5: {cellWidth: 100}},
      didDrawCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
            const text = data.cell.raw.e;
            const c = data.cell.raw.c;
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            doc.setFillColor(c[0], c[1], c[2]);
            doc.roundedRect(cx - 25, cy - 8, 50, 16, 3, 3, 'F');
            doc.setTextColor(255,255,255);
            doc.setFontSize(8);
            doc.setFont('helvetica','bold');
            doc.text(text, cx, cy + 3, {align: 'center'});
        }
        if (data.section === 'body' && data.column.index === 5) {
            const pct = Math.min(data.cell.raw, 100);
            const w = 80;
            const h = 8;
            const cx = data.cell.x + 10;
            const cy = data.cell.y + (data.cell.height / 2) - (h/2);
            doc.setFillColor(230,230,230);
            doc.rect(cx, cy, w, h, 'F');
            doc.setFillColor(24,95,165);
            doc.rect(cx, cy, w * (pct/100), h, 'F');
        }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && (data.column.index === 4 || data.column.index === 5)) {
            data.cell.text = ''; // clear text so we can draw custom
        }
      }
    });
    
    y = doc.lastAutoTable.finalY + 35;

    if(y > pageH - 180) { doc.addPage(); drawHeader(doc); y = 110; }
    
    const objY = y;
    
    doc.setTextColor(24,95,165);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('OBJETIVOS DEL PRÓXIMO MES', margin, y);
    doc.setDrawColor(24,95,165);
    doc.setLineWidth(1);
    doc.line(margin, y+5, 290, y+5);
    
    let bullets = [];
    if(minPct < 100) {
        bullets.push('• Reforzar estrategias de venta en ' + worstCl + ' para superar el ' + minPct.toFixed(1) + '% actual.');
    }
    if(maxPct >= 100) {
        bullets.push('• Mantener el ritmo de cierre de pacientes en ' + bestCl + '.');
    } else {
        bullets.push('• Apoyar a ' + bestCl + ' para alcanzar la meta mensual.');
    }
    if(totalGastos > totalGastosAnt) {
        bullets.push('• Revisar y optimizar los gastos operativos, que incrementaron vs mes pasado.');
    } else {
        bullets.push('• Mantener el buen control de gastos operativos.');
    }
    bullets.push('• Dar seguimiento a pacientes de ortodoncia inactivos.');
    
    doc.setTextColor(50,50,50);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    
    let by = y + 25;
    bullets.forEach(b => {
        const lines = doc.splitTextToSize(b, 240);
        doc.text(lines, margin, by);
        by += (lines.length * 14);
    });
    
    doc.setTextColor(24,95,165);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('PROYECCIÓN PRÓXIMO MES', 320, objY);
    doc.setDrawColor(24,95,165);
    doc.setLineWidth(1);
    doc.line(320, objY+5, pageW-margin, objY+5);
    
    const proyVentas = totalVentas * 1.10;
    const proyEfec = totalEfec * 1.10;
    const proyDiff = proyVentas - META_TOTAL;
    
    doc.autoTable({
      startY: objY + 15,
      margin: {left: 320, right: margin},
      tableWidth: pageW - margin - 320,
      head: [['Concepto', 'Estimado']],
      body: [
        ['Ventas Proyectadas (+10%)', fmt(proyVentas)],
        ['Efectivo Estimado', fmt(proyEfec)],
        ['Diferencia vs Meta', (proyDiff >= 0 ? '+' : '') + fmt(proyDiff)],
      ],
      theme: 'grid',
      headStyles: {fillColor: colorMorado, textColor: 255, fontStyle: 'bold'},
      styles: {fontSize: 9.5, cellPadding: 6, textColor: [50,50,50]},
      columnStyles: {0: {fontStyle: 'bold'}}
    });
    
    y = Math.max(by, doc.lastAutoTable.finalY) + 30;

    // Verificación de corte si existe
    const key2='dmf_corte_'+anioActual+'_'+mesActual;
    const savedCorte=window.dmfStorage.getItem(key2);
    if(savedCorte){
      try{
        const dc=JSON.parse(savedCorte);
        if(y>pageH-140){doc.addPage();drawHeader(doc);y=110;}
        doc.setTextColor(24,95,165);
        doc.setFont('helvetica','bold');
        doc.setFontSize(12);
        doc.text('VERIFICACIÓN DE CORTE (FÍSICO VS SISTEMA)',margin,y);
        doc.setDrawColor(24,95,165);
        doc.setLineWidth(1);
        doc.line(margin, y+5, pageW-margin, y+5);
        y+=20;
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
          headStyles:{fillColor:[24,95,165],textColor:255,fontStyle:'bold', halign:'center'},
          styles:{fontSize:10,cellPadding:6,textColor:[26,36,51], halign:'center'},
          columnStyles:{0:{fontStyle:'bold', halign:'left'}},
          didParseCell: function(data) {
            if(data.section === 'body' && data.column.index === 3) {
              const val = parseFloat(data.cell.raw.replace(/[^0-9.-]+/g,""));
              if(val !== 0) { data.cell.styles.textColor = colorRojo; }
              else { data.cell.styles.textColor = colorVerde; }
            }
          }
        });
        y=doc.lastAutoTable.finalY+10;
        doc.setFont('helvetica','normal');
        doc.setFontSize(9);
        doc.setTextColor(91,102,120);
        doc.text('Verificado el '+dc.fecha+' por '+dc.quien+(dc.nota?' · Nota: '+dc.nota:''),margin,y);
      }catch(e){}
    }

    addFooter(doc);
    doc.save('Reporte_Ejecutivo_DMFA_'+mesNombreCap+'_'+anioActual+'.pdf');
    
  }catch(err){
    console.error(err);
    alert('No se pudo generar el PDF: '+err.message);
  }finally{
    btn.innerHTML=originalBtnHTML;
    btn.disabled=false;
  }
}
</script>
"@

$regexReplace = "(?s)async function descargarDashboardMensual\(\).*?</script>"

$newText = [regex]::Replace($text, $regexReplace, $newJS)

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($newText)
[System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $outBytes)
Write-Output "Successfully updated PDF logic!"
