from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import traceback

styles = getSampleStyleSheet()
body_style = styles['Normal']

html = 'This is a test <img src="https://i.pinimg.com/736x/ba/15/a0/ba15a0a5235cac2bcd07a716f1663d6f.jpg" width="400" /> image.'

try:
    p = Paragraph(html, body_style)
    print("Paragraph created successfully!")
except Exception as e:
    traceback.print_exc()
