$b64 = Get-Content "C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo_b64.txt" -Raw
$b64 = $b64.Trim()

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

$newDrawHeader = @"
    function drawHeader(doc){
      doc.setFillColor(24,95,165);
      doc.rect(0,0,pageW,80,'F');
      
      doc.addImage("data:image/png;base64,$b64", 'PNG', margin, 20, 40, 40);
      
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.text('INFORME MENSUAL DE RENDIMIENTO DE VENTAS', pageW - margin, 35, {align: 'right'});
      
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Mes de Evaluaci\u00F3n: '+mesNombreCap, pageW - margin, 55, {align: 'right'});
      
      doc.setFontSize(9);
      doc.text('Generado el '+hoy.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}), margin, 70);
    }
"@

$regexReplace = "(?s)    function drawHeader\(doc\).*?margin, 65\);\s*\}"

$newText = [regex]::Replace($text, $regexReplace, $newDrawHeader)

[System.IO.File]::WriteAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $newText, [System.Text.Encoding]::UTF8)
Write-Output "Successfully updated drawHeader to use Isotipo!"
