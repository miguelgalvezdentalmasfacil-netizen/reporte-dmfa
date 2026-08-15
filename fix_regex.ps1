$path = "C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

$text = [regex]::Replace($text, "Variaci.*?n", "Variación")
$text = [regex]::Replace($text, "CR.*?TICO", "CRÍTICO")
$text = [regex]::Replace($text, "VERIFICACI.*?N DE CORTE \(F.*?SICO VS SISTEMA\)", "VERIFICACIÓN DE CORTE (FÍSICO VS SISTEMA)")
$text = [regex]::Replace($text, "let estado = '.*?PTIMO';", "let estado = 'ÓPTIMO';")

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
[System.IO.File]::WriteAllBytes($path, $outBytes)
Write-Output "Fixed via Regex!"
