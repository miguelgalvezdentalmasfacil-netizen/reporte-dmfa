$b64 = (Get-Content 'C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo_b64.txt' -Raw).Trim()
$html = [System.IO.File]::ReadAllText('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html', [System.Text.Encoding]::UTF8)
$html = [regex]::Replace($html, '(?s)doc\.addImage\("data:image/png;base64,[^"]+"', 'doc.addImage("data:image/png;base64,' + $b64 + '"')
[System.IO.File]::WriteAllText('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html', $html, [System.Text.Encoding]::UTF8)
Write-Host "Done"
