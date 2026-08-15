$path = "C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

$text = [regex]::Replace($text, "Variaci\S+n", "Variaci\xf3n")
$text = [regex]::Replace($text, "DESEMPE\S+O Y CUMPLIMIENTO", "DESEMPE\xd1O Y CUMPLIMIENTO")
$text = [regex]::Replace($text, "POR CL\S+NICA", "POR CL\xcdNICA")
$text = [regex]::Replace($text, "Cl\S+nica', 'Meta'", "Cl\xednica', 'Meta'")
$text = [regex]::Replace($text, "let estado = '\S+PTIMO';", "let estado = '\xd3PTIMO';")
$text = [regex]::Replace($text, "estado = 'CR\S+TICO';", "estado = 'CR\xcdTICO';")
$text = [regex]::Replace($text, "PR\S+XIMO", "PR\xd3XIMO")
$text = [regex]::Replace($text, "PROYECCI\S+N", "PROYECCI\xd3N")
$text = [regex]::Replace($text, "VERIFICACI\S+N DE CORTE", "VERIFICACI\xd3N DE CORTE")
$text = [regex]::Replace($text, "\(F\S+SICO VS SISTEMA\)", "(F\xcdSICO VS SISTEMA)")
$text = [regex]::Replace($text, "F\S+sico recibido", "F\xedsico recibido")

$text = [regex]::Replace($text, "\.push\('\S+ Reforzar", ".push('\u2022 Reforzar")
$text = [regex]::Replace($text, "\.push\('\S+ Mantener", ".push('\u2022 Mantener")
$text = [regex]::Replace($text, "\.push\('\S+ Apoyar", ".push('\u2022 Apoyar")
$text = [regex]::Replace($text, "\.push\('\S+ Revisar", ".push('\u2022 Revisar")
$text = [regex]::Replace($text, "\.push\('\S+ Dar", ".push('\u2022 Dar")
$text = [regex]::Replace($text, "quien\+\(dc\.nota\?' \S+ Nota", "quien+(dc.nota?' \xb7 Nota")

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
[System.IO.File]::WriteAllBytes($path, $outBytes)
Write-Output "Fixed via ASCII Regex!"
