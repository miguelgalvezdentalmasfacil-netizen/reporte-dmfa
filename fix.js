const fs = require('fs');
const path = 'C:\\Users\\Miguel Galvez Ventas\\Documents\\reporte-dmfa\\index.html';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(/VariaciÃ³n/g, 'Variación');
text = text.replace(/DESEMPEÃ‘O/g, 'DESEMPEÑO');
text = text.replace(/CLÃ NICA/g, 'CLÍNICA');
text = text.replace(/ClÃ­nica/g, 'Clínica');
text = text.replace(/Ã“PTIMO/g, 'ÓPTIMO');
text = text.replace(/CRÃ TICO/g, 'CRÍTICO');
text = text.replace(/PRÃ“XIMO/g, 'PRÓXIMO');
text = text.replace(/â€¢/g, '•');
text = text.replace(/PROYECCIÃ“N/g, 'PROYECCIÓN');
text = text.replace(/VERIFICACIÃ“N/g, 'VERIFICACIÓN');
text = text.replace(/FÃ SICO/g, 'FÍSICO');

fs.writeFileSync(path, text, 'utf8');
console.log('Fixed strings.');
