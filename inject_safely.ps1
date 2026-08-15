$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Read the image and base64 encode it
$imgBytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($imgBytes)

# The target and replacement strings encoded in base64 (UTF-8 bytes)
$targetB64 = "ICAgICAgY29uc3QgdGV4dFg9bWFyZ2luK2xvZ29TaXplKzEyOw0KICAgICAgZG9jLnNldFRleHRDb2xvcigyNTUsMjU1LDI1NSk7DQogICAgICBkb2Muc2V0Rm9udCgnaGVsdmV0aWNhJywnYm9sZCcpOw0KICAgICAgZG9jLnNldEZvbnRTaXplKDE3KTsNCiAgICAgIGRvYy50ZXh0KCdEZW50YWwrRsOhY2lsJyx0ZXh0WCwzMCk7DQogICAgICBkb2Muc2V0Rm9udCgnaGVsdmV0aWNhJywnbm9ybWFsJyk7DQogICAgICBkb2Muc2V0Rm9udFNpemUoMTEpOw0KICAgICAgZG9jLnRleHQoJ1JlcG9ydGUgTWVuc3VhbCDCtyAnK21lc05vbWJyZUNhcCx0ZXh0WCw0OCk7"
$replB64 = "ICAgICAgY29uc3QgQ0xJTklDX0xPR09fQjY0PSdkYXRhOmltYWdlL3BuZztiYXNlNjQsUExBQ0VIT0xERVInOw0KICAgICAgZG9jLmFkZEltYWdlKENMSU5JQ19MT0dPX0I2NCwgJ1BORycsIG1hcmdpbiwgOCwgNjUsIDU0KTsNCiAgICAgIGNvbnN0IHRleHRYPW1hcmdpbis2NSsxNTsNCiAgICAgIGRvYy5zZXRUZXh0Q29sb3IoMjU1LDI1NSwyNTUpOw0KICAgICAgZG9jLnNldEZvbnQoJ2hlbHZldGljYScsJ25vcm1hbCcpOw0KICAgICAgZG9jLnNldEZvbnRTaXplKDExKTsNCiAgICAgIGRvYy50ZXh0KCdSZXBvcnRlIE1lbnN1YWwgwrcgJyttZXNOb21icmVDYXAsdGV4dFgsNDgpOw=="

$targetStr = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($targetB64))
$replStrTemplate = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($replB64))

$replStr = $replStrTemplate.Replace("PLACEHOLDER", $b64)

# To handle potential \n vs \r\n issues in the file, we can normalize line endings for the check.
# But it's safer to just replace.
if ($text.Contains($targetStr)) {
    $text = $text.Replace($targetStr, $replStr)
    $newBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    [System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $newBytes)
    Write-Output "Successfully replaced logo block!"
} else {
    # If not found with CRLF, try with LF
    $targetStrLF = $targetStr.Replace("`r`n", "`n")
    if ($text.Contains($targetStrLF)) {
        $replStrLF = $replStr.Replace("`r`n", "`n")
        $text = $text.Replace($targetStrLF, $replStrLF)
        $newBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
        [System.IO.File]::WriteAllBytes("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", $newBytes)
        Write-Output "Successfully replaced logo block (with LF)!"
    } else {
        Write-Output "Could not find target string in index.html!"
    }
}
