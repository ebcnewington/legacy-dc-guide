#!/usr/bin/env python3
"""Build public-domain Capitol imagery, a photographic home-screen icon, and ONLY the 5.5x8.5-inch PDF."""
from __future__ import annotations
import io,json,html
from pathlib import Path
from urllib.parse import quote
import requests,qrcode
from PIL import Image as PILImage,ImageOps,ImageDraw
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image,PageBreak,Table,TableStyle,HRFlowable

ROOT=Path(__file__).resolve().parents[1]; ASSETS=ROOT/"assets"
ASSETS.mkdir(exist_ok=True)
DATA=json.loads((ROOT/"data/guide.json").read_text("utf-8"))
CAPITOL_SRC="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/United_States_Capitol_-_west_front_edit.jpg/1280px-United_States_Capitol_-_west_front_edit.jpg"
CAPITOL_ORIG="https://upload.wikimedia.org/wikipedia/commons/0/0e/United_States_Capitol_-_west_front_edit.jpg"
SITE="https://ebcnewington.github.io/legacy-dc-guide/"
TEAL=colors.HexColor("#044F56");INK=colors.HexColor("#232323");GOLD=colors.HexColor("#FFAE05")
W,H=5.5*inch,8.5*inch;M=0.25*inch;PW=W-2*M
def get_photo():
    headers={"User-Agent":"EmmanuelBaptistChurchLegacyTravelGuide/1.0 (noncommercial educational guide; GitHub Actions)","Accept":"image/jpeg,image/*"}
    errors=[]
    for uri in (CAPITOL_SRC,CAPITOL_ORIG):
        try:
            r=requests.get(uri,headers=headers,timeout=40)
            r.raise_for_status()
            with PILImage.open(io.BytesIO(r.content)) as img:
                img=img.convert("RGB")
                if img.width<512:raise ValueError("source image too small")
                return img
        except Exception as e:errors.append(str(e))
    raise RuntimeError("Unable to download public-domain Capitol photo: "+ "; ".join(errors))
def write_images():
    im=get_photo()
    # Keep the Capitol dome visible in all crops.
    hero=ImageOps.fit(im,(1680,900),method=PILImage.Resampling.LANCZOS,centering=(.5,.42))
    hero.save(ASSETS/"capitol-hero.jpg","JPEG",quality=88,optimize=True)
    for size in (192,512):
        icon=ImageOps.fit(im,(size,size),method=PILImage.Resampling.LANCZOS,centering=(.5,.43))
        icon.save(ASSETS/f"icon-{size}.png","PNG",optimize=True)
def p(text,style):
    return Paragraph(html.escape(str(text or "")).replace("\n","<br/>"),style)
style={
 "eyebrow":ParagraphStyle("eyebrow",fontName="Helvetica-Bold",fontSize=8,leading=11,textColor=TEAL,spaceAfter=8),
 "title":ParagraphStyle("title",fontName="Times-Bold",fontSize=31,leading=34,textColor=TEAL,spaceAfter=8),
 "section":ParagraphStyle("section",fontName="Helvetica-Bold",fontSize=17,leading=20,textColor=TEAL,spaceBefore=11,spaceAfter=12,keepWithNext=True),
 "h2":ParagraphStyle("h2",fontName="Helvetica-Bold",fontSize=11,leading=14,textColor=TEAL,spaceBefore=10,spaceAfter=5,keepWithNext=True),
 "body":ParagraphStyle("body",fontName="Helvetica",fontSize=9,leading=13.5,textColor=INK,spaceAfter=7),
 "label":ParagraphStyle("label",fontName="Helvetica-Bold",fontSize=8,leading=11,textColor=TEAL,spaceAfter=6),
 "tiny":ParagraphStyle("tiny",fontName="Helvetica-Bold",fontSize=7,leading=9,textColor=TEAL,alignment=1),
}
def qr(url,size=53):
    code=qrcode.QRCode(box_size=4,border=2,error_correction=qrcode.constants.ERROR_CORRECT_M)
    code.add_data(url);code.make(fit=True)
    b=io.BytesIO();code.make_image(fill_color="black",back_color="white").convert("RGB").save(b,"PNG");b.seek(0)
    return Image(b,width=size,height=size)
def qrcodes(pairs):
    pairs=[(t,u) for t,u in pairs if u and str(u).startswith("https://")]
    if not pairs:return []
    tiles=[]
    for title,u in pairs:
        t=Table([[qr(u)],[p(title,style["tiny"])]],colWidths=[PW/2-12])
        t.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
        tiles.append(t)
    rows=[[tiles[i],tiles[i+1] if i+1<len(tiles) else ""] for i in range(0,len(tiles),2)]
    t=Table(rows,colWidths=[PW/2,PW/2],hAlign="LEFT")
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("BOTTOMPADDING",(0,0),(-1,-1),10)]))
    return [t]
def directions(address):
    return "https://www.google.com/maps/search/?api=1&query="+quote(address) if address else ""
def section(title):
    return [p(title,style["section"]),HRFlowable(width="100%",thickness=.7,color=GOLD,spaceAfter=9)]
def footer(canvas,doc):
    canvas.saveState()
    canvas.setStrokeColor(TEAL);canvas.setLineWidth(.4);canvas.line(M,27,W-M,27)
    canvas.setFont("Helvetica",7);canvas.setFillColor(TEAL)
    canvas.drawString(M,19,"EMMANUEL BAPTIST CHURCH  |  LEGACY GROUP")
    canvas.drawRightString(W-M,19,str(doc.page))
    canvas.restoreState()
def build_pdf():
    m=DATA.get("meta",{});story=[]
    story.extend([p("EMMANUEL BAPTIST CHURCH  •  LEGACY GROUP",style["eyebrow"]),
       Image(str(ASSETS/"capitol-hero.jpg"),width=PW,height=200),Spacer(1,15),
       p("Washington, D.C.",style["title"]),
       p(m.get("subtitle","Your travel companion"),style["body"]),
       p(m.get("datesLabel",""),style["eyebrow"]),
       HRFlowable(width="100%",thickness=2,color=GOLD,spaceBefore=8,spaceAfter=12),
       p(m.get("welcome","Welcome aboard!"),style["body"])])
    if m.get("status"):story.append(p(m["status"],style["body"]))
    story.extend([Spacer(1,13),p("Open the mobile guide",style["h2"])])
    story.extend(qrcodes([("Digital tour guide",SITE)]))
    story.append(PageBreak())
    story.extend(section("Daily itinerary"))
    days=DATA.get("itinerary",[])
    if not days:story.append(p("The confirmed activity schedule is being prepared. Please check the digital guide for details.",style["body"]))
    for d in days:
        story.append(p(d.get("label",d.get("date","Trip day")),style["h2"]))
        for e in d.get("items",[]):
            story.append(p((e.get("time") or "Time to be confirmed")+"  •  "+e.get("title","Activity"),style["label"]))
            for k in ("location","summary","notes","description","walking","accessibility"):
                if e.get(k):story.append(p(e[k],style["body"]))
            story.extend(qrcodes([("Directions",directions(e.get("address") or e.get("location",""))),("Official website",e.get("website",""))]))
    story.extend(section("Places & experiences"))
    for place in DATA.get("places",[]):
        story.append(p(place.get("name","Destination"),style["h2"]))
        for k in ("tag","summary","detail","accessibility","walking"):
            if place.get(k):story.append(p(place[k],style["body"]))
        story.extend(qrcodes([("Directions",directions(place.get("address",""))),("Official website",place.get("website",""))]))
    story.extend(section("Traveler essentials"))
    essentials=DATA.get("essentials",{})
    story.append(p("Group contacts",style["h2"]))
    contacts=essentials.get("contacts",[])
    if not contacts:story.append(p("Group leader contact details will be added once confirmed.",style["body"]))
    for c in contacts:
        story.append(p(c.get("name","")+" — "+c.get("role",""),style["label"]))
        if c.get("phone"):story.append(p(c["phone"],style["body"]))
    for name,key in (("Hotel","hotel"),("Transportation","bus")):
        info=essentials.get(key)
        if info:
            story.append(p(name,style["h2"]))
            for k in ("name","address","notes"):
                if info.get(k):story.append(p(info[k],style["body"]))
            story.extend(qrcodes([("Directions",directions(info.get("address","")))]))
    for tip in essentials.get("tips",[]):
        story.append(p(tip.get("title","Helpful reminder"),style["h2"]))
        story.append(p(tip.get("description",tip.get("text","")),style["body"]))
    story.extend(section("Helpful resources"))
    story.append(p("Scan each QR code to visit the corresponding website. Web addresses are intentionally omitted from the print edition.",style["body"]))
    story.extend(qrcodes([(r.get("label","Website"),r.get("url","")) for r in DATA.get("resources",[])]))
    doc=SimpleDocTemplate(str(ROOT/"guide-half-sheet.pdf"),pagesize=(W,H),leftMargin=M,rightMargin=M,topMargin=M,bottomMargin=M+16,
      title="Legacy Group Washington DC — Half-Sheet Guide",author="Emmanuel Baptist Church")
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    print("Created",ROOT/"guide-half-sheet.pdf")
if __name__=="__main__":
    write_images();build_pdf()
