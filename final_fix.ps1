$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$text = [System.IO.File]::ReadAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $utf8NoBom)

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($bytes)

$regex = "(?s)function drawHeader\(\)\{.*?doc\.setTextColor\(26,36,51\);\s*\}"

$repl = @"
    function drawHeader(){
      doc.setFillColor(24,95,165);
      doc.rect(0,0,pageW,68,'F');
      const LOGO_DMF_PNG='data:image/png;base64,$b64';
      doc.addImage(LOGO_DMF_PNG, 'PNG', margin, 8, 65, 54);
      const textX=margin+65+15;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);
      doc.setFontSize(9);
      doc.text('Generado el '+hoy.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}),pageW-margin,48,{align:'right'});
      doc.setTextColor(26,36,51);
    }
"@

$newText = [regex]::Replace($text, $regex, $repl)

# Write using bytes to GUARANTEE no BOM!
$outBytes = $utf8NoBom.GetBytes($newText)
[System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $outBytes)
Write-Output "Done! New Size: $($outBytes.Length)"
