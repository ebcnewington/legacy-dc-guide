#!/usr/bin/env python3
"""Washington Legacy Tour — premium editorial half-sheet booklet.

New design: everything is placed INSIDE a uniform 0.25-in white printing margin.
Fully rounded panels, EBC palette and Montserrat, with optional Meno Banner
hero display from the church's official font download. All content is taken
from data/guide.json; tentative bus/pickup instructions remain marked.
"""
from __future__ import annotations
import io, os, re, math, html, zipfile
from pathlib import Path
from urllib.parse import quote
import requests, qrcode
from PIL import Image as PILImage, ImageDraw, ImageFont, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg

from build import ROOT, ASSETS, G, load_capitol, FONT_REG, FONT_BOLD, qr_image

W,H=396,612
M=18                         # exactly 1/4 inch
SX,EX=M,W-M
CW=W-2*M
TX=32
TW=W-2*TX
TEAL=colors.HexColor("#044F56")
DEEP=colors.HexColor("#033D45")
GOLD=colors.HexColor("#FFAE05")
AQUA=colors.HexColor("#7BC2C8")
CREAM=colors.HexColor("#EDE0CA")
PAPER=colors.HexColor("#F7F5EF")
WHITE=colors.white
INK=colors.HexColor("#232323")
MUTED=colors.HexColor("#526568")
LINE=colors.HexColor("#D9E6E2")
SOFT=colors.HexColor("#EDF5F3")
YELLOW=colors.HexColor("#FFF2D2")

site="https://ebcnewington.github.io/legacy-dc-guide/"
c=None
page_number=0
current_section=""
current_subtitle=""
top=0
P=Path(ROOT)/"guide-half-sheet.pdf"

def Pstyle(name,size=9.1,leading=None,weight=False,color=INK,align=0):
    return ParagraphStyle(name,fontName=FONT_BOLD if weight else FONT_REG,fontSize=size,leading=leading or size*1.5,
                          textColor=color,spaceBefore=0,spaceAfter=0,alignment=align,allowWidows=0,allowOrphans=0)
def para(text,x,t,w,size=9.1,leading=None,weight=False,color=INK):
    txt=html.escape(str(text or "")).replace("\n","<br/>")
    obj=Paragraph(txt,Pstyle("body",size,leading,weight,color))
    _,h=obj.wrap(w,850)
    obj.drawOn(c,x,H-t-h)
    return h
def ph(text,w,size=9.1,leading=None,weight=False):
    obj=Paragraph(html.escape(str(text or "")),Pstyle("measure",size,leading,weight))
    return obj.wrap(w,850)[1]
def rr(x,y,w,h,r,fill,stroke=None,sw=.7):
    c.setLineWidth(sw)
    c.setFillColor(fill)
    if stroke:c.setStrokeColor(stroke)
    c.roundRect(x,y,w,h,r,stroke=int(stroke is not None),fill=1)
def ctext(x,y,text,size=10,font=None,color=INK):
    c.setFont(font or FONT_REG,size);c.setFillColor(color);c.drawString(x,y,str(text))
def right(x,y,text,size=9,font=None,color=INK):
    c.setFont(font or FONT_REG,size);c.setFillColor(color);c.drawRightString(x,y,str(text))
def logo(x,y,width=120):
    try:
        drawing=svg2rlg(str(ASSETS/"ebc-primary-on-dark.svg"))
        if drawing and drawing.width:
            s=width/drawing.width
            drawing.width*=s;drawing.height*=s
            drawing.scale(s,s)
            renderPDF.draw(drawing,c,x,y)
            return
    except Exception as e:print("Logo fallback:",e)
    ctext(x,y+12,"EMMANUEL BAPTIST CHURCH",9,FONT_BOLD,WHITE)
def pill(x,y,w,text,fg=TEAL,bg=SOFT,size=7.4):
    rr(x,y,w,20,10,bg)
    ctext(x+9,y+6.5,text,size,FONT_BOLD,fg)
def photo_card(x,y,w,h):
    """A rounded photo, unlike the earlier hard-edged image block."""
    c.saveState()
    clipping=c.beginPath()
    clipping.roundRect(x,y,w,h,15)
    c.clipPath(clipping,stroke=0,fill=0)
    original=PILImage.open(ASSETS/"capitol-hero.jpg").convert("RGB")
    fitted=ImageOps.fit(original,(1200,int(1200*h/w)),method=PILImage.Resampling.LANCZOS,centering=(.5,.44))
    c.drawImage(ImageReader(fitted),x,y,width=w,height=h,preserveAspectRatio=False,mask="auto")
    c.restoreState()
def qr_at(url,x,y,size=70):
    image=ImageReader(qr_image(url))
    c.drawImage(image,x,y,width=size,height=size,mask="auto")
def page_base():
    c.setFillColor(WHITE);c.rect(0,0,W,H,fill=1,stroke=0)
    # White outside this 360x576pt rounded design canvas is a true 1/4-inch border.
    rr(SX,M,CW,H-2*M,16,PAPER)

def finish():
    if page_number:c.showPage()
def new_page(section,title="",subtitle=""):
    global page_number,current_section,current_subtitle,top
    finish()
    page_number+=1
    current_section=section
    current_subtitle=title or section
    page_base()
    rr(SX,H-78,CW,60,14,TEAL)
    # Official logo on dark teal, and short, gold accent that stays inside round corners.
    logo(32,H-66,107)
    right(W-32,H-44,"NOVEMBER 9-12",7.3,FONT_BOLD,WHITE)
    right(W-32,H-56,"WASHINGTON, D.C.",7.0,FONT_REG,CREAM)
    rr(32,H-92,42,4,2,GOLD)
    if title:
        para(section.upper(),TX,100,TW,7.6,11,True,TEAL)
        headline=title
        htitle=para(headline,TX,115,TW,18.4,22.0,True,TEAL)
        top=115+htitle+10
        if subtitle:
            h=para(subtitle,TX,top-4,TW,8.4,12,False,MUTED)
            top=top+h+8
    else:top=111
    # Footline, very quiet: intentionally inset from white page edge.
    c.setStrokeColor(LINE);c.setLineWidth(.5)
    c.line(TX,42,W-TX,42)
    ctext(TX,29,"EMMANUEL  /  LEGACY GROUP",6.9,FONT_BOLD,TEAL)
    right(W-TX,29,f"{page_number:02d}",7.3,FONT_BOLD,TEAL)

def can_fit(height,margin=0):
    return top+height+margin<=H-56

def ensure(height,section=None):
    if not can_fit(height):
        base=re.sub(r"(?:\s*/\s*continued)+$","",current_subtitle,flags=re.I)
        new_page(section or current_section,base+"  /  continued")
        return True
    return False

def section_bar(title,letter=None):
    global top
    h=27
    ensure(h+12)
    if letter:
        rr(TX,H-top-22,22,22,7,TEAL)
        ctext(TX+7,H-top-16,letter,9,FONT_BOLD,WHITE)
        ctext(TX+31,H-top-17,title,11,FONT_BOLD,TEAL)
    else:
        ctext(TX,H-top-19,title,11.4,FONT_BOLD,TEAL)
    top+=31

def loose_text(t,size=9.0,color=INK):
    global top
    h=ph(t,TW,size,size*1.5)
    ensure(h+12)
    top+=para(t,TX,top,TW,size,size*1.5,False,color)+12

def note_date_label(d):
    return (d.get("label") or d.get("date","")).upper()

def draw_notes(d):
    global page_number
    # A full page that is intentionally useful, not accidental whitespace.
    new_page("Notes","Notes for "+(d.get("label") or "the day"),"")
    ytop=159
    x=30; width=336
    rr(x,54,width,H-ytop-54,14,WHITE,LINE,0.8)
    pill(43,H-ytop-37,103,"BUS INSTRUCTIONS",TEAL,SOFT,7)
    ctext(47,H-ytop-61,"Meeting location / pickup instructions",8.1,FONT_REG,MUTED)
    c.setStrokeColor(LINE);c.setLineWidth(.75)
    # 14 generous, single-spaced writing rules that stop within rounded card.
    line_y=H-ytop-81
    while line_y>76:
        c.line(47,line_y,350,line_y)
        line_y-=24
    # Small gold accent, not a decorative full rectangular border.
    rr(43,66,42,4,2,GOLD)

def compact_instruction_lines():
    """Use substantial remaining itinerary space for practical handwritten notes."""
    global top
    available=H-56-top
    if available<99:return
    card_h=min(available-4,148)
    x=TX;y=H-top-card_h
    rr(x,y,TW,card_h,11,WHITE,LINE,.7)
    pill(x+12,y+card_h-32,125,"BUS / STOP NOTES",TEAL,SOFT,7.2)
    c.setStrokeColor(LINE)
    c.setLineWidth(.65)
    ly=y+card_h-50
    while ly>y+18:
        c.line(x+15,ly,x+TW-15,ly)
        ly-=21
    top+=card_h+8

def day_item(e,i):
    global top
    time=str(e.get("time") or "TBD")
    title=e.get("title") or "Activity"
    loc=e.get("location","")
    desc=e.get("description") or e.get("notes") or ""
    # Keep schedule descriptions intact, with full-height cards as needed.
    rx=TX+89; rw=TW-101
    h_title=ph(title,rw,9.7,12.2,True)
    h_loc=ph(loc,rw,8.1,10.2) if loc else 0
    h_desc=ph(desc,rw,8.6,12.7) if desc else 0
    card_h=max(47,18+h_title+(h_loc+4 if loc else 0)+(h_desc+7 if desc else 0))
    if e.get("important"):card_h+=2
    ensure(card_h+8)
    y=H-top-card_h
    rr(TX,y,TW,card_h,10,WHITE,LINE,0.55)
    # Time stripe is gently separated rather than heavy or dark.
    rr(TX+7,y+7,77,card_h-14,7,SOFT)
    time_top=top+11
    if len(time)>17:
        para(time,TX+13,time_top,64,7.3,9.0,True,TEAL)
    else:
        para(time,TX+13,time_top,65,8.0,10.5,True,TEAL)
    tt=top+10
    para(title,rx,tt,rw,9.7,12.2,True,TEAL)
    tt+=h_title+3
    if loc:
        para(loc,rx,tt,rw,8.1,10.2,False,MUTED)
        tt+=h_loc+3
    if desc:
        para(desc,rx,tt,rw,8.6,12.7,False,INK)
    top+=card_h+8

def alert_card(title,description):
    global top
    hh=ph(description,TW-25,8.6,12.9)
    height=31+hh+12
    ensure(height+8)
    y=H-top-height
    rr(TX,y,TW,height,10,YELLOW,GOLD,.7)
    para(title,TX+12,top+10,TW-24,8.9,11.8,True,TEAL)
    para(description,TX+12,top+27,TW-24,8.6,12.9)
    top+=height+10

def qr_callout(label,url,width=152):
    global top
    height=85
    ensure(height+10)
    y=H-top-height
    rr(TX,y,TW,height,11,TEAL)
    qr_at(url,TX+9,y+8,68)
    para(label,TX+86,top+13,TW-97,9.1,12.5,True,WHITE)
    para("Scan to open the online guide or live visitor map.",TX+86,top+37,TW-103,7.8,10.8,False,CREAM)
    top+=height+12

_MENO_FONT=None
_MENO_ATTEMPTED=False
def get_meno_font():
    """Render only cover-letter shapes from the official EBC font download.

    The original font binary is never published or stored in the website.
    """
    global _MENO_FONT,_MENO_ATTEMPTED
    if _MENO_ATTEMPTED:return _MENO_FONT
    _MENO_ATTEMPTED=True
    import zipfile
    candidates=[Path("/mnt/data/Meno Banner.zip"),ROOT/"Meno Banner.zip"]
    payload=None
    for candidate in candidates:
        if candidate.is_file():
            payload=candidate.read_bytes();break
    if not payload:
        # Official EBC brand-guide download; public link already in the brand standards.
        origin="https://firebasestorage.googleapis.com/v0/b/standards-site-beta.appspot.com/o/documents%2Feb43a98f3e2%2Fb18a34a75a9%2FMeno%20Banner.zip?alt=media&token=7c489b19-7978-417f-ab11-ba47f91e0e93"
        try:
            response=requests.get(origin,timeout=12)
            response.raise_for_status()
            payload=response.content
        except Exception as ex:print("Meno Banner download unavailable; Montserrat bold fallback:",ex)
    if payload:
        try:
            with zipfile.ZipFile(io.BytesIO(payload)) as z:
                name=next(n for n in z.namelist() if n.endswith("meno-banner-bold.otf") and not n.startswith("__"))
                _MENO_FONT=z.read(name)
            print("Using official EBC Meno Banner Bold for cover display")
        except Exception as ex:print("Unable to load Meno Banner:",ex)
    return _MENO_FONT

def display_meno(text,x,y,maxw=325,maxh=37):
    """Draw an anti-aliased, high-resolution title graphic, never a font asset."""
    face=get_meno_font()
    if not face:return False
    try:
        font=ImageFont.truetype(io.BytesIO(face),size=128)
        bb=font.getbbox(text,stroke_width=0)
        iw=bb[2]-bb[0]+20;ih=bb[3]-bb[1]+22
        img=PILImage.new("RGBA",(iw,ih),(0,0,0,0))
        d=ImageDraw.Draw(img)
        d.text((10-bb[0],11-bb[1]),text,font=font,fill=(4,79,86,255))
        tw,th=iw/3.2,ih/3.2
        scale=min(1,maxw/tw,maxh/th)
        width=tw*scale;height=th*scale
        c.drawImage(ImageReader(img),x,y,width=width,height=height,mask="auto")
        return True
    except Exception as ex:
        print("Meno Banner display failed:",ex)
        return False

def page_cover():
    global page_number
    finish()
    page_number+=1
    page_base()
    # Photographic, rounded hero occupies the full printable width.
    photo_card(SX,H-299,CW,281)
    # Logo anchored over a rounded dark tile rather than a hard-edged top band.
    rr(31,H-79,148,49,10,TEAL)
    logo(44,H-70,122)
    # Floating date chip attached visually to the image card.
    rr(31,H-324,166,35,10,GOLD)
    ctext(44,H-311,"NOVEMBER 9-12, 2026",9.0,FONT_BOLD,INK)
    # Fresh editorial cover; not using any prior border or layout.
    if not display_meno("WASHINGTON",TX,244,maxw=319,maxh=36):
        ctext(TX,252,"WASHINGTON",27.5,FONT_BOLD,TEAL)
    if not display_meno("LEGACY TOUR",TX,207,maxw=319,maxh=36):
        ctext(TX,215,"LEGACY TOUR",29.4,FONT_BOLD,TEAL)
    c.setStrokeColor(GOLD);c.setLineWidth(3)
    c.line(TX,199,121,199)
    para("A four-day guide to places, people, and history.",TX,416,TW-15,10.1,14.5,False,INK)
    # QR tile is built into the cream surface as a rounded light card.
    rr(31,39,334,116,12,WHITE)
    rr(45,112,161,29,8,SOFT)
    ctext(56,122,"YOUR DIGITAL GUIDE",8.4,FONT_BOLD,TEAL)
    para("Schedule, directions, audio tours, and trivia - updated online.",45,505,205,8.7,12.6,False,INK)
    qr_at(site,262,51,88)
    c.setFillColor(AQUA)
    c.circle(48,52,3,stroke=0,fill=1)

def page_overview():
    global top
    new_page("Travel overview","Four days. One guide.","All dates, hotel information, and bus details in one place.")
    section_bar("Your journey")
    for n,d in enumerate(G.get("itinerary",[]),1):
        full=d.get("heading","")
        hh=ph(full,TW-66,9.0,13.1,True)
        h=max(52,26+hh)
        ensure(h+7)
        y=H-top-h
        rr(TX,y,TW,h,9,WHITE,LINE,.6)
        rr(TX+8,y+8,31,h-16,7,TEAL)
        ctext(TX+15,y+h/2-3,str(n).zfill(2),9.2,FONT_BOLD,WHITE)
        para(d.get("label",""),TX+50,top+7,TW-63,7.6,10,False,MUTED)
        para(full,TX+50,top+19,TW-62,9.0,13.1,True,TEAL)
        top+=h+7
    top+=8
    qr_callout("Open the full digital guide",site)
    # This reminder is provided in the itinerary section; don't create a nearly empty page.

def itinerary():
    for d in G.get("itinerary",[]):
        new_page("Daily itinerary",d.get("heading",d.get("label","")),d.get("label",""))
        for i,e in enumerate(d.get("items",[])):
            day_item(e,i)
        if str(d.get("date"))=="2026-11-11":
            alert_card("WEDNESDAY BUS PICKUP - NOT CONFIRMED",
                "The 300 block of L'Enfant Plaza SW is only a possible pickup point. Follow day-of directions from your leaders.")
        urls={
            "2026-11-09":("National Harbor visitor map","https://www.nationalharbor.com/about/maps/"),
            "2026-11-10":("Mount Vernon visitor map","https://www.mountvernon.org/plan-your-visit"),
            "2026-11-11":("National Mall official maps","https://www.nps.gov/nama/planyourvisit/maps.htm"),
            "2026-11-12":("Arlington Cemetery visitor guide","https://www.arlingtoncemetery.mil/Visit")
        }
        label,url=urls.get(d.get("date"),("The online guide",site))
        # All map QR links are on the resources page. Add practical writing
        # space where the itinerary naturally leaves room, without extra pages.
        compact_instruction_lines()
        draw_notes(d)

def contact_card(person):
    global top
    height=57
    ensure(height+9)
    y=H-top-height
    rr(TX,y,TW,height,11,WHITE,LINE,.5)
    ctext(TX+12,y+33,person.get("name",""),10.2,FONT_BOLD,TEAL)
    para(person.get("role",""),TX+12,top+27,TW-150,7.8,10.4,False,MUTED)
    rr(TX+TW-122,y+12,110,32,9,SOFT)
    ctext(TX+TW-114,y+24,person.get("phone",""),7.7,FONT_BOLD,TEAL)
    top+=height+9

def hotel_card(hotel):
    global top
    title=hotel.get("name","")
    addr=hotel.get("address","")
    info=hotel.get("notes","")
    tel=hotel.get("phone","")
    height=27+ph(addr,TW-28,8.7,12.8)+ph(info,TW-28,8.3,12.2)+29
    ensure(height+10)
    y=H-top-height
    rr(TX,y,TW,height,11,WHITE,LINE,.6)
    ctext(TX+13,y+height-20,title,10.5,FONT_BOLD,TEAL)
    t=top+29
    t+=para(addr,TX+13,t,TW-26,8.7,12.8,False,INK)+4
    t+=para(info,TX+13,t,TW-26,8.3,12.2,False,MUTED)+8
    ctext(TX+13,y+10,"FRONT DESK  "+tel,8.1,FONT_BOLD,TEAL)
    top+=height+10

def packing_checklist():
    """A useful packing panel on the final tips page, not extra filler pages."""
    global top
    h=133
    if not can_fit(h+6):return
    y=H-top-h
    rr(TX,y,TW,h,11,WHITE,LINE,.7)
    ctext(TX+13,y+h-21,"PACKING CHECKLIST",9.9,FONT_BOLD,TEAL)
    c.setStrokeColor(GOLD);c.setLineWidth(2.0);c.line(TX+13,y+h-28,TX+86,y+h-28)
    items=["Walking shoes","Warm layers","Photo ID","Medication","Phone & charger","Umbrella / rainwear"]
    colw=(TW-31)/2
    for i,item in enumerate(items):
        col=i%2;row=i//2
        x=TX+14+col*colw
        yy=y+h-52-row*26
        c.setStrokeColor(AQUA);c.setLineWidth(1.1)
        c.roundRect(x,yy-2,10,10,3,stroke=1,fill=0)
        para(item,x+17,H-yy-7,colw-20,8.6,11.9,False,INK)
    top+=h+9

def practical():
    new_page("Travel essentials","Who to call","Keep this information handy during the tour.")
    section_bar("Your trip leaders")
    for item in G.get("essentials",{}).get("contacts",[]):contact_card(item)
    section_bar("Your National Harbor hotels")
    for h in G.get("essentials",{}).get("hotels",[]):hotel_card(h)
    e=G.get("essentials",{})
    bus=e.get("bus",{})
    alert_card("CHARTER BUS",bus.get("notes","Monday departure from Emmanuel Baptist Church."))
    alert_card("POSSIBLE WEDNESDAY PICKUP - CHECK FIRST",
        e.get("possiblePickup",{}).get("notes","The L'Enfant Plaza SW pickup has not been confirmed."))
    section_bar("Helpful reminders")
    for tip in e.get("tips",[]):
        info_card(tip.get("title","Reminder"),tip.get("description",""))
    packing_checklist()

def info_card(title,description,tag=""):
    global top
    title_h=ph(title,TW-29-(50 if tag else 0),9.9,12.4,True)
    desc_h=ph(description,TW-29,8.8,13.1)
    height=max(61,12+title_h+6+desc_h+12)
    ensure(height+9)
    y=H-top-height
    rr(TX,y,TW,height,11,WHITE,LINE,.6)
    if tag: pill(TX+TW-60,y+height-22,47,tag,TEAL,SOFT,6.5)
    para(title,TX+13,top+10,TW-28-(50 if tag else 0),9.9,12.4,True,TEAL)
    para(description,TX+13,top+12+title_h+5,TW-26,8.8,13.1)
    top+=height+9

def attractions():
    new_page("At the landmarks","Places worth knowing","A few details to notice as you explore.")
    for place in G.get("places",[]):
        title=place.get("name","")
        desc=place.get("summary","")
        detail=place.get("detail","")
        text=desc+(("  "+detail) if detail else "")
        info_card(title,text)
    # Place a direct guide QR on the final sights page ONLY when it fits,
    # rather than producing a sparse one-item continuation page.
    if can_fit(92):qr_callout("Audio tours and directions",site+"#places")

def faq():
    new_page("Travel essentials","Frequently asked","Answers from the supplied trip FAQs and companion materials.")
    for group in G.get("faq",[]):
        section_bar(group.get("topic","Questions"))
        for item in group.get("items",[]):info_card(item.get("q","Question"),item.get("a",""))
    if can_fit(95):qr_callout("Current travel information",site+"#essentials")

def maps_and_audio():
    global top
    new_page("Maps and resources","Keep exploring","Scan to open official resources on your phone.")
    resources=[
        ("Digital guide and updates",site),
        ("National Mall maps","https://www.nps.gov/nama/planyourvisit/maps.htm"),
        ("Mount Vernon estate","https://www.mountvernon.org/plan-your-visit"),
        ("National Harbor map","https://www.nationalharbor.com/about/maps/"),
        ("Arlington Cemetery","https://www.arlingtoncemetery.mil/Visit"),
        ("Museum of the Bible","https://www.museumofthebible.org/plan-your-visit"),
        ("Washington trivia challenge",site+"#trivia"),
        ("Official Capitol audio tour","https://www.visitthecapitol.gov/visit/accessibility-services/audio-described-tour")
    ]
    # All seven resources on one fully utilized page with rounded 2-column tiles.
    gap=10
    width=(TW-gap)/2
    height=88
    for i,(label,url) in enumerate(resources):
        row=i//2
        col=i%2
        y=H-top-row*(height+10)-height
        x=TX+col*(width+gap)
        rr(x,y,width,height,10,WHITE,LINE,.65)
        qr_at(url,x+9,y+33,50)
        ctext(x+74,y+height-28,"SCAN",7.0,FONT_BOLD,TEAL)
        para(label,x+9,top+row*(height+10)+64,width-18,8.4,11.6,True,TEAL)
    top+=4*(height+10)+6
    if can_fit(36):
        para("Audio tours, directions and live changes are available in the digital guide.",TX,top,TW,8.5,12.3,False,MUTED)
        top+=33

def draw_final_note():
    global top
    ensure(78)
    y=H-top-68
    rr(TX,y,TW,68,12,TEAL)
    para("A wonderful journey together",TX+14,top+10,TW-28,11,14,True,WHITE)
    para("Thank you for sharing these days with Emmanuel's Legacy Group.",TX+14,top+31,TW-28,8.6,12.9,False,CREAM)
    top+=77

def main():
    global c
    load_capitol()
    c=canvas.Canvas(str(P),pagesize=(W,H),pageCompression=1)
    c.setTitle("Washington Legacy Tour | Nov 9-12, 2026")
    c.setAuthor("Emmanuel Baptist Church")
    page_cover()
    page_overview()
    itinerary()
    practical()
    attractions()
    faq()
    maps_and_audio()
    if can_fit(85):draw_final_note()
    c.save()
    print(f"Created new editorial booklet: {P} ({page_number} pages); safe 0.25-inch white margin")

if __name__=="__main__": main()
