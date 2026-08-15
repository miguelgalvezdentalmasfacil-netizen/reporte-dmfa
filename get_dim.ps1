Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo-dmf.png')
Write-Output ("Width: " + $img.Width + " Height: " + $img.Height)
$img.Dispose()

$b64 = (Get-Content 'C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo-dmf.png' -Encoding Byte)
$b64String = [System.Convert]::ToBase64String($b64)
Set-Content -Path 'C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\isotipo_b64.txt' -Value $b64String -Encoding ASCII
