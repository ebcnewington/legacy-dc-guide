(()=>{"use strict";
let G=null,Q=null,communityStats=null,triviaService={apiBaseUrl:"",status:"not-configured"},dayIndex=0,placeFilter="all",game={started:false,ended:false,asked:[],score:0,answered:0,correct:null,current:null,selection:null,ratings:{}},tripUpdates=[],tripUpdatesBusy=false,tripUpdatesLastRefresh=0,tripUpdatesError="";
const deviceToken=getOrMakeDeviceToken();
function getOrMakeDeviceToken(){let v=null;try{v=localStorage.getItem("ebc_trivia_device_token_1")}catch{}if(v&&/^[a-f0-9-]{36}$/i.test(v))return v;v=crypto.randomUUID();try{localStorage.setItem("ebc_trivia_device_token_1",v)}catch{}return v}
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
 const live=tripUpdates.map(i=>'<article class="notice notice-live"><div class="notice-meta"><time datetime="'+esc(i.created_at||"")+'">Published '+esc(formatTripTime(i.created_at))+'</time>'+(i.updated_at&&new Date(i.updated_at).getTime()-new Date(i.created_at).getTime()>60000?' · Revised '+esc(formatTripTime(i.updated_at)):'')+'</div><strong>'+esc(i.title||"Update")+'</strong><p class="notice-message">'+esc(i.message||"")+'</p></article>').join("");
 $("#announcements").innerHTML=live||'<div class="updates-empty">No new updates from trip leadership.</div>';
 const reminders=G?.announcements||[];
 $("#trip-reminders").innerHTML=reminders.length?'<h3>Trip reminders</h3>'+reminders.map(i=>'<div class="notice"><strong>'+esc(i.title||"Reminder")+'</strong>'+paragraphs(i.message)+'</div>').join(""):"";
}
function formatTripTime(s){
 const d=new Date(s);
 if(!Number.isFinite(d.getTime()))return "recently";
 return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(d);
}
function ageSinceRefresh(){
 if(!tripUpdatesLastRefresh)return 'Not refreshed yet';
 const secs=Math.max(0,Math.floor((Date.now()-tripUpdatesLastRefresh)/1000));
 if(secs<40)return 'Last refreshed: just now';
 if(secs<60)return 'Last refreshed: less than a minute ago';
 const minutes=Math.floor(secs/60);
 if(minutes<60)return 'Last refreshed: '+minutes+' minute'+(minutes===1?'':'s')+' ago';
 const hours=Math.floor(minutes/60);
 if(hours<24)return 'Last refreshed: '+hours+' hour'+(hours===1?'':'s')+' ago';
 const days=Math.floor(hours/24);
 return 'Last refreshed: '+days+' day'+(days===1?'':'s')+' ago';
}
function updateRefreshIndicator(){
 const s=$('#updates-status');if(s)s.textContent=tripUpdatesBusy?'Checking for updates…':ageSinceRefresh()+(tripUpdatesError?' · '+tripUpdatesError:'');
}
async function refreshTripUpdates(){
 if(tripUpdatesBusy)return;
 tripUpdatesBusy=true;
 const button=$('#refresh-updates');if(button)button.disabled=true;
 updateRefreshIndicator();
 try{
  const r=await fetch('data/updates.json',{cache:'no-store'});
  if(!r.ok)throw Error('Trip updates unavailable: '+r.status);
  const data=await r.json();if(!Array.isArray(data.updates))throw Error('Invalid update feed');
  tripUpdates=data.updates.filter(i=>i&&typeof i.message==='string').slice(0,30);
  putLS('ebc_trip_updates_v1',tripUpdates);
  tripUpdatesLastRefresh=Date.now();putLS('ebc_trip_updates_refreshed_v1',tripUpdatesLastRefresh);
  tripUpdatesError='';announce();
 }catch(e){console.warn('Could not refresh trip updates',e);tripUpdatesError='Unable to check';announce();}
 finally{tripUpdatesBusy=false;if(button)button.disabled=false;updateRefreshIndicator();}
}
async function initPublisherAccess(){
 const trigger=$("#organizer-open"),dialog=$("#publisher-dialog"),frame=$("#publisher-frame"),setup=$("#publisher-setup");
 if(!trigger||!dialog||!frame||!setup)return;
 let publisherUrl="";
 trigger.hidden=false;
 trigger.onclick=()=>{
  if(publisherUrl){setup.hidden=true;frame.hidden=false;frame.src=publisherUrl;}
  else{frame.hidden=true;setup.hidden=false;}
  dialog.showModal();
 };
 $("#publisher-close").onclick=()=>dialog.close();
 dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
 dialog.addEventListener("close",()=>{
  if(!frame.hidden){frame.src="about:blank";refreshTripUpdates()}
 });
 try{
  const r=await fetch("data/publisher-config.json",{cache:"no-store"});
  if(!r.ok)return;
  const c=await r.json(),u=c.appUrl||"";
  if(c.status==="live"&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u))publisherUrl=u;
 }catch(e){console.warn("Publisher configuration unavailable",e)}
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
 const now=new Date();
 // Scheduled event times use Eastern Standard Time during this November trip.
 const eventDateTime=(d,e)=>{
  const m=(e.time||"").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if(!m||!d.date)return null;
  let h=(Number(m[1])%12)+(m[3].toUpperCase()==="PM"?12:0);
  return new Date(d.date+"T"+String(h).padStart(2,"0")+":"+m[2]+":00-05:00");
 };
 let upcoming=null;
 for(const d of days){
  for(const e of d.items||[]){
   const moment=eventDateTime(d,e);
   if(moment&&moment.getTime()>=now.getTime()-4*60000){upcoming={d,e};break}
  }
  if(upcoming)break;
 }
 if(upcoming){
  const {d,e}=upcoming;
  $("#next-event").innerHTML='<div class="upcoming-day">'+esc(d.label)+'</div><div class="upcoming-time">'+esc(e.time)+'</div><div class="upcoming-title">'+esc(e.title)+'</div>'+paragraphs(e.description)+link("#itinerary","View full schedule","calendar");
 }else{
  $("#next-event").innerHTML='<strong>Thank you for traveling with us.</strong><p>The scheduled activities have concluded. You can still explore places, audio guides, and trivia.</p>'+link("#trivia","Play Washington trivia","quiz");
 }
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
 let body='<p class="tag">'+esc(p.tag||"Destination")+'</p><h2 id="place-dialog-title" tabindex="-1">'+esc(p.name)+'</h2>'+paragraphs(p.summary)+paragraphs(p.detail)+links(p);
 const attributes=[["Food & dining",p.dining],["Restrooms",p.restrooms],["Accessibility",p.accessibility],["Helpful map",p.mapUrl?null:null]].filter(([_,v])=>v);
 body+=attributes.map(([t,v])=>'<div class="detail-section"><h3>'+esc(t)+'</h3>'+paragraphs(v)+'</div>').join("");
 if(p.audio?.length)body+='<div class="detail-section"><h3>'+ico("headphones")+' Audio tours &amp; listening guides</h3>'+p.audio.map(a=>'<div class="audio-item"><h4>'+esc(a.title)+'</h4><p>'+esc(a.description||"")+'</p><p class="tag">'+esc(a.cost||"Check provider")+'</p>'+link(safeURL(a.url),"Open listening guide","headphones")+'</div>').join("")+'</div>';
 $("#dialog-body").innerHTML=body;$("#place-dialog").showModal();$("#place-dialog-title")?.focus({preventScroll:true});
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
function usesAppsScript(){return triviaService?.provider==="apps-script"}
function isCommunityLive(){
 if(triviaService?.status!=="live")return false;
 if(usesAppsScript()){
  const target=triviaService.scriptUrl||"";
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/i.test(target);
 }
 return /^https:\/\/[^\s/]+/.test(triviaService?.apiBaseUrl||"");
}
function loadAggregateJsonp(url){
 return new Promise((resolve,reject)=>{
  const callback="__ebcTriviaCb_"+Math.random().toString(36).slice(2);
  const element=document.createElement("script");
  const cleanup=()=>{
   clearTimeout(timer);
   try{delete window[callback]}catch(_){window[callback]=undefined}
   element.remove();
  };
  const timer=setTimeout(()=>{cleanup();reject(new Error("Shared statistics timed out"))},9000);
  window[callback]=stats=>{cleanup();resolve(stats)};
  element.onerror=()=>{cleanup();reject(new Error("Shared statistics unavailable"))};
  const request=new URL(url);
  request.searchParams.set("action","stats");
  request.searchParams.set("callback",callback);
  request.searchParams.set("_",Date.now().toString());
  element.src=request.href;
  element.referrerPolicy="no-referrer";
  document.head.appendChild(element);
 });
}
async function loadTriviaService(){
 try{
  const cfg=await fetch("data/trivia-config.json",{cache:"no-store"});
  if(cfg.ok)triviaService=await cfg.json();
  if(!isCommunityLive())return;
  if(usesAppsScript()){
   communityStats=await loadAggregateJsonp(triviaService.scriptUrl);
  }else{
   const response=await fetch(triviaService.apiBaseUrl.replace(/\/$/,"")+"/v1/stats",{mode:"cors",cache:"no-store"});
   if(!response.ok)throw Error("Stats endpoint unavailable");
   communityStats=await response.json();
  }
  if(!communityStats||!Number.isFinite(communityStats.totalGames))communityStats=null;
 }catch(e){
  console.warn("Shared trivia statistics unavailable",e);
  communityStats=null;
 }
}
async function postCommunity(path,body){
 if(!isCommunityLive())return false;
 try{
  if(usesAppsScript()){
   // Apps Script redirects Content Service responses and does not expose CORS
   // headers. We send a simple POST with no-cors; the browser cannot confirm
   // whether the server accepted the submission. Stats come back via JSONP.
   const kind=path.endsWith("/rating")?"rating":"score";
   await fetch(triviaService.scriptUrl,{
    method:"POST",mode:"no-cors",cache:"no-store",
    headers:{"Content-Type":"text/plain;charset=UTF-8"},
    body:JSON.stringify({kind,...body})
   });
   return true; // request sent; server acknowledgement cannot be inspected
  }
  const response=await fetch(triviaService.apiBaseUrl.replace(/\/$/,"")+path,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(body),mode:"cors"
  });
  return response.ok;
 }catch(e){console.warn("Shared trivia submission could not be sent",e);return false}
}
function pendingSubmission(type,payload){
 if(!isCommunityLive())return;
 const queue=getLS("ebc_trivia_pending_1",[]);queue.push({type,payload});
 putLS("ebc_trivia_pending_1",queue.slice(-100));flushPending();
}
async function flushPending(){
 if(!isCommunityLive())return;
 const queue=getLS("ebc_trivia_pending_1",[]);if(!queue.length)return;
 const remaining=[];
 for(const item of queue){if(!await postCommunity(item.type,item.payload))remaining.push(item)}
 putLS("ebc_trivia_pending_1",remaining);
 if(!remaining.length)loadTriviaService();
}
function questionIndex(){
 const remaining=Q.questions.filter(q=>!game.asked.includes(q.id));if(!remaining.length)return null;
 // With shared ratings unavailable, weight only this browser's expressed preferences by destination.
 // Include uniform exploration so new or unrated questions continue to appear.
 const weights=remaining.map(q=>{
  const shared=communityStats?.questionRatings?.[q.id];
  const local=allRatings[q.id];
  const voteCount=shared?.votes||0;
  const mean=shared?.mean??(local||3.5);
  const bayesian=(3.5*8+mean*voteCount)/(8+voteCount);
  const exploration=.45,preference=Math.pow(bayesian/5,2)*1.55;
  return exploration+preference;
 });
 const total=weights.reduce((a,b)=>a+b,0);let cursor=Math.random()*total;
 for(let i=0;i<remaining.length;i++){cursor-=weights[i];if(cursor<=0)return remaining[i]}
 return remaining[remaining.length-1];
}
function storeGame(){putLS("ebc_trivia_session_1",game)}
function triviaStart(){
 const $t=$("#trivia-game");
 $t.innerHTML='<div class="trivia-start"><div class="giant-icon">'+ico("quiz")+'</div><h2>History is full of surprises.</h2><p class="trivia-intro">'+esc(Q?.intro||"Test your knowledge of Washington’s landmarks. Each answer includes a link to an original source.")+'</p><p class="trivia-intro">One question at a time. End your game whenever you wish.</p><button type="button" class="btn-primary" id="begin-trivia">Start playing</button></div>';
 $("#begin-trivia").onclick=()=>{game={started:true,ended:false,asked:[],score:0,answered:0,current:null,selection:null,correct:null,ratings:{},sessionId:crypto.randomUUID()};storeGame();nextQuestion()};
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
 const scorePct=game.answered?Math.round(game.score/game.answered*100):0;
 const compareText=communityStats?.totalGames>0&&Number.isFinite(communityStats.averageAccuracy)
 ?'Your accuracy: '+scorePct+'%. Average of '+communityStats.totalGames+' completed games: '+communityStats.averageAccuracy.toFixed(1)+'%.'
 :'Your accuracy: '+scorePct+'%. A shared player average is not yet available.';
 $("#trivia-game").innerHTML='<div class="trivia-card"><div class="trivia-top"><span>Question '+(revealed?game.answered:game.answered+1)+'</span><span>Score: '+game.score+' / '+game.answered+'</span><button type="button" class="trivia-compare" id="compare-trivia" aria-expanded="false">Compare</button></div><p class="compare-panel" id="compare-panel" hidden>'+esc(compareText)+'</p><p class="trivia-location">'+esc(name)+'</p><h2 class="trivia-question">'+esc(q.question)+'</h2><div class="answer-buttons">'+choices+'</div>'+explanation+'<div class="trivia-actions"><button type="button" class="btn-secondary" id="end-trivia">End game</button>'+(revealed?'<button type="button" class="btn-primary" id="next-trivia">Next question →</button>':'<span class="fineprint">Choose one answer</span>')+'</div></div>';
 $("#compare-trivia").onclick=()=>{
  const panel=$("#compare-panel");
  panel.hidden=!panel.hidden;
  $("#compare-trivia").setAttribute("aria-expanded",String(!panel.hidden));
 };
 $("#end-trivia").onclick=finishGame;
 if(revealed){$("#next-trivia").onclick=nextQuestion;document.querySelectorAll("[data-stars]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.stars);allRatings[q.id]=n;putLS("ebc_trivia_ratings_1",allRatings);document.querySelectorAll("[data-stars]").forEach(s=>{const k=Number(s.dataset.stars);s.classList.toggle("selected",k<=n);s.setAttribute("aria-pressed",String(k===n))});$("#rating-confirmation").textContent=isCommunityLive()?"Saved here · shared result pending":"Saved on this device";pendingSubmission("/v1/rating",{questionId:q.id,deviceToken,stars:n})})}
 else document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.answer);game.selection=n;game.correct=n===q.correctIndex;game.answered++;if(game.correct)game.score++;storeGame();renderQuestion()});
}
function finishGame(){
 game.ended=true;game.current=null;storeGame();
 let accuracy=game.answered?Math.round(game.score/game.answered*100):0;
 let avg=communityStats?.totalGames>0&&Number.isFinite(communityStats.averageAccuracy)
  ?'<p><strong>Other players average: '+communityStats.averageAccuracy.toFixed(1)+'%.</strong> '+(accuracy>=communityStats.averageAccuracy?'You scored '+Math.round((accuracy-communityStats.averageAccuracy)*10)/10+' percentage points above the group average.':'You scored '+Math.round((communityStats.averageAccuracy-accuracy)*10)/10+' percentage points below the group average.')+' Based on '+communityStats.totalGames+' completed game'+(communityStats.totalGames===1?'':'s')+'.</p>'
  :'<p><strong>Average-player comparison:</strong> not yet available. Shared results only appear after the community service receives completed games.</p>';
 if(game.answered>0){
  if(!game.sessionId)game.sessionId=crypto.randomUUID();
  pendingSubmission("/v1/score",{sessionId:game.sessionId,deviceToken,correct:game.score,answered:game.answered});
 }
 $("#trivia-game").innerHTML='<div class="trivia-end"><div class="giant-icon" style="margin:0 auto 20px">'+ico("quiz")+'</div><h2>Thanks for playing!</h2><p>You have discovered a little more of Washington’s remarkable history.</p><div class="trivia-stats"><div class="stat-item"><b>'+game.score+' / '+game.answered+'</b><small>Correct answers</small></div><div class="stat-item"><b>'+accuracy+'%</b><small>Your accuracy</small></div></div>'+avg+'<button type="button" class="btn-primary" id="replay-trivia">Play a new game</button></div>';
 $("#replay-trivia").onclick=triviaStart;
}
async function loadTrivia(){
 try{
  const [original,extra]=await Promise.all([
   fetch(G.trivia?.questionsUrl||"data/trivia.json",{cache:"no-cache"}),
   fetch("data/trivia-extra.json",{cache:"no-cache"})
  ]);
  if(!original.ok||!extra.ok)throw Error("Trivia library unavailable");
  const first=await original.json(),additional=await extra.json();
  const questions=[...(first.questions||[]),...(additional.questions||[])];
  const ids=new Set();
  Q={...first,questions:questions.filter(q=>{if(ids.has(q.id))return false;ids.add(q.id);return true})};
  await loadTriviaService();
  flushPending();
  const old=getLS("ebc_trivia_session_1",null);
  if(old?.started&&!old?.ended&&Array.isArray(old.asked)){
   game={...game,...old};if(Q.questions.some(q=>q.id===game.current))renderQuestion();
   else nextQuestion();
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
  tripUpdates=getLS("ebc_trip_updates_v1",[]);tripUpdatesLastRefresh=Number(getLS('ebc_trip_updates_refreshed_v1',0))||0;
  announce();schedule();places();essentials();loadTrivia();
  $("#refresh-updates").addEventListener("click",()=>refreshTripUpdates());
  updateRefreshIndicator();refreshTripUpdates();initPublisherAccess();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshTripUpdates(true)});
  window.setInterval(()=>{if(!document.hidden)refreshTripUpdates()},180000);
  window.setInterval(updateRefreshIndicator,20000);
 }catch(e){console.error(e);$("#trip-status").textContent="Trip information is temporarily unavailable. Check your connection and reload."}
 route();if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{}));
}
document.addEventListener("DOMContentLoaded",init);
})();