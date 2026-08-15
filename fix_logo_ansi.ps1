$text = [System.IO.File]::ReadAllText("C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html", [System.Text.Encoding]::Default)

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png")
$b64 = [Convert]::ToBase64String($bytes)

# Using Default encoding means UTF-8 characters are loaded as their ANSI byte equivalents.
# We must use regex carefully.

$regex = "(?s)function drawHeader\(\)\{.*?doc\.setTextColor\(26,36,51\);\s*\}"

$repl = @"
    function drawHeader(){
      doc.setFillColor(24,95,165);
      doc.rect(0,0,pageW,68,'F');
      const LOGO_DMF_PNG='data:image/png;base64,$b64';
      doc.addImage(LOGO_DMF_PNG, 'PNG', margin, 8, 65, 54);
      const textX=margin+65+15;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal');
      doc.setFontSize(11);
      doc.text('Reporte Mensual · '+mesNombreCap,textX,48);
      doc.setFontSize(9);
      doc.text('Generado el '+hoy.toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}),pageW-margin,48,{align:'right'});
      doc.setTextColor(26,36,51);
    }
"@

# Since $repl contains '·' and 'á' (in Fácil? No, we removed Fácil!), wait!
# Reporte Mensual · has a '·' (middle dot) and 'Fácil' had an 'á'.
# But wait, my script file `fix_logo_ansi.ps1` is saved as UTF-8 without BOM!
# So when PowerShell parses my script file, it parses `·` as `Â·` if it reads the script as ANSI!
# To avoid any issues, I will encode the replacement string in Base64 so it is 100% ASCII!
