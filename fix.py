import os

path = r"C:\Users\Miguel Galvez Ventas\Documents\reporte-dmfa\index.html"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("VariaciÃ³n", "Variación")
text = text.replace("DESEMPEÃ‘O", "DESEMPEÑO")
text = text.replace("CLÃ NICA", "CLÍNICA")
text = text.replace("ClÃ­nica", "Clínica")
text = text.replace("Ã“PTIMO", "ÓPTIMO")
text = text.replace("CRÃ TICO", "CRÍTICO")
text = text.replace("PRÃ“XIMO", "PRÓXIMO")
text = text.replace("â€¢", "•")
text = text.replace("PROYECCIÃ“N", "PROYECCIÓN")
text = text.replace("VERIFICACIÃ“N", "VERIFICACIÓN")
text = text.replace("FÃ SICO", "FÍSICO")

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed strings.")
