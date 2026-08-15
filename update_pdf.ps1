$htmlPath = 'C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html'
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

# 1. Update logo size
$html = $html -replace "margin, 20, 40, 40\);", "margin, 8, 64, 64);"

# 2. Update chart generation
$oldChartCode = @"
      const chartEl=document.getElementById('cTrimestral');
      if(chartEl && window.html2canvas){
        try{
          const canvas=await html2canvas(chartEl.parentElement,{scale:2,backgroundColor:'#ffffff',logging:false});
          const imgData=canvas.toDataURL('image/png');
          const chartW = pageW - margin * 2;
          const chartH = chartW*(canvas.height/canvas.width);
          
          if(y + chartH + 40 > pageH) { doc.addPage(); drawHeader(doc); y = 110; }
          
          doc.setTextColor(24,95,165);
          doc.setFont('helvetica','bold');
          doc.setFontSize(12);
          doc.text('GR\u00C1FICA DE VENTAS (TENDENCIA MENSUAL)', margin, y);
          doc.setDrawColor(24,95,165);
          doc.setLineWidth(1);
          doc.line(margin, y+5, pageW-margin, y+5);
          y += 25;
  
          doc.addImage(imgData,'PNG', margin, y, chartW, chartH);
          doc.setDrawColor(200,200,200);
          doc.setLineWidth(0.5);
          doc.rect(margin, y, chartW, chartH);
          
          y += chartH + 40;
        }catch(e){console.warn('html2canvas error:',e);}
      }
"@

$newChartCode = @"
      const W={};
      datosMes.forEach(r=>{
        const f=parseFechaFlexible(r.fecha);
        if(!f)return;
        const w='Semana '+getWeekOfMonth(f);
        if(!W[w]) W[w]={tj:0,ob:0,vv:0,en:0};
        if(r.clinica.includes('Tijuana')) W[w].tj+=r.venta;
        else if(r.clinica.includes('Obregon')||r.clinica.includes('Obreg\u00F3n')) W[w].ob+=r.venta;
        else if(r.clinica.includes('verde')||r.clinica.includes('Verde')) W[w].vv+=r.venta;
        else if(r.clinica.includes('Ensenada')) W[w].en+=r.venta;
      });

      const keysW=Object.keys(W).sort();
      if(keysW.length > 0 && window.Chart) {
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.top = '-9999px';
          container.style.left = '-9999px';
          container.style.width = '900px';
          container.style.backgroundColor = '#ffffff';
          document.body.appendChild(container);
          
          for(const w of keysW) {
              const d = W[w];
              if(d.tj === 0 && d.ob === 0 && d.vv === 0 && d.en === 0) continue;
              
              const wrap = document.createElement('div');
              wrap.style.width = '900px';
              wrap.style.height = '450px';
              wrap.style.padding = '20px';
              wrap.style.backgroundColor = '#ffffff';
              container.appendChild(wrap);
              
              const canvas = document.createElement('canvas');
              wrap.appendChild(canvas);
              
              const maxVal = Math.max(1, d.tj, d.ob, d.vv, d.en);
              const dlBarTop = {anchor:'end',align:'top',color:'#3A4150',font:{weight:'700',size:11},clamp:true,display:c=>c.dataset.data[c.dataIndex]>0,formatter:(v,c)=>[c.dataset.label,fmt(v)]};
              
              new Chart(canvas, {
                  type: 'bar',
                  data: {
                      labels: [w],
                      datasets: [
                          {label:'Plaza del Zapato',data:[d.tj],backgroundColor:'#185FA5',borderRadius:4,datalabels:dlBarTop},
                          {label:'Obreg\u00F3n',data:[d.ob],backgroundColor:'#3B6D11',borderRadius:4,datalabels:dlBarTop},
                          {label:'Villa Verde',data:[d.vv],backgroundColor:'#EF9F27',borderRadius:4,datalabels:dlBarTop},
                          {label:'Ensenada',data:[d.en],backgroundColor:'#534AB7',borderRadius:4,datalabels:dlBarTop}
                      ]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: false,
                      plugins: { legend: { display: false } },
                      scales: {
                          x: { ticks: { font: { size: 14 } } },
                          y: { max: maxVal * 1.35, ticks: { callback: v=>'$'+Math.round(v/1000)+'K', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,.05)' } }
                      },
                      layout: { padding: { top: 35 } }
                  }
              });
              
              try {
                  const renderedCanvas = await html2canvas(wrap, {scale:2, backgroundColor:'#ffffff', logging:false});
                  const imgData = renderedCanvas.toDataURL('image/png');
                  const chartW = pageW - margin * 2;
                  const chartH = chartW * (renderedCanvas.height / renderedCanvas.width);
                  
                  if(y + chartH + 50 > pageH) { doc.addPage(); drawHeader(doc); y = 110; }
                  
                  doc.setTextColor(24,95,165);
                  doc.setFont('helvetica','bold');
                  doc.setFontSize(12);
                  doc.text(w.toUpperCase() + ' - GR\u00C1FICA DE VENTAS', margin, y);
                  doc.setDrawColor(24,95,165);
                  doc.setLineWidth(1);
                  doc.line(margin, y+5, pageW-margin, y+5);
                  y += 25;
                  
                  doc.addImage(imgData,'PNG', margin, y, chartW, chartH);
                  doc.setDrawColor(200,200,200);
                  doc.setLineWidth(0.5);
                  doc.rect(margin, y, chartW, chartH);
                  
                  y += chartH + 40;
              } catch(e) { console.warn('html2canvas error:', e); }
          }
          
          document.body.removeChild(container);
      }
"@

$html = $html.Replace($oldChartCode.Replace("`r`n", "`n"), $newChartCode.Replace("`r`n", "`n"))

[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
