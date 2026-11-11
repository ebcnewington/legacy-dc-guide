#!/usr/bin/env python3
"""Washington Legacy Tour — premium editorial half-sheet booklet.

New design: everything is placed INSIDE a uniform 0.25-in white printing margin.
Fully rounded panels, EBC palette and Montserrat, with optional Meno Banner
hero display from the church's official font download. All content is taken
from data/guide.json; tentative bus/pickup instructions remain marked.
"""
from __future__ import annotations
import io, html, zipfile
from pathlib import Path
import requests
from PIL import Image as PILImage, ImageDraw, ImageFont, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
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
top=0
P=Path(ROOT)/"guide-half-sheet.pdf"

def Pstyle(name,size=9.1,leading=None,weight=False,color=INK,align=0):
    return ParagraphStyle(name,fontName=FONT_BOLD if weight else FONT_REG,fontSize=size,leading=leading or size*1.5,
                          textColor=color,spaceBefore=0,spaceAfter=0,alignment=align,allowWidows=0,allowOrphans=0)
def fitted_paragraph(text,w,size=9.1,leading=None,weight=False,color=INK,align=0):
    """Avoid stranded last words, keeping copy intact and card headings attached."""
    txt=html.escape(str(text or "")).replace("\n","<br/>")
    steps=(1.0,.99,.98,.97,.96,.95,.94) if size<=10.1 and len(str(text))>32 else (1.0,)
    for scale in steps:
        fs=size*scale
        ld=(leading or size*1.5)*scale
        obj=Paragraph(txt,Pstyle("text",fs,ld,weight,color,align))
        _,h=obj.wrap(w,850)
        lines=obj.blPara.lines
        if len(lines)<2 or "\n" in str(text):return obj,h
        last=lines[-1]
        words=last[1] if isinstance(last,tuple) else getattr(last,'words',[])
        if not words:return obj,h
        last_line=' '.join(str(word) for word in words)
        if len(words)>=2 and len(last_line)>=12:return obj,h
    # If needed, bind the final two words to prevent a one-word widow.
    lines=obj.blPara.lines
    if len(lines)>1:
        last=lines[-1]
        words=last[1] if isinstance(last,tuple) else getattr(last,'words',[])
        if len(words)==1:
            raw=str(text or "")
            parts=raw.rsplit(" ",1)
            if len(parts)==2 and len(parts[-1])<=22:
                joined=html.escape(parts[0])+"&nbsp;"+html.escape(parts[1])
                alternate=Paragraph(joined,Pstyle("no-widow",size*.96,(leading or size*1.5)*.96,weight,color,align))
                _,new_h=alternate.wrap(w,850)
                return alternate,new_h
    return obj,h

def para(text,x,t,w,size=9.1,leading=None,weight=False,color=INK,align=0):
    obj,h=fitted_paragraph(text,w,size,leading,weight,color,align)
    obj.drawOn(c,x,H-t-h)
    return h

def ph(text,w,size=9.1,leading=None,weight=False):
    return fitted_paragraph(text,w,size,leading,weight)[1]
def rr(x,y,w,h,r,fill,stroke=None,sw=.7):
    c.setLineWidth(sw)
    c.setFillColor(fill)
    if stroke:c.setStrokeColor(stroke)
    c.roundRect(x,y,w,h,r,stroke=int(stroke is not None),fill=1)
def ctext(x,y,text,size=10,font=None,color=INK):
    c.setFont(font or FONT_REG,size);c.setFillColor(color);c.drawString(x,y,str(text))
def right(x,y,text,size=9,font=None,color=INK):
    c.setFont(font or FONT_REG,size);c.setFillColor(color);c.drawRightString(x,y,str(text))
def logo_in_box(x,y,w,h,pad=6):
    drawing=svg2rlg(str(ASSETS/"ebc-primary-on-dark.svg"))
    left,bottom,right_edge,upper=drawing.getBounds()
    scale=min((w-2*pad)/(right_edge-left),(h-2*pad)/(upper-bottom))
    c.saveState()
    c.translate(x+w/2,y+h/2)
    c.scale(scale,scale)
    renderPDF.draw(drawing,c,-(left+right_edge)/2,-(bottom+upper)/2)
    c.restoreState()


def header_image():
    # Use the right half for the dome; the left half provides a quiet logo field.
    photo=PILImage.open(ASSETS/"capitol-hero.jpg").convert("RGB")
    image=PILImage.new("RGB",(1440,216),(4,79,86))
    crop=ImageOps.fit(photo,(860,216),centering=(.5,.33))
    mask=PILImage.new("L",(860,1))
    mask.putdata([round(114*min(1,x/430)) for x in range(860)])
    image.paste(crop,(580,0),mask.resize(crop.size))
    return ImageReader(image)

def center_label(text,x,y,w,h,size=8.3,color=TEAL,font=None):
    """Optically center short labels in rounded panels."""
    font=font or FONT_BOLD
    while pdfmetrics.stringWidth(text,font,size)>w-13 and size>6.8:
        size-=.15
    c.setFont(font,size)
    c.setFillColor(color)
    c.drawCentredString(x+w/2,y+(h-size)/2+size*.24,text)

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
    global page_number,top
    finish()
    page_number+=1
    page_base()
    c.saveState()
    clip=c.beginPath()
    clip.roundRect(SX,H-72,CW,54,12)
    c.clipPath(clip,stroke=0,fill=0)
    c.drawImage(header,SX,H-72,CW,54)
    c.restoreState()
    logo_in_box(TX,H-72,100,54,5)
    right(W-TX,H-42,"NOVEMBER 9–12",10.8,FONT_BOLD,WHITE)
    right(W-TX,H-57,"WASHINGTON, D.C.",9.5,FONT_BOLD,WHITE)
    para(section.upper(),TX,84,TW,8.5,11,True,TEAL)
    htitle=para(title,TX,99,TW,17.2,20,True,TEAL)
    top=99+htitle+9
    if subtitle:
        top+=para(subtitle,TX,top,TW,9.5,13,False,MUTED)+8
    # Footline, very quiet: intentionally inset from white page edge.
    c.setStrokeColor(LINE);c.setLineWidth(.5)
    c.line(TX,42,W-TX,42)
    ctext(TX,29,"EMMANUEL  /  LEGACY GROUP",6.9,FONT_BOLD,TEAL)
    right(W-TX,29,f"{page_number:02d}",7.3,FONT_BOLD,TEAL)

def check_space(height):
    if top+height>H-47:
        raise ValueError(f"Page {page_number}: content reaches {top+height:.1f} pt; shorten the print copy.")


def visitor_map(day,x,y):
    resource=next(m for m in G["maps"] if m["label"]==day["printMap"])
    qr_at(resource["url"],x,y,53)
    center_label("Visitor map",x-4,y-14,61,14,8,TEAL)


def draw_notes(day):
    new_page("Field notes","Notes for "+day["label"])
    upper=H-top
    rr(TX,52,TW,upper-52,11,WHITE,LINE)
    visitor_map(day,W-TX-61,upper-64)
    ctext(TX+13,upper-24,"Bus instructions",11,FONT_BOLD,TEAL)
    para("Meeting place, pickup time and directions",TX+13,top+34,TW-90,9.4,13)
    c.setStrokeColor(LINE)
    for y in range(int(upper)-87,64,-24):
        c.line(TX+13,y,W-TX-13,y)


def day_item(event):
    global top
    time=event.get("time") or "TBD"
    title=event["title"]
    desc=event.get("printDescription",event.get("description",""))
    width=TW-99
    th=ph(title,width,10.1,12.2,True)
    dh=ph(desc,width,9.3,11.7) if desc else 0
    group=th+(dh+2 if desc else 0)
    time_height=ph(time,60,8.5,10,True)
    height=max(30,group+11,time_height+13)
    check_space(height)
    y=H-top-height
    rr(TX,y,TW,height,8,WHITE,LINE,.55)
    rr(TX+6,y+5,66,height-10,6,SOFT)
    para(time,TX+9,top+(height-time_height)/2,60,8.5,10,True,TEAL,align=1)
    text_top=top+(height-group)/2
    para(title,TX+88,text_top,width,10.1,12.2,True,TEAL)
    if desc: para(desc,TX+88,text_top+th+2,width,9.3,11.7)
    top+=height+4


def text_card(title,body,highlight=False):
    global top
    width=TW-24
    title_h=ph(title,width,11,14,True)
    body_h=ph(body,width,10,14)
    height=title_h+body_h+18
    check_space(height)
    rr(TX,H-top-height,TW,height,8,YELLOW if highlight else WHITE,GOLD if highlight else LINE,.65)
    para(title,TX+12,top+7,width,11,14,True,TEAL)
    para(body,TX+12,top+title_h+10,width,10,14)
    top+=height+5

_MENO_FONT=None
_MENO_ATTEMPTED=False
def get_meno_font():
    """Render only cover-letter shapes from the official EBC font download.

    The original font binary is never published or stored in the website.
    """
    global _MENO_FONT,_MENO_ATTEMPTED
    if _MENO_ATTEMPTED:return _MENO_FONT
    _MENO_ATTEMPTED=True
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
    photo_card(SX,225,CW,369)
    rr(31,533,124,48,9,TEAL)
    logo_in_box(31,533,124,48,8)
    rr(TX,212,152,27,8,GOLD)
    center_label("NOVEMBER 9–12, 2026",TX,212,152,27,9,INK)
    for text,y in (("WASHINGTON",169),("LEGACY TOUR",131)):
        if not display_meno(text,TX-2,y,maxw=TW,maxh=40):
            ctext(TX,y+3,text,31,FONT_BOLD,TEAL)
    ctext(TX,113,"A four-day guide to places, people, and history.",10,FONT_REG,INK)
    rr(TX,32,TW,62,9,WHITE,LINE,.6)
    qr_at(site,TX+6,36,54)
    ctext(TX+70,72,"Open the digital guide",11.5,FONT_BOLD,TEAL)
    para("Scan for maps, audio tours and a 90-question trivia challenge about the places we’ll visit.",TX+70,H-66,TW-82,9.4,12.8)


def practical():
    global top
    new_page("Travel essentials","Trip leaders & hotels")
    e=G["essentials"]
    for person in e["contacts"]:
        text_card(person["name"]+"  ·  "+person["phone"],person["role"])
    top+=5
    for hotel in e["hotels"]:
        text_card(hotel["name"],hotel["address"]+"\nFront desk: "+hotel["phone"]+"\n"+hotel["notes"])
    top+=5
    text_card("Charter bus",e["bus"]["notes"])
    text_card("Emergency assistance","Call 911 in an emergency. For group arrangements, call Ashlee or Pastor Rob.")


def itinerary():
    for index,day in enumerate(G["itinerary"]):
        new_page(day["label"],day["heading"])
        for event in day["items"]:
            day_item(event)
        if day["date"]=="2026-11-11":
            text_card("Wednesday 3:00 p.m. pickup · CONFIRMED",
                      "Hotel-break pickup: meet at the Air & Space Museum on the large walkway to the right of its entrance, along Jefferson Dr SW.",True)
        if index==0:
            check_space(145)
        if index==0 or H-52-top>=150:
            height=min(145,H-52-top)
            y=H-top-height
            rr(TX,y,TW,height,9,WHITE,LINE,.65)
            ctext(TX+13,H-top-22,"Bus meeting place & time",10.5,FONT_BOLD,TEAL)
            c.setStrokeColor(LINE)
            for offset in range(47,int(height)-10,23):
                end=W-TX-(80 if index==0 and offset<86 else 13)
                c.line(TX+13,H-top-offset,end,H-top-offset)
            if index==0:
                visitor_map(day,W-TX-63,H-top-62)
        if index>0:
            draw_notes(day)


def attractions():
    new_page("Landmark guide","Places worth knowing")
    gap=12
    width=(TW-gap)/2
    places=G["places"]
    midpoint=(len(places)+1)//2
    for col,group in enumerate((places[:midpoint],places[midpoint:])):
        x=TX+col*(width+gap)
        y=top
        for place in group:
            h=para(place["name"],x,y,width,10.1,12.2,True,TEAL)
            y+=h+2
            y+=para(place["summary"],x,y,width,9.4,12.1)+7
            if y>H-45:raise ValueError("Landmark column exceeds page")
            c.setStrokeColor(LINE)
            c.line(x,H-y+3,x+width,H-y+3)
            y+=4


def faq():
    new_page("Quick reference","Frequently asked questions")
    for group in G["faq"]:
        for item in group["items"]:
            if "printAnswer" in item:
                text_card(item["q"],item["printAnswer"])

def back_cover():
    global page_number
    finish()
    page_number+=1
    page_base()
    photo=PILImage.open(ASSETS/"capitol-hero.jpg").convert("RGB")
    size=(1080,1728)
    crop=ImageOps.fit(photo,size,centering=(.5,.44))
    teal=PILImage.new("RGB",size,(4,65,71))
    fade=PILImage.new("L",(1,size[1]))
    fade.putdata([round(180*max(0,1-(y/size[1])**1.65/.65)) for y in range(size[1])])
    teal.paste(crop,(0,0),fade.resize(size))
    c.saveState()
    clip=c.beginPath()
    clip.roundRect(SX,M,CW,H-2*M,16)
    c.clipPath(clip,stroke=0,fill=0)
    c.drawImage(ImageReader(teal),SX,M,CW,H-2*M)
    c.restoreState()
    logo_in_box(TX,154,TW,72,8)
    rr(W/2-15,135,30,2,1,GOLD)
    center_label("Washington Legacy Tour",TX,99,TW,29,15,WHITE)
    center_label("November 9–12, 2026",TX,76,TW,22,10,CREAM,FONT_REG)


def main():
    global c,header
    load_capitol()
    header=header_image()
    c=canvas.Canvas(str(P),pagesize=(W,H),pageCompression=1)
    c.setTitle("Washington Legacy Tour | Nov 9-12, 2026")
    c.setAuthor("Emmanuel Baptist Church")
    page_cover()
    practical()
    itinerary()
    attractions()
    faq()
    back_cover()
    if page_number!=12:
        raise ValueError(f"Expected 12 pages; generated {page_number}")
    c.save()
    print(f"Created new editorial booklet: {P} ({page_number} pages); safe 0.25-inch white margin")

if __name__=="__main__": main()
