import os
import re
import base64

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

image_path = r'C:\Users\Miguel Galvez Ventas\.gemini\antigravity\brain\3d953be3-85a2-4231-a93b-09ce4726ee50\.user_uploaded\media_1786560530171.png'
with open(image_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

# Find const LOGO_DMF_PNG=... and replace it
# Use a non-greedy regex that matches the string literal
text = re.sub(r"const LOGO_DMF_PNG='data:image/png;base64,.*?';", 
              f"const LOGO_DMF_PNG='data:image/png;base64,{b64}';", 
              text, flags=re.DOTALL)

# Replace the text logic with addImage
old_code = r"""const textX=margin+logoSize+12;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(17);
      doc.text('Dental+Fácil',textX,30);"""

new_code = r"""doc.addImage(LOGO_DMF_PNG, 'PNG', margin, 8, 65, 54);
      const textX=margin+65+15;
      doc.setTextColor(255,255,255);"""

text = text.replace(old_code, new_code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done.")
