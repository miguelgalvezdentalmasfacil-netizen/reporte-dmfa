$path = "C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html"
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$text = $text.Replace("VariaciÃ³n", "Variación")
$text = $text.Replace("DESEMPEÃ‘O", "DESEMPEÑO")
$text = $text.Replace("CLÃ NICA", "CLÍNICA")
$text = $text.Replace("ClÃ­nica", "Clínica")
$text = $text.Replace("Ã“PTIMO", "ÓPTIMO")
$text = $text.Replace("CRÃ TICO", "CRÍTICO")
$text = $text.Replace("PRÃ“XIMO", "PRÓXIMO")
$text = $text.Replace("â€¢", "•")
$text = $text.Replace("PROYECCIÃ“N", "PROYECCIÓN")
$text = $text.Replace("VERIFICACIÃ“N", "VERIFICACIÓN")
$text = $text.Replace("FÃ SICO", "FÍSICO")

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
Write-Output "Fixed strings."
