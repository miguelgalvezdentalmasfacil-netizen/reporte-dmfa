$html = [System.IO.File]::ReadAllText('index.html', [System.Text.Encoding]::UTF8)
$script = [regex]::Match($html, '(?s)<script>(.*?)</script>').Groups[1].Value
[System.IO.File]::WriteAllText('test_syntax.js', $script, [System.Text.Encoding]::UTF8)
Write-Output "Extracted JS."
