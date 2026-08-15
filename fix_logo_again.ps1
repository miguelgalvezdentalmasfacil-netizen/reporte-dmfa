$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

$imgBytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560455916.png")
$b64 = [Convert]::ToBase64String($imgBytes)

$regex = "(?s)const CLINIC_LOGO_B64='data:image/png;base64,.*?';"
$repl = "const CLINIC_LOGO_B64='data:image/png;base64,$b64';"

$newText = [regex]::Replace($text, $regex, $repl)

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($newText)
[System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $outBytes)
Write-Output "Logo replaced successfully!"
