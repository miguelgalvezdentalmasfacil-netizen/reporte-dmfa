$html = Get-Content index.html -Raw
$bad1 = "    function fmt(n){return '`n</body>`n</html>`n+(n||0).toLocaleString('en-US');}"
$bad2 = "    function fmt(n){return '`r`n</body>`r`n</html>`r`n+(n||0).toLocaleString('en-US');}"
$good = "    function fmt(n){return '$'+(n||0).toLocaleString('en-US');}"
$html = $html.Replace($bad1, $good)
$html = $html.Replace($bad2, $good)
[System.IO.File]::WriteAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $html, [System.Text.Encoding]::UTF8)
