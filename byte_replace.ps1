$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html")

$imgBytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($imgBytes)

$targetStr = "      const textX=margin+logoSize+12;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(17);
      doc.text('Dental+Fácil',textX,30);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);"
$targetStr = $targetStr.Replace("`r`n", "`n")

$replStr = "      const CLINIC_LOGO_B64='data:image/png;base64,$b64';
      doc.addImage(CLINIC_LOGO_B64, 'PNG', margin, 8, 65, 54);
      const textX=margin+65+15;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);"
$replStr = $replStr.Replace("`r`n", "`n")

# Use UTF8 encoding to convert strings to bytes. Since we run this in PowerShell 5.1,
# we have to be careful about characters in the script.
# Actually, write_to_file saves this as UTF8 without BOM.
# PowerShell 5.1 reads it as Windows-1252.
# So $targetStr inside PowerShell will have 'FÃ¡cil' instead of 'Fácil'.
# BUT if we convert to bytes using [System.Text.Encoding]::Default.GetBytes(),
# it converts the Windows-1252 string back to the EXACT UTF-8 bytes!!!
# YES! Default encodingGetBytes of a string read as Default encoding produces the original bytes!

$targetBytes = [System.Text.Encoding]::Default.GetBytes($targetStr)
$replBytes = [System.Text.Encoding]::Default.GetBytes($replStr)

# Find targetBytes in bytes
$matchIndex = -1
for ($i = 0; $i -lt $bytes.Length - $targetBytes.Length; $i++) {
    $match = $true
    for ($j = 0; $j -lt $targetBytes.Length; $j++) {
        if ($bytes[$i+$j] -ne $targetBytes[$j]) {
            $match = $false
            break
        }
    }
    if ($match) {
        $matchIndex = $i
        break
    }
}

if ($matchIndex -eq -1) {
    Write-Output "Target not found!"
} else {
    $newBytes = New-Object byte[] ($bytes.Length - $targetBytes.Length + $replBytes.Length)
    [Array]::Copy($bytes, 0, $newBytes, 0, $matchIndex)
    [Array]::Copy($replBytes, 0, $newBytes, $matchIndex, $replBytes.Length)
    [Array]::Copy($bytes, $matchIndex + $targetBytes.Length, $newBytes, $matchIndex + $replBytes.Length, $bytes.Length - $matchIndex - $targetBytes.Length)

    [System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $newBytes)
    Write-Output "Replaced successfully at index $matchIndex!"
}
