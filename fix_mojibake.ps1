$text = Get-Content index.html -Encoding UTF8 -Raw

$find = @(
    'ObregÃ³n', 'EstefanÃa', 'FÃ¡cil', 'FÃ­cil', 'ProyecciÃ³n', 'VERIFICACIÃ“N', 'VERIFICACIÓ"N',
    'VerificaciÃ³n', 'VERIFICACIÃ³N', 'clÃnica', 'ClÃnica', 'clÃnicas', 'ClÃnicas', 'aÃºn',
    'CategorÃa', 'categorÃa', 'DesempeÃ±o', 'PÃ¡gina', 'ViÃ¡ticos', 'ContraseÃ±a', 'automÃ¡ticamente',
    'fÃsico', 'FÃsico', 'DirecciÃ³n', 'AÃ±o', 'aÃ±o', 'AÃ±os', 'aÃ±os', 'grÃ¡fica', 'GrÃ¡fica',
    'MÃ¡s', 'mÃ¡s', 'estÃ¡', 'EstÃ¡', 'calcularÃ¡', 'ðŸ’µ', 'ðŸ’°', 'ðŸ‘¤', 'ðŸ¢', 'ðŸ“¦', 'ðŸš—',
    'ðŸ¤', 'ðŸš™', 'ðŸ¦', 'ðŸ“„', 'â—¦', 'â—', 'âœ“', 'â†“', 'âš™', 'âš ', 'â€”', 'â€¦', 'â€“', 'Â·'
)

$replace = @(
    'Obregón', 'Estefanía', 'Fácil', 'Fácil', 'Proyección', 'VERIFICACIÓN', 'VERIFICACIÓN',
    'Verificación', 'VERIFICACIÓN', 'clínica', 'Clínica', 'clínicas', 'Clínicas', 'aún',
    'Categoría', 'categoría', 'Desempeño', 'Página', 'Viáticos', 'Contraseña', 'automáticamente',
    'físico', 'Físico', 'Dirección', 'Año', 'año', 'Años', 'años', 'gráfica', 'Gráfica',
    'Más', 'más', 'está', 'Está', 'calculará', '💵', '💰', '👤', '🏢', '📦', '🚗',
    '🤝', '🚙', '🏦', '📄', '▫️', '●', '✓', '⬇', '⚙', '⚠', '—', '…', '–', '·'
)

for ($i=0; $i -lt $find.Length; $i++) {
    $text = $text.Replace($find[$i], $replace[$i])
}

# Fix iconMap
$regex = "(?s)buildCustomSelect\('g-cat',\{kind:'icon',iconMap:\{.*?\}\}\);"
$newMap = "buildCustomSelect('g-cat',{kind:'icon',iconMap:{`n  'Viáticos':'🚗','Socios':'🤝','Transporte / Cherokee':'🚙','Reembolso deuda':'🏦',`n  'Ahorro':'💰','Personal':'👤','Operativo':'🏢','Otro':'📦'`n}});"
$text = [regex]::Replace($text, $regex, $newMap)

# Final cleanup
$text = $text.Replace('Dental+Fácil  Reporte Mensual ', 'Dental+Fácil · Reporte Mensual ·')
$text = $text.Replace(' Página', '· Página')
$text = $text.Replace('Obregón ', 'Obregón ·')
$text = $text.Replace(' Nota', '· Nota')
$text = $text.Replace('Obregón, sobraron $200 en Tijuanaâ€¦"', 'Obregón, sobraron $200 en Tijuana…"')
$text = $text.Replace('clínica â€”Plaza', 'clínica —Plaza')
$text = $text.Replace('Ensenadaâ€” en', 'Ensenada— en')
$text = $text.Replace('efectivo - gastos', 'efectivo - gastos')

Set-Content index.html -Value $text -Encoding UTF8
