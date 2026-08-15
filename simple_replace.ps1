$text = [System.IO.File]::ReadAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", [System.Text.Encoding]::Default)

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($bytes)

# First replace the base64 string. We use string replace on the start and end of it.
# We know the old base64 starts with iVBORw0KGgoAAAANSUhEUgAAAOAAAACOCAMAAAByr4Zc
# We can just use a regex for the base64 part.
$text = [regex]::Replace($text, "data:image/png;base64,[A-Za-z0-9+/=]+", "data:image/png;base64,$b64")

# Now replace the text block. To avoid encoding issues, we encode the search and replace in Base64!
function B64($str) { return [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($str)) }

# Target:
#       const textX=margin+logoSize+12;
#       doc.setTextColor(255,255,255);
#       doc.setFont('helvetica','bold');
#       doc.setFontSize(17);
#       doc.text('Dental+Fácil',textX,30);
#       doc.setFont('helvetica','normal');
#       doc.setFontSize(11);
#       doc.text('Reporte Mensual · '+mesNombreCap,textX,48);

# We base64 encode the search block and replace block in UTF8, then map them to ANSI before replacing!
$targetUtf8 = [Convert]::FromBase64String("ICAgICAgY29uc3QgdGV4dFg9bWFyZ2luK2xvZ29TaXplKzEyOw0KICAgICAgZG9jLnNldFRleHRDb2xvcigyNTUsMjU1LDI1NSk7DQogICAgICBkb2Muc2V0Rm9udCgnaGVsdmV0aWNhJywnYm9sZCcpOw0KICAgICAgZG9jLnNldEZvbnRTaXplKDE3KTsNCiAgICAgIGRvYy50ZXh0KCdEZW50YWwrRsOhY2lsJyx0ZXh0WCwzMCk7DQogICAgICBkb2Muc2V0Rm9udCgnaGVsdmV0aWNhJywnbm9ybWFsJyk7DQogICAgICBkb2Muc2V0Rm9udFNpemUoMTEpOw0KICAgICAgZG9jLnRleHQoJ1JlcG9ydGUgTWVuc3VhbCDCtyAnK21lc05vbWJyZUNhcCx0ZXh0WCw0OCk7")
$targetAnsi = [System.Text.Encoding]::Default.GetString($targetUtf8)

$replUtf8 = [Convert]::FromBase64String("ICAgICAgZG9jLmFkZEltYWdlKExPR09fRE1GX1BORywgJ1BORycsIG1hcmdpbiwgOCwgNjUsIDU0KTsNCiAgICAgIGNvbnN0IHRleHRYPW1hcmdpbis2NSsxNTsNCiAgICAgIGRvYy5zZXRUZXh0Q29sb3IoMjU1LDI1NSwyNTUpOw0KICAgICAgZG9jLnNldEZvbnQoJ2hlbHZldGljYScsJ25vcm1hbCcpOw0KICAgICAgZG9jLnNldEZvbnRTaXplKDExKTsNCiAgICAgIGRvYy50ZXh0KCdJlcG9ydGUgTWVuc3VhbCDCtyAnK21lc05vbWJyZUNhcCx0ZXh0WCw0OCk7")
$replAnsi = [System.Text.Encoding]::Default.GetString($replUtf8)

$text = $text.Replace($targetAnsi, $replAnsi)

[System.IO.File]::WriteAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $text, [System.Text.Encoding]::Default)
Write-Output "Done. Size: $($text.Length)"
