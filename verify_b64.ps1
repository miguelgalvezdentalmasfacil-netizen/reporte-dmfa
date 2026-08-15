$b64 = (Get-Content 'C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo_b64.txt' -Raw).Trim()
$html = [System.IO.File]::ReadAllText('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html', [System.Text.Encoding]::UTF8)
if ($html.Contains($b64)) {
    Write-Output "EXACT MATCH FOUND"
} else {
    Write-Output "MATCH NOT FOUND"
}
