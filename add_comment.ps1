$html = [System.IO.File]::ReadAllText('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html', [System.Text.Encoding]::UTF8)
$html = $html -replace 'doc\.addImage\("data:image/png;base64', "// Isotipo extraido directamente del archivo adjunto`ndoc.addImage(`"data:image/png;base64"
[System.IO.File]::WriteAllText('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html', $html, [System.Text.Encoding]::UTF8)
