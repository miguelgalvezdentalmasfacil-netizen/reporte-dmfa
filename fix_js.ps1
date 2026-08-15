$text = [System.IO.File]::ReadAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", [System.Text.Encoding]::UTF8)

$target = "      const textX=margin+logoSize+12;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(17);
      doc.text('Dental+Fácil',textX,30);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);"

# Ensure exact LF vs CRLF match by standardizing line endings
$text = $text -replace "`r`n", "`n"
$target = $target -replace "`r`n", "`n"

$repl = "      doc.addImage(LOGO_DMF_PNG, 'PNG', margin, 8, 65, 54);
      const textX=margin+65+15;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);"

$text = $text.Replace($target, $repl)

# Convert back to CRLF before saving if desired, but UTF-8 string is fine.
$bytes = [System.Text.Encoding]::UTF8.GetBytes($text)

# Check for BOM. The original file might not have a BOM. We write it without BOM.
[System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $bytes)
Write-Output "JavaScript block replaced successfully!"
