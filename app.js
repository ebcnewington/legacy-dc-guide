(()=>{"use strict";
let G=null,Q=null,dayIndex=0,placeFilter="all",game={started:false,ended:false,asked:[],score:0,answered:0,correct:null,current:null,selection:null,ratings:{}};
const $=sel=>document.querySelector(sel);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ico=name=>'<svg class="icon" aria-hidden="true"><use href="#i-'+esc(name)+'"/></svg>';
const safeURL=s=>{try{let u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const addressUrl=s=>s?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s):"";
const phoneUrl=s=>s?"tel:"+String(s).replace(/[^\d+]/g,""):"";
const link=(href,label,icon="link")=>href?'<a class="action-link" href="'+esc(href)+'"'+(href.startsWith("http")?' target="_blank" rel="noopener noreferrer"':"")+'>'+ico(icon)+esc(label)+'</a>':"";
const links=o=>'<div class="link-row">'+(o.address?link(addressUrl(o.address),"Directions","pin"):"")+(o.website?link(safeURL(o.website),"Website"):"")+(o.phone?link(phoneUrl(o.phone),"Call "+o.phone,"phone"):"")+(o.mapUrl?link(safeURL(o.mapUrl),"Visitor map","map"):"")+'</div>';
const sec=(name,body,cls="")=>'<section class="essential-card '+cls+'"><h3>'+esc(name)+'</h3>'+body+'</section>';
const paragraphs=s=>s?'<p>'+esc(s)+'</p>':"";
const getLS=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
const putLS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
function route(){
 const name=(location.hash||"#home").slice(1),tab=["home","itinerary","places","essentials","trivia"].includes(name)?name:"home";
 document.querySelectorAll(".view").forEach(e=>{e.hidden=e.id!==tab});
 document.querySelectorAll("[data-tab]").forEach(e=>{const active=e.dataset.tab===tab;e.classList.toggle("active",active);if(active)e.setAttribute("aria-current","page");else e.removeAttribute("aria-current")});
 window.scrollTo({top:0,behavior:"instant"});
}
function announce(){
 const list=G.announcements||[];
 $("#announcements").innerHTML=list.length?list.map(i=>'<div class="notice"><strong>'+esc(i.title||"Update")+'</strong>'+paragraphs(i.message)+'</div>').join(""):sec("Nothing new","All travel updates will appear here.");
}
function itemSection(e){
 const warning=e.tentative?'<span class="chip-warn">Estimated</span>':"";
 const s=[e.description,e.summary,e.notes,e.walking&&"Walking: "+e.walking,e.accessibility&&"Accessibility: "+e.accessibility].filter(Boolean).map(paragraphs).join("");
 return '<details class="event"><summary><span><span class="time">'+esc(e.time||"Time to be announced")+'</span><strong>'+esc(e.title||"Activity")+warning+'</strong>'+(e.location?'<small>'+esc(e.location)+'</small>':"")+'</span></summary><div class="event-body">'+s+links(e)+(e.placeId?link("#places","Explore destination","map"):"")+'</div></details>';
}
function schedule(){
 const days=G.itinerary||[];
 $("#day-buttons").innerHTML=days.map((d,i)=>'<button type="button" data-day="'+i+'" aria-pressed="'+(i===dayIndex)+'">'+esc(d.label||d.date)+'</button>').join("");
 $("#day-buttons").querySelectorAll("button").forEach(b=>b.onclick=()=>{dayIndex=Number(b.dataset.day);schedule()});
 if(!days.length){$("#itinerary-heading").innerHTML="";$("#itinerary-content").innerHTML=sec("Schedule pending","Please check with your leader.");$("#next-event").innerHTML="Schedule pending";return}
 const d=days[dayIndex];
 $("#itinerary-heading").innerHTML='<h2>'+esc(d.heading||d.label)+'</h2><p>'+esc(d.label)+'</p>';
 $("#itinerary-content").innerHTML='<div class="timeline">'+(d.items||[]).map(itemSection).join("")+'</div>';
 const now=new Date(),iso=new Intl.DateTimeFormat("en-CA",{timeZone:G.meta?.timezone||"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const future=days.find(x=>x.date>=iso)||days[days.length-1];
 const first=(future.items||[])[0];
 $("#next-event").innerHTML=first?'<div class="upcoming-day">'+esc(future.label)+'</div><div class="upcoming-time">'+esc(first.time)+'</div><div class="upcoming-title">'+esc(first.title)+'</div>'+paragraphs(first.description)+link("#itinerary","View full schedule","calendar"):"See the daily itinerary for details.";
}
function placeGroup(p){
 if(["national-harbor"].includes(p.id))return "hotel";
 if(["mount-vernon"].includes(p.id))return "tue";
 if(["washington-monument","wwii","lincoln","vietnam","korea","jefferson","reflecting-pool"].includes(p.id))return "tue";
 if(["museum-bible","national-mall","capitol"].includes(p.id))return "wed";
 if(p.id==="arlington")return "thu";return "other"
}
function places(){
 const filters=[["all","All places"],["tue","Tuesday"],["wed","Wednesday"],["thu","Thursday"],["hotel","National Harbor"]];
 $("#place-filters").innerHTML=filters.map(([k,v])=>'<button type="button" class="filter-chip" data-filter="'+k+'" aria-pressed="'+(k===placeFilter)+'">'+v+'</button>').join("");
 document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{placeFilter=b.dataset.filter;places()});
 const filtered=(G.places||[]).map((p,i)=>({p,i})).filter(({p})=>placeFilter==="all"||placeGroup(p)===placeFilter);
 $("#places-grid").innerHTML=filtered.map(({p,i})=>'<article class="place-card"><div class="place-card-cover">'+ico(p.audio?.length?"headphones":"pin")+'<span class="place-number">'+String(i+1).padStart(2,"0")+'</span></div><div class="place-card-body"><p class="tag">'+esc(p.tag||"Featured site")+'</p><h3>'+esc(p.name)+'</h3><p>'+esc(p.summary||"")+'</p>'+(p.audio?.length?'<p class="audio-note">'+ico("headphones")+'Narrated tour available</p>':"")+'<button type="button" class="detail-button" data-place="'+i+'">Details &amp; directions</button></div></article>').join("");
 document.querySelectorAll("[data-place]").forEach(b=>b.onclick=()=>showPlace(G.places[Number(b.dataset.place)]));
}
function showPlace(p){
 let body='<p class="tag">'+esc(p.tag||"Destination")+'</p><h2>'+esc(p.name)+'</h2>'+paragraphs(p.summary)+paragraphs(p.detail)+links(p);
 const attributes=[["Food & dining",p.dining],["Restrooms",p.restrooms],["Accessibility",p.accessibility],["Helpful map",p.mapUrl?null:null]].filter(([_,v])=>v);
 body+=attributes.map(([t,v])=>'<div class="detail-section"><h3>'+esc(t)+'</h3>'+paragraphs(v)+'</div>').join("");
 if(p.audio?.length)body+='<div class="detail-section"><h3>'+ico("headphones")+' Audio tours &amp; listening guides</h3>'+p.audio.map(a=>'<div class="audio-item"><h4>'+esc(a.title)+'</h4><p>'+esc(a.description||"")+'</p><p class="tag">'+esc(a.cost||"Check provider")+'</p>'+link(safeURL(a.url),"Open listening guide","headphones")+'</div>').join("")+'</div>';
 $("#dialog-body").innerHTML=body;$("#place-dialog").showModal();
}
function essentials(){
 const e=G.essentials||{};
 let out='<div class="essential-grid">';
 out+=sec("Trip leaders",'<div class="contacts">'+(e.contacts||[]).map(c=>'<div class="contact-person"><div><div class="contact-name">'+esc(c.name)+'</div><div class="contact-role">'+esc(c.role||"")+'</div></div>'+link(phoneUrl(c.phone),"Call","phone")+'</div>').join("")+'</div>');
 if(e.hotels?.length)out+=sec("Our hotels",e.hotels.map(h=>'<p class="tag">'+esc(h.name)+'</p>'+paragraphs(h.address)+paragraphs(h.notes)+links(h)).join('<hr style="border:0;border-top:1px solid #dbe6e3;margin:17px 0">'));
 if(e.bus)out+=sec("Bus transportation",paragraphs(e.bus.notes)+links(e.bus));
 if(e.possiblePickup)out+=sec("Tentative Wednesday pickup",'<p><strong>Not confirmed:</strong> '+esc(e.possiblePickup.name||"")+'</p>'+paragraphs(e.possiblePickup.notes)+links(e.possiblePickup),"pending");
 out+='</div>';
 if(e.tips?.length)out+=sec("Before you head out",e.tips.map(t=>'<p><strong>'+esc(t.title)+'</strong><br>'+esc(t.description||"")+'</p>').join(""));
 $("#essentials-content").innerHTML=out;
 $("#faq-content").innerHTML=(G.faq||[]).map(g=>'<section class="faq-group"><h3>'+esc(g.topic)+'</h3>'+(g.items||[]).map(i=>'<details class="faq-item"><summary>'+esc(i.q)+'</summary>'+paragraphs(i.a)+'</details>').join("")+'</section>').join("");
 const maps=[...(G.maps||[]),...(G.resources||[]).filter(r=>!(G.maps||[]).some(m=>m.url===r.url))];
 $("#maps-content").innerHTML='<div class="resources">'+maps.filter(r=>safeURL(r.url)).map(r=>'<a class="resource-link" href="'+esc(safeURL(r.url))+'" target="_blank" rel="noopener noreferrer"><span>'+esc(r.label)+'</span>'+ico("link")+'</a>').join("")+'</div>';
}
let allRatings=getLS("ebc_trivia_ratings_1",{});
function questionIndex(){
 const remaining=Q.questions.filter(q=>!game.asked.includes(q.id));if(!remaining.length)return null;
 // With shared ratings unavailable, weight only this browser's expressed preferences by destination.
 // Include uniform exploration so new or unrated questions continue to appear.
 const weights=remaining.map(q=>{let related=Q.questions.filter(x=>x.placeId===q.placeId).map(x=>allRatings[x.id]).filter(Number.isFinite);let average=related.length?related.reduce((a,b)=>a+b,0)/related.length:3;return 1+Math.max(0,average-2)*.20});
 const total=weights.reduce((a,b)=>a+b,0);let cursor=Math.random()*total;
 for(let i=0;i<remaining.length;i++){cursor-=weights[i];if(cursor<=0)return remaining[i]}
 return remaining[remaining.length-1];
}
function storeGame(){putLS("ebc_trivia_session_1",game)}
function triviaStart(){
 const $t=$("#trivia-game");
 $t.innerHTML='<div class="trivia-start"><div class="giant-icon">'+ico("quiz")+'</div><h2>History is full of surprises.</h2><p class="trivia-intro">'+esc(Q?.intro||"Test your knowledge of Washington’s landmarks. Each answer includes a link to an original source.")+'</p><p class="trivia-intro">One question at a time. End your game whenever you wish.</p><button type="button" class="btn-primary" id="begin-trivia">Start playing</button></div>';
 $("#begin-trivia").onclick=()=>{game={started:true,ended:false,asked:[],score:0,answered:0,current:null,selection:null,correct:null,ratings:{}};storeGame();nextQuestion()};
}
function nextQuestion(){
 const selected=questionIndex();
 if(!selected){finishGame();return}
 game.current=selected.id;game.asked.push(selected.id);game.selection=null;game.correct=null;storeGame();renderQuestion();
}
function renderQuestion(){
 const q=Q.questions.find(q=>q.id===game.current);if(!q){triviaStart();return}
 const revealed=game.selection!==null,letter=["A","B","C","D"],name=G.places.find(p=>p.id===q.placeId)?.name||"Washington, D.C.";
 const choices=q.options.map((o,i)=>{
 let cls=revealed?(i===q.correctIndex?" correct":i===game.selection?" incorrect":""):"";
 return '<button class="answer-choice'+cls+'" data-answer="'+i+'" '+(revealed?"disabled":"")+'><span class="letter">'+letter[i]+'</span><span>'+esc(o)+'</span></button>'
 }).join("");
 const prev=allRatings[q.id]||0;
 const explanation=revealed?'<div class="trivia-result"><strong>'+(game.correct?"Correct!":"Here's the answer")+'</strong><p>'+esc(q.explanation)+'</p>'+link(safeURL(q.source?.url),"Read the primary source","link")+'</div><div class="rating-row"><span class="rating-label">Rate this question</span><span class="rating-stars">'+[1,2,3,4,5].map(n=>'<button class="star-button '+(n<=prev?"selected":"")+'" type="button" data-stars="'+n+'" aria-label="Rate '+n+' out of five stars" aria-pressed="'+(n===prev?'true':'false')+'">★</button>').join("")+'</span><span class="rating-label" id="rating-confirmation">'+(prev?"Saved on this device":"Optional")+'</span></div>':"";
 $("#trivia-game").innerHTML='<div class="trivia-card"><div class="trivia-top"><span>Question '+game.answered+(revealed?0:1)+'</span><span>Score: '+game.score+' / '+game.answered+'</span></div><p class="trivia-location">'+esc(name)+'</p><h2 class="trivia-question">'+esc(q.question)+'</h2><div class="answer-buttons">'+choices+'</div>'+explanation+'<div class="trivia-actions"><button type="button" class="btn-secondary" id="end-trivia">End game</button>'+(revealed?'<button type="button" class="btn-primary" id="next-trivia">Next question →</button>':'<span class="fineprint">Choose one answer</span>')+'</div></div>';
 $("#end-trivia").onclick=finishGame;
 if(revealed){$("#next-trivia").onclick=nextQuestion;document.querySelectorAll("[data-stars]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.stars);allRatings[q.id]=n;putLS("ebc_trivia_ratings_1",allRatings);document.querySelectorAll("[data-stars]").forEach(s=>{const k=Number(s.dataset.stars);s.classList.toggle("selected",k<=n);s.setAttribute("aria-pressed",String(k===n))});$("#rating-confirmation").textContent="Saved on this device"})}
 else document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.answer);game.selection=n;game.correct=n===q.correctIndex;game.answered++;if(game.correct)game.score++;storeGame();renderQuestion()});
}
function finishGame(){
 game.ended=true;game.current=null;storeGame();
 let accuracy=game.answered?Math.round(game.score/game.answered*100):0;
 let avg='<p><strong>Average-player comparison:</strong> not available yet. Shared, anonymous score collection has not been connected, so we will not display a made-up average.</p>';
 $("#trivia-game").innerHTML='<div class="trivia-end"><div class="giant-icon" style="margin:0 auto 20px">'+ico("quiz")+'</div><h2>Thanks for playing!</h2><p>You have discovered a little more of Washington’s remarkable history.</p><div class="trivia-stats"><div class="stat-item"><b>'+game.score+' / '+game.answered+'</b><small>Correct answers</small></div><div class="stat-item"><b>'+accuracy+'%</b><small>Your accuracy</small></div></div>'+avg+'<button type="button" class="btn-primary" id="replay-trivia">Play a new game</button></div>';
 $("#replay-trivia").onclick=triviaStart;
}
async function loadTrivia(){
 try{let r=await fetch(G.trivia?.questionsUrl||"data/trivia.json",{cache:"no-cache"});if(!r.ok)throw Error("Trivia unavailable");Q=await r.json();
  const old=getLS("ebc_trivia_session_1",null);
  if(old?.started&&!old?.ended&&Array.isArray(old.asked)){
   game={...game,...old};if(game.current)renderQuestion();else triviaStart();
  }else triviaStart();
 }catch(e){console.error(e);$("#trivia-game").innerHTML=sec("Trivia temporarily unavailable","Try reopening the game once you have a connection.")}
 $("#trivia-disclaimer").textContent=G.trivia?.disclaimer||"";
}
async function init(){
 window.addEventListener("hashchange",route);
 $("#dialog-close").onclick=()=>$("#place-dialog").close();
 $("#place-dialog").onclick=e=>{if(e.target.id==="place-dialog")e.target.close()};
 try{
  let r=await fetch("data/guide.json",{cache:"no-cache"});if(!r.ok)throw Error("Guide data unavailable");G=await r.json();
  $("#date-display").textContent=G.meta?.subtitle||"November 9–12, 2026";
  $("#welcome").textContent=G.meta?.welcome||"Welcome aboard!";
  $("#trip-status").textContent=G.meta?.status||"";
  announce();schedule();places();essentials();loadTrivia();
 }catch(e){console.error(e);$("#trip-status").textContent="Trip information is temporarily unavailable. Check your connection and reload."}
 route();if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
document.addEventListener("DOMContentLoaded",init);
})();