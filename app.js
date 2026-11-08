(()=>{"use strict";
let GUIDE=null,dayIndex=0;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=s=>{try{const u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const map=s=>s?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s):"";
const tel=s=>s?"tel:"+String(s).replace(/[^+\d]/g,""):"";
const a=(href,label)=>href?'<a class="action-link" href="'+esc(href)+'"'+(href.startsWith("http")?' target="_blank" rel="noopener noreferrer"':"")+'>'+esc(label)+'</a>':"";
const btns=(o={})=>'<div class="link-row">'+a(map(o.address||o.location),"Directions ↗")+a(url(o.website||""),"Official website ↗")+a(tel(o.phone),"Call "+(o.phone||""))+'</div>';
const box=(title,body)=>'<section class="essential-card"><h3>'+esc(title)+'</h3>'+body+'</section>';
function route(){
 const chosen=(location.hash||"#home").slice(1), section=["home","itinerary","places","essentials"].includes(chosen)?chosen:"home";
 document.querySelectorAll(".view").forEach(x=>x.hidden=x.id!==section);
 document.querySelectorAll("[data-tab]").forEach(x=>{
  const match=x.getAttribute("data-tab")===section;x.classList.toggle("active",match);
  if(match)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");
 });
 window.scrollTo({top:0,behavior:"instant"});
}
function announcements(){
 const items=GUIDE.announcements||[];
 $("#announcements-wrap").hidden=!items.length;
 $("#announcements").innerHTML=items.map(x=>'<div class="notice"><strong>'+esc(x.title||"Trip update")+'</strong><p>'+esc(x.message||"")+'</p></div>').join("");
}
function itinerary(){
 const days=GUIDE.itinerary||[];
 if(!days.length){$("#day-buttons").innerHTML="";$("#itinerary-content").innerHTML=box("The itinerary is being prepared","<p>The confirmed schedule, meeting information and times will appear here.</p>");$("#next-event").innerHTML="<strong>Itinerary coming soon</strong><p>Your confirmed group activities will appear here when they're available.</p>";return;}
 dayIndex=Math.min(Math.max(dayIndex,0),days.length-1);
 $("#day-buttons").innerHTML=days.map((d,i)=>'<button data-day="'+i+'" aria-pressed="'+(dayIndex===i)+'">'+esc(d.label||d.date||"Day "+(i+1))+'</button>').join("");
 $("#day-buttons").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{dayIndex=Number(b.dataset.day);itinerary()}));
 const day=days[dayIndex],events=day.items||[];
 $("#itinerary-content").innerHTML=events.length?events.map(e=>
  '<details class="event"><summary><span><span class="time">'+esc(e.time||"Time to be confirmed")+'</span><strong>'+esc(e.title||"Scheduled activity")+'</strong>'+
  (e.location?'<small>'+esc(e.location)+'</small>':"")+'</span></summary><div class="event-body">'+
  ["summary","description","notes","walking","accessibility"].filter(k=>e[k]).map(k=>'<p>'+esc(e[k])+'</p>').join("")+
  btns(e)+'</div></details>').join(""):box("Schedule pending","<p>Times and activities will be added when confirmed.</p>");
 const upcoming=days.flatMap(d=>(d.items||[]).map(x=>({day:d.label||d.date||"Trip day",e:x})))[0];
 if(upcoming)$("#next-event").innerHTML='<p class="eyebrow">'+esc(upcoming.day)+'</p><h3>'+esc(upcoming.e.title||"Scheduled activity")+'</h3><p>'+esc(upcoming.e.time||"Time to be confirmed")+'</p>'+a("#itinerary","See the itinerary →");
}
function places(){
 $("#places-grid").innerHTML=(GUIDE.places||[]).map((p,i)=>
 '<article class="place-card"><img class="place-photo" src="'+esc(p.image||"assets/capitol-hero.jpg")+'" loading="lazy" alt="'+esc(p.name||"Place")+'" style="object-position:'+esc(p.imageFocus||"center")+'">'+
 '<div class="place-card-body"><p class="tag">'+esc(p.tag||"FEATURED LOCATION")+'</p><h3>'+esc(p.name)+'</h3><p>'+esc(p.summary||"")+'</p>'+
 '<button class="detail-button" type="button" data-place="'+i+'">Details &amp; directions</button></div></article>').join("");
 document.querySelectorAll("[data-place]").forEach(b=>b.addEventListener("click",()=>{
 const p=GUIDE.places[Number(b.dataset.place)];
 $("#dialog-body").innerHTML='<img class="dialog-photo" src="'+esc(p.image||"assets/capitol-hero.jpg")+'" alt="'+esc(p.name)+'">'+
 '<p class="eyebrow">'+esc(p.tag||"Featured destination")+'</p><h2>'+esc(p.name)+'</h2>'+
 [p.address,p.summary,p.detail,p.description,p.accessibility&&"Accessibility: "+p.accessibility,p.walking&&"Walking: "+p.walking,p.tips].filter(Boolean).map(s=>'<p>'+esc(s)+'</p>').join("")+btns(p);
 $("#place-dialog").showModal();
 }));
}
function essentials(){
 const e=GUIDE.essentials||{};
 let html="";
 html+=box("Group contacts",(e.contacts||[]).length?(e.contacts||[]).map(c=>'<p><strong>'+esc(c.name||"Group contact")+'</strong> — '+esc(c.role||"")+'</p><div class="link-row">'+a(tel(c.phone),"Call "+esc(c.phone||""))+'</div>').join(""):"<p>Group leader contact information will be added once confirmed.</p>");
 [["Hotel",e.hotel],["Transportation",e.bus]].forEach(([name,info])=>{
  if(info)html+=box(name,'<p><strong>'+esc(info.name||"")+'</strong></p><p>'+esc(info.address||"")+'</p><p>'+esc(info.notes||"")+'</p>'+btns(info));
 });
 const tips=e.tips||[];
 if(tips.length)html+=box("Helpful reminders",tips.map(t=>'<p><strong>'+esc(t.title||"")+'</strong><br>'+esc(t.description||t.text||"")+'</p>').join(""));
 $("#essentials-content").innerHTML=html;
 $("#resources").innerHTML=(GUIDE.resources||[]).filter(r=>url(r.url)).map(r=>'<a class="resource-link" href="'+esc(url(r.url))+'" target="_blank" rel="noopener noreferrer">'+esc(r.label||"Website")+'</a>').join("");
}
async function init(){
 window.addEventListener("hashchange",route);$("#dialog-close").addEventListener("click",()=>$("#place-dialog").close());
 $("#place-dialog").addEventListener("click",e=>{if(e.target.id==="place-dialog")e.target.close()});
 try{
  const response=await fetch("data/guide.json",{cache:"no-cache"});
  if(!response.ok)throw new Error("Could not load trip information");
  GUIDE=await response.json();
  $("#date-pill").textContent=GUIDE.meta?.datesLabel||"Legacy Group";
  $("#welcome").textContent=GUIDE.meta?.welcome||"Welcome aboard!";
  $("#trip-status").textContent=GUIDE.meta?.status||"";
  $("#trip-status").hidden=!GUIDE.meta?.status;
  announcements();itinerary();places();essentials();
 }catch(err){$("#trip-status").textContent="The guide is temporarily unavailable. Check your connection and reload.";console.error(err)}
 route();
 if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
document.addEventListener("DOMContentLoaded",init);
})();