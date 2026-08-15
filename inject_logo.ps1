$text = Get-Content index.html -Encoding UTF8 -Raw

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($bytes)

$startStr = "const LOGO_DMF_PNG='"
$startIdx = $text.IndexOf($startStr)

if ($startIdx -ge 0) {
    $endIdx = $text.IndexOf("';", $startIdx + $startStr.Length)
    if ($endIdx -ge 0) {
        $oldString = $text.Substring($startIdx, $endIdx - $startIdx + 2)
        $newString = "const LOGO_DMF_PNG='data:image/png;base64,$b64';"
        $text = $text.Replace($oldString, $newString)
        Set-Content index.html -Value $text -Encoding UTF8
        Write-Output "Successfully replaced logo."
    } else {
        Write-Output "End of logo string not found."
    }
} else {
    Write-Output "Start of logo string not found."
}
