#!/usr/bin/env python3
"""Generate the color 5.5 × 8.5 in Washington Legacy Tour booklet and Capitol imagery."""
from __future__ import annotations
import io,json,html,requests,qrcode
from pathlib import Path
from urllib.parse import quote
from PIL import Image as PILImage,ImageOps
from reportlab.pdfgen import canvas as Canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image,PageBreak,Table,TableStyle,HRFlowable,KeepTogether,Flowable
from reportlab.lib.utils import ImageReader
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as ReportLabTTFont
from fontTools.ttLib import TTFont as FontToolsTTFont
from fontTools.varLib.instancer import instantiateVariableFont
import tempfile

ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/"assets";ASSETS.mkdir(exist_ok=True)
G=json.loads((ROOT/"data/guide.json").read_text(encoding="utf-8"))
PHOTO="https://images.unsplash.com/photo-1730888515663-5058024f2e60?auto=format&fit=crop&w=1800&q=85"
PHOTO_FALLBACK="https://upload.wikimedia.org/wikipedia/commons/0/0e/United_States_Capitol_-_west_front_edit.jpg"
SITE="https://ebcnewington.github.io/legacy-dc-guide/"
W,H=5.5*inch,8.5*inch;M=.25*inch;RIGHT=W-M;BODY=W-2*M
TEAL=colors.HexColor("#044F56");DARK=colors.HexColor("#033941");GOLD=colors.HexColor("#FFAE05")
CREAM=colors.HexColor("#EDE0CA");PALE=colors.HexColor("#FAF8F1");INK=colors.HexColor("#232323")
GREY=colors.HexColor("#566767");WHITE=colors.white;LTTEAL=colors.HexColor("#7BC2C8")
def load_capitol():
    if (ASSETS/"capitol-hero.jpg").exists() and (ASSETS/"icon-192.png").exists() and (ASSETS/"icon-512.png").exists():
        print("Using existing Capitol imagery")
        # Apple uses a real 180px PNG at the site root, not the manifest fallback.
        with PILImage.open(ASSETS/"icon-512.png") as cached:
            for filename in ("apple-touch-icon.png","apple-touch-icon-capitol-2026.png","apple-touch-icon-180x180.png"):
                ImageOps.fit(cached.convert("RGB"),(180,180),method=PILImage.Resampling.LANCZOS,centering=(.5,.41)).save(ROOT/filename,"PNG",optimize=True)
        return
    headers={"User-Agent":"Mozilla/5.0 (compatible; EmmanuelLegacyGuide/1.0)"}
    img=None; errors=[]
    for url in (PHOTO,PHOTO_FALLBACK):
        try:
            res=requests.get(url,headers=headers,timeout=35)
            res.raise_for_status()
            img=PILImage.open(io.BytesIO(res.content)).convert("RGB")
            if img.width<700:raise ValueError("image resolution too small")
            break
        except Exception as ex:errors.append(str(ex))
    if img is None:raise RuntimeError("Could not download Capitol photograph: "+"; ".join(errors))
    ImageOps.fit(img,(1680,900),method=PILImage.Resampling.LANCZOS,centering=(.5,.44)).save(ASSETS/"capitol-hero.jpg","JPEG",quality=89,optimize=True)
    for n in (192,512):
        ImageOps.fit(img,(n,n),method=PILImage.Resampling.LANCZOS,centering=(.5,.45)).save(ASSETS/f"icon-{n}.png","PNG",optimize=True)
    for filename in ("apple-touch-icon.png","apple-touch-icon-capitol-2026.png","apple-touch-icon-180x180.png"):
        ImageOps.fit(img,(180,180),method=PILImage.Resampling.LANCZOS,centering=(.5,.42)).save(ROOT/filename,"PNG",optimize=True)
def qr_image(url):
    code=qrcode.QRCode(box_size=8,border=3,error_correction=qrcode.constants.ERROR_CORRECT_M);code.add_data(url);code.make(fit=True)
    img=code.make_image(fill_color="#044F56",back_color="#FFFFFF").convert("RGB")
    b=io.BytesIO();img.save(b,format="PNG");b.seek(0);return b
def para(text,kind="body"):
    return Paragraph(html.escape(str(text or "")).replace("\n","<br/>"),S[kind])
def map_url(address):
    return "https://www.google.com/maps/search/?api=1&query="+quote(address) if address else ""
def register_brand_typefaces():
    """Embed open-licensed Montserrat into the print guide; keep files out of the public repository."""
    try:
        uri="https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf"
        rsp=requests.get(uri,timeout=20,headers={"User-Agent":"EBC-Legacy-Tour-Print/1.0"})
        rsp.raise_for_status()
        font_dir=Path(tempfile.mkdtemp(prefix="legacy-pdf-font-"))
        for name,weight in (("Montserrat-Regular",400),("Montserrat-Bold",700)):
            ft=FontToolsTTFont(io.BytesIO(rsp.content))
            ft=instantiateVariableFont(ft,{"wght":weight},inplace=True)
            ft.flavor=None
            path=font_dir/(name+".ttf")
            ft.save(path)
            pdfmetrics.registerFont(ReportLabTTFont(name,str(path)))
            ft.close()
        print("Using Montserrat typography for PDF text")
        return "Montserrat-Regular","Montserrat-Bold"
    except Exception as err:
        print("Montserrat font download unavailable; using embedded PDF defaults:",err)
        return "Helvetica","Helvetica-Bold"

FONT_REG,FONT_BOLD=register_brand_typefaces()
S={
 "page":ParagraphStyle("page",fontName=FONT_BOLD,fontSize=18,leading=21,textColor=TEAL,spaceAfter=12),
 "eyebrow":ParagraphStyle("eyebrow",fontName=FONT_BOLD,fontSize=8,leading=11,textColor=TEAL,spaceAfter=9),
 "section":ParagraphStyle("section",fontName=FONT_BOLD,fontSize=12,leading=15,textColor=TEAL,spaceBefore=17,spaceAfter=7,keepWithNext=True),
 "time":ParagraphStyle("time",fontName=FONT_BOLD,fontSize=8,leading=10.5,textColor=TEAL),
 "title":ParagraphStyle("title",fontName=FONT_BOLD,fontSize=9.1,leading=12.3,textColor=INK,spaceAfter=4),
 "body":ParagraphStyle("body",fontName=FONT_REG,fontSize=8.15,leading=11.8,textColor=INK,spaceAfter=7),
 "small":ParagraphStyle("small",fontName=FONT_REG,fontSize=7.3,leading=10.5,textColor=GREY,spaceAfter=5),
 "white":ParagraphStyle("white",fontName=FONT_BOLD,fontSize=8,leading=11,textColor=WHITE,alignment=1),
 "qr":ParagraphStyle("qr",fontName=FONT_BOLD,fontSize=7.4,leading=10,textColor=TEAL,alignment=1),
 "heading":ParagraphStyle("heading",fontName=FONT_BOLD,fontSize=10,leading=13,textColor=TEAL,spaceAfter=5),
}
def clip_to_white_print_border(c):
    """Actual white border: all full-page colors/images clipped to 1/4 inch inside the paper."""
    c.setFillColor(WHITE);c.rect(0,0,W,H,fill=1,stroke=0)
    clipping=c.beginPath()
    clipping.rect(M,M,W-2*M,H-2*M)
    c.clipPath(clipping,stroke=0,fill=0)

def draw_cover(c,doc):
    c.saveState()
    clip_to_white_print_border(c)
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    photo=ImageReader(str(ASSETS/"capitol-hero.jpg"))
    c.drawImage(photo,0,H-330,width=W,height=330,preserveAspectRatio=False,mask="auto")
    # Subtle dark teal edge at the lower photograph
    # Brand-safe dark strip lets the official cream-and-gold church lockup remain legible.
    c.setFillColor(TEAL);c.rect(0,H-70,W,70,fill=1,stroke=0)
    try:
        drawing=svg2rlg(str(ASSETS/"ebc-primary-on-dark.svg"))
        if drawing and drawing.width>0:
            scale=116/drawing.width
            drawing.scale(scale,scale)
            renderPDF.draw(drawing,c,24,H-59)
    except Exception as e:
        print("Cover logo could not be rendered:",e)
    c.setFillColor(TEAL);c.rect(0,H-336,W,6,fill=1,stroke=0)
    c.setFillColor(GOLD);c.rect(0,H-341,W,5,fill=1,stroke=0)
    c.setFillColor(TEAL);c.setFont(FONT_BOLD,29);c.drawCentredString(W/2,229,"WASHINGTON")
    c.setFont(FONT_BOLD,34);c.drawCentredString(W/2,190,"LEGACY TOUR")
    c.setFont(FONT_BOLD,12);c.drawCentredString(W/2,160,"NOVEMBER 9–12, 2026")
    c.setFillColor(WHITE);c.roundRect(30,19,W-60,116,12,fill=1,stroke=0)
    c.setFillColor(TEAL);c.setFont(FONT_BOLD,10);c.drawString(48,108,"THE COMPLETE DIGITAL GUIDE")
    c.setFont(FONT_REG,8.2);c.drawString(48,92,"Scan for times, directions, links, trivia,")
    c.drawString(48,80,"and updates throughout the trip.")
    q=qr_image(SITE);c.drawImage(ImageReader(q),W-142,26,width=102,height=102)
    c.setFillColor(TEAL);c.rect(0,0,W,12,fill=1,stroke=0)
    c.restoreState()
def draw_page(c,doc):
    c.saveState()
    clip_to_white_print_border(c)
    c.setFillColor(PALE);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(TEAL);c.rect(0,H-52,W,52,fill=1,stroke=0)
    c.setFillColor(GOLD);c.rect(0,H-56,W,4,fill=1,stroke=0)
    c.setFillColor(WHITE);c.setFont(FONT_BOLD,10)
    c.drawString(M,H-31,"WASHINGTON LEGACY TOUR")
    c.setFont(FONT_REG,7.4);c.drawRightString(RIGHT,H-30,"NOV 9–12, 2026")
    c.setStrokeColor(LTTEAL);c.setLineWidth(.5);c.line(M+2,33,RIGHT-2,33)
    c.setFont(FONT_REG,6.8);c.setFillColor(TEAL)
    c.drawString(M+2,21,"EMMANUEL BAPTIST CHURCH")
    c.drawRightString(RIGHT-2,21,f"{doc.page:02d}")
    c.restoreState()
def section(title):
    return [para(title,"section"),HRFlowable(width="100%",thickness=1,color=GOLD,spaceAfter=9)]
def qr_tile(label,url):
    if not url or not str(url).startswith("https://"):return None
    img=Image(qr_image(url),width=54,height=54)
    t=Table([[img],[para(label,"qr")]],colWidths=[BODY/2-12],hAlign="CENTER")
    t.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
    return t
def qr_grid(entries):
    tiles=[qr_tile(n,u) for n,u in entries]
    tiles=[t for t in tiles if t]
    if not tiles:return []
    rows=[[tiles[i],tiles[i+1] if i+1<len(tiles) else ""] for i in range(0,len(tiles),2)]
    t=Table(rows,colWidths=[BODY/2,BODY/2])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),WHITE),("BOX",(0,0),(-1,-1),.45,colors.HexColor("#DDE8E3")),("VALIGN",(0,0),(-1,-1),"TOP"),("BOTTOMPADDING",(0,0),(-1,-1),11),("TOPPADDING",(0,0),(-1,-1),7)]))
    return [Spacer(1,7),t,Spacer(1,12)]
def compact_day_map_links(entries):
    """One small QR row rather than a tall block that spills to a blank page."""
    tiles=[]
    for label,url in entries[:2]:
        qr=Image(qr_image(url),width=42,height=42)
        caption=para(label,"small")
        tile=Table([[qr,caption]],colWidths=[47,BODY/max(1,len(entries))-55])
        tile.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),2),
                                  ("RIGHTPADDING",(0,0),(-1,-1),2),("TOPPADDING",(0,0),(-1,-1),2),
                                  ("BOTTOMPADDING",(0,0),(-1,-1),2)]))
        tiles.append(tile)
    if not tiles:return []
    row=Table([tiles],colWidths=[BODY/len(tiles)]*len(tiles))
    row.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),WHITE),("BOX",(0,0),(-1,-1),.45,colors.HexColor("#DDE8E3")),("TOPPADDING",(0,0),(-1,-1),4),
                             ("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return [Spacer(1,7),row,Spacer(1,7)]

def card(title,detail,color=WHITE):
    t=Table([[para(title,"heading")],[para(detail,"body")]],colWidths=[BODY-20],hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),color),("BOX",(0,0),(-1,-1),.5,colors.HexColor("#DCE7E3")),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    return t
def write_notes(story,count=4,title="Meeting-point and bus notes"):
    story.extend(section(title))
    for _ in range(count):
        story.append(Spacer(1,13));story.append(HRFlowable(width="100%",thickness=.5,color=colors.HexColor("#AABAB5"),spaceAfter=7))
class FullDayNotes(Flowable):
    """One full, ruled notes page after each day's schedule."""
    def __init__(self, day_name):
        super().__init__()
        self.day_name=day_name
    def wrap(self,avail_width,avail_height):
        self.width=avail_width
        self.height=max(120,avail_height-4)
        return (self.width,self.height)
    def draw(self):
        c=self.canv
        c.setFillColor(TEAL)
        c.setFont(FONT_BOLD,22)
        c.drawString(0,self.height-36,"Notes")
        c.setFont(FONT_BOLD,9)
        c.setFillColor(GREY)
        c.drawString(0,self.height-55,self.day_name.upper())
        c.setStrokeColor(GOLD)
        c.setLineWidth(2.2)
        c.line(0,self.height-69,self.width,self.height-69)
        c.setFont(FONT_REG,8)
        c.setFillColor(GREY)
        c.drawString(0,self.height-88,"Bus stop instructions:")
        c.setStrokeColor(colors.HexColor("#AABAB5"))
        c.setLineWidth(.65)
        y=self.height-108
        while y>=14:
            c.line(0,y,self.width,y)
            y-=21

def itinerary(story):
    days=G.get("itinerary",[])
    for i,d in enumerate(days):
        story.append(PageBreak())
        story.extend([para(d.get("label","Day "+str(i+1)).upper(),"eyebrow"),para(d.get("heading","Daily itinerary"),"page"),
            para("Times and transportation arrangements may change. Follow the group leaders' instructions.","small"),Spacer(1,4)])
        rows=[]
        for e in d.get("items",[]):
            name=e.get("title","Stop")
            if e.get("tentative"):name+="  (estimated)"
            note=e.get("description") or e.get("notes") or ""
            if len(note)>155:note=note[:152].rsplit(" ",1)[0]+"…"
            part=[para(name,"title")]
            if e.get("location"):part.append(para(e["location"],"small"))
            if note:part.append(para(note,"small"))
            rows.append([para(e.get("time","TBD"),"time"),part])
        if rows:
            t=Table(rows,colWidths=[84,BODY-84],hAlign="LEFT",repeatRows=0)
            t.setStyle(TableStyle([("ROWBACKGROUNDS",(0,0),(-1,-1),[WHITE,colors.HexColor("#F2F5EF")]),("LINEBELOW",(0,0),(-1,-2),.5,colors.HexColor("#D4E2DE")),("LEFTPADDING",(0,0),(0,-1),9),("LEFTPADDING",(1,0),(1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),("VALIGN",(0,0),(-1,-1),"TOP")]))
            story.append(t)
        story.append(Spacer(1,13))
        if i==2:
            story.append(card("Possible Wednesday motorcoach pickup","300 block L’Enfant Plaza SW, south of Independence Avenue SW and north of Frontage Road SW. NOT CONFIRMED. Follow your leader's day-of directions.",colors.HexColor("#FFF0C6")))
            # Do not add a trailing spacer here: on a full Wednesday page
            # a single overflowing spacer creates an otherwise blank sheet.
        # A pair of QR shortcuts uses space otherwise lost on shorter itinerary days.
        day_maps=[
            [("National Harbor visitor map","https://www.nationalharbor.com/about/maps/")],
            [],
            [],
            [("Arlington visitor information","https://www.arlingtoncemetery.mil/Visit")]
        ]
        if day_maps[i]:story.extend(compact_day_map_links(day_maps[i]))
        if i in (0,3):write_notes(story,3 if i==0 else 5,"Additional bus notes")
        # Every single day gets its own full-page sheet of ruled notes.
        story.append(PageBreak())
        story.append(FullDayNotes(d.get("label","Day "+str(i+1))))
def about(story):
    story.append(PageBreak());story.extend([para("Sights & experiences","page"),para("Discover more about the places on our itinerary, then explore them further in the digital guide.","small")])
    order=["mount-vernon","washington-monument","wwii","lincoln","vietnam","korea","jefferson","reflecting-pool","museum-bible","national-mall","capitol","arlington"]
    for j,slug in enumerate(order):
        p=next((p for p in G.get("places",[]) if p.get("id")==slug),None)
        if not p:continue
        story.extend(section(p.get("name","Place")))
        story.append(para(p.get("summary",""),"body"))
        if p.get("detail"):story.append(para(p["detail"],"small"))
        if p.get("restrooms"):story.append(para("Restrooms: "+p["restrooms"],"small"))
        if p.get("audio"):story.append(para("Audio available in the online guide.", "small"))
        if p.get("website") and j%4==0:story.extend(qr_grid([("Official information",p["website"])]))
def essentials(story):
    e=G.get("essentials",{})
    story.append(PageBreak());story.extend([para("Traveler essentials","page")])
    story.extend(section("Call your trip leaders"))
    for c in e.get("contacts",[]):
        story.append(card(c.get("name","Contact")+"  |  "+c.get("role",""),c.get("phone","")))
        story.append(Spacer(1,8))
    story.extend(section("Hotel addresses"))
    for h in e.get("hotels",[]):
        story.append(card(h.get("name","Hotel"),h.get("address","")+"  |  Tel: "+h.get("phone","Check with front desk")+"  •  "+h.get("notes","")))
        story.append(Spacer(1,8))
    story.extend(section("Preparing for the trip"))
    for t in e.get("tips",[]):
        story.append(para(t.get("title","Reminder"),"heading"))
        story.append(para(t.get("description",""),"body"))
def faqs(story):
    story.append(Spacer(1,12));story.append(para("Questions & answers","page"))
    for group in G.get("faq",[]):
        story.extend(section(group.get("topic","Frequently asked")))
        for item in group.get("items",[]):
            story.append(para(item.get("q",""),"heading"))
            story.append(para(item.get("a",""),"body"))
def resources(story):
    story.append(PageBreak());story.append(para("Maps & useful links","page"))
    story.append(para("Use the QR codes to open official visitor maps and information. The digital guide also has live navigation links.","body"))
    entries=[(m.get("label","Map"),m.get("url","")) for m in G.get("maps",[])][:5]
    story.extend(qr_grid(entries))
    story.extend(section("Try the trivia challenge"))
    story.append(para("Discover fascinating facts about the Capitol, Mount Vernon, the memorials, and Arlington. The mobile quiz provides an original source for every answer.","body"))
    story.append(para("Open the online guide using the QR code on the front cover, then choose Trivia.","small"))
    # Daily notes pages are provided immediately after all four itineraries.
class WhiteBorderDocTemplate(SimpleDocTemplate):
    def afterPage(self):
        super().afterPage()
        # Paint AFTER body flowables. A background-only clip cannot prevent
        # story tables from antialiasing into the intended white border.
        c=self.canv
        c.saveState()
        c.setFillColor(WHITE)
        c.rect(0,0,W,M,fill=1,stroke=0)
        c.rect(0,H-M,W,M,fill=1,stroke=0)
        c.rect(0,M,M,H-2*M,fill=1,stroke=0)
        c.rect(W-M,M,M,H-2*M,fill=1,stroke=0)
        c.restoreState()

def main():
    load_capitol()
    path=ROOT/"guide-half-sheet.pdf"
    doc=WhiteBorderDocTemplate(str(path),pagesize=(W,H),leftMargin=M,rightMargin=M,topMargin=M+44,bottomMargin=M+24,author="Emmanuel Baptist Church",title="Washington Legacy Tour | November 9-12 2026",pageCompression=1)
    story=[Spacer(1,1),PageBreak(),
        para("November 9–12, 2026","eyebrow"),para("Your four-day guide","page"),
        para("Everything you need to find your way, keep in touch, and enjoy the journey.","body"),Spacer(1,6)]
    for d in G.get("itinerary",[]):
        content=d.get("items",[])
        highlights="  •  ".join(x.get("title","") for x in content if x.get("important"))[:160]
        story.append(card(d.get("label","Day")+"  |  "+d.get("heading",""),highlights))
        story.append(Spacer(1,9))
    story.extend(section("Good to know"))
    story.extend([para("MONDAY DEPARTURE  •  10:00 AM  •  EMMANUEL BAPTIST CHURCH","heading"),
        para("Parking is available in the rear lot. Two rest stops are planned en route.","body"),
        para("Daily schedules and bus instructions may change. Check the online guide for updated information.","body")])
    # The cover already includes a prominent QR code linking to the live guide.
    itinerary(story);about(story);essentials(story);faqs(story);resources(story)
    doc.build(story,onFirstPage=draw_cover,onLaterPages=draw_page)
    print(f"SUCCESS: {path}; pagesize {W} x {H}")
if __name__=="__main__":main()
