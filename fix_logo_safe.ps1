$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$text = [System.IO.File]::ReadAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $utf8NoBom)

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($bytes)

# Replace the base64 string safely
$regex1 = "(?s)const LOGO_DMF_PNG='data:image/png;base64,.*?';"
$repl1 = "const LOGO_DMF_PNG='data:image/png;base64,$b64';"
$text = [regex]::Replace($text, $regex1, $repl1)

# Helper for decoding B64 logic replacement safely
function B64($str) {
    return [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($str))
}

$regex2 = B64 "Y29uc3QgdGV4dFg9bWFyZ2luXCtsb2dvU2l6ZVwrMTI7XHMqZG9jXC5zZXRUZXh0Q29sb3JcKDI1NSwyNTUsMjU1XCk7XHMqZG9jXC5zZXRGb250XCgnaGVsdmV0aWNhJywnYm9sZCdcKTtccypkb2NcLnNldEZvbnRTaXplXCgxN1wpO1xzKmRvY1wudGV4dFwoJ0RlbnRhbFwrRsOhY2lsJyx0ZXh0WCwzMFwpOw=="
$repl2 = B64 "ZG9jLmFkZEltYWdlKExPR09fRE1GX1BORywgJ1BORycsIG1hcmdpbiwgOCwgNjUsIDU0KTsNCiAgICAgIGNvbnN0IHRleHRYPW1hcmdpbis2NSsxNTsNCiAgICAgIGRvYy5zZXRUZXh0Q29sb3IoMjU1LDI1NSwyNTUpOw=="

$text = [regex]::Replace($text, $regex2, $repl2)

[System.IO.File]::WriteAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $text, $utf8NoBom)
Write-Output "Done safely."
