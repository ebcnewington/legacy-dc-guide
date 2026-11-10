/**
 * Washington Legacy Tour — direct Trip Updates publisher
 * ONE-FILE Google Apps Script. Public updates are stored in a private Google
 * Sheet and served through a read-only JSONP feed. Only organizers who know
 * their individual 4-digit PIN can publish.
 * Do not place actual PINs or private keys into this public source.
 */
const TOUR={prefix:"EBC_UPDATES_",sheetName:"Updates",rateHour:3600000,roles:{rob:"Rob",ashlee:"Ashlee"}};
function tourProps_(){return PropertiesService.getScriptProperties()}
function tourProp_(name){return tourProps_().getProperty(TOUR.prefix+name)}
function tourHash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(x=>("0"+(x&255).toString(16)).slice(-2)).join("")}
function tourSheet_(){
 const id=tourProp_("SHEET_ID");
 if(!id)throw Error("This publisher has not been initialized.");
 const book=SpreadsheetApp.openById(id);
 const sheet=book.getSheetByName(TOUR.sheetName);
 if(!sheet)throw Error("The Updates sheet is missing.");
 return sheet;
}
/** Owner runs this function once, after entering two private Script Properties. */
function initializePublisher(){
 const props=tourProps_(),pending=[];
 Object.keys(TOUR.roles).forEach(role=>{
   const k=role.toUpperCase(),pin=tourProp_(k+"_PIN_INITIAL");
   if(pin&&!/^\d{4}$/.test(pin))throw Error(k+" initial PIN must contain 4 digits.");
   if(!pin&&!tourProp_(k+"_PIN_HASH"))throw Error("Set private Script Property "+TOUR.prefix+k+"_PIN_INITIAL.");
   if(pin){const salt=Utilities.getUuid()+Utilities.getUuid();pending.push({k,salt,hash:tourHash_(salt+":"+pin)})}
 });
 let id=tourProp_("SHEET_ID"),book;
 if(id){book=SpreadsheetApp.openById(id)}
 else{
   book=SpreadsheetApp.create("Washington Legacy Tour — Trip Updates");
   id=book.getId();
   props.setProperty(TOUR.prefix+"SHEET_ID",id);
 }
 let sheet=book.getSheetByName(TOUR.sheetName);
 if(!sheet){sheet=book.getSheets()[0];sheet.setName(TOUR.sheetName)}
 if(sheet.getLastRow()===0){
   sheet.appendRow(["Published (ISO)","ID","Organizer","Title","Message"]);
   sheet.getRange(1,1,1,5).setBackground("#044F56").setFontColor("#ffffff").setFontWeight("bold");
   sheet.setFrozenRows(1);
 }
 pending.forEach(item=>{
   props.setProperty(TOUR.prefix+item.k+"_PIN_SALT",item.salt);
   props.setProperty(TOUR.prefix+item.k+"_PIN_HASH",item.hash);
   props.deleteProperty(TOUR.prefix+item.k+"_PIN_INITIAL");
 });
 Logger.log("Trip Updates storage initialized. Updates Sheet: "+book.getUrl());
}
function tourFeed_(){
 const sheet=tourSheet_();
 const last=sheet.getLastRow();
 if(last<=1)return {updates:[]};
 const count=Math.min(30,last-1);
 const rows=sheet.getRange(last-count+1,1,count,5).getValues();
 const updates=rows.reverse().filter(r=>r[0]&&r[3]&&r[4]).map(r=>({
   id:"sheet-"+String(r[1]),
   created_at:String(r[0]),
   title:String(r[3]).slice(0,110),
   message:String(r[4]).slice(0,3000),
   source:"organizer"
 }));
 return {updates:updates};
}
function doGet(e){
 const p=e&&e.parameter||{};
 if(p.action==="updates"){
   let data;
   try{data=tourFeed_()}catch(ex){console.error(ex);data={updates:[],error:"Feed unavailable"}}
   const callback=String(p.callback||"");
   if(callback&&!/^__ebcPubCb_[a-z0-9]{6,36}$/.test(callback))
     return ContentService.createTextOutput(JSON.stringify({error:"Invalid callback"})).setMimeType(ContentService.MimeType.JSON);
   if(callback)return ContentService.createTextOutput(callback+"("+JSON.stringify(data)+");").setMimeType(ContentService.MimeType.JAVASCRIPT);
   return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
 }
 return HtmlService.createHtmlOutput(TOUR_EDITOR_HTML)
   .setTitle("Legacy Tour — Trip Updates")
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function tourLimit_(role,key,limit,increment){
 const props=tourProps_(),name=TOUR.prefix+"RATE_"+key+"_"+role,now=Date.now();
 let state;try{state=JSON.parse(props.getProperty(name)||"{}")}catch(ex){state={}}
 if(!state.since||now-state.since>TOUR.rateHour)state={since:now,count:0};
 if(state.count>=limit)throw Error("Too many attempts. Please try again later.");
 if(increment){state.count++;props.setProperty(name,JSON.stringify(state))}
}
function tourValidPin_(role,pin){
 const k=role.toUpperCase(),salt=tourProp_(k+"_PIN_SALT"),expected=tourProp_(k+"_PIN_HASH");
 return !!(salt&&expected&&/^\d{4}$/.test(String(pin||""))&&tourHash_(salt+":"+pin)===expected);
}
function publishUpdate(role,pin,title,message){
 role=String(role||"").toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(TOUR.roles,role))throw Error("Choose an organizer.");
 title=String(title||"").trim();message=String(message||"").trim();
 if(title.length<3||title.length>110)throw Error("Title must contain 3–110 characters.");
 if(message.length<10||message.length>3000)throw Error("Message must contain 10–3000 characters.");
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw Error("Publisher busy. Try again.");
 try{
   tourLimit_(role,"PIN",5,false);
   if(!tourValidPin_(role,pin)){tourLimit_(role,"PIN",5,true);throw Error("Incorrect PIN.")}
   tourLimit_(role,"POST",15,true);
   const now=new Date().toISOString(),id=Utilities.getUuid();
   const safeText=x=>/^[=+@-]/.test(x)?"'"+x:x;
   tourSheet_().appendRow([now,id,TOUR.roles[role],safeText(title),safeText(message)]);
   tourProps_().deleteProperty(TOUR.prefix+"RATE_PIN_"+role);
   return {ok:true,id:"sheet-"+id,published_at:now};
 }finally{lock.releaseLock()}
}

const TOUR_EDITOR_HTML="<!doctype html>\n<html lang=\"en\"><head><base target=\"_top\"><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<link href=\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<style>\n:root{--teal:#044f56;--gold:#ffae05;--pale:#f2f7f5;--muted:#536967}\n*{box-sizing:border-box}\nbody{font:400 14px/1.55 Montserrat,Arial,sans-serif;margin:0;background:#fff;color:#253738;padding:18px}\nh2{font-size:1.24rem;letter-spacing:-.02em;color:var(--teal);margin:0 0 7px}\np{margin:0 0 16px;color:var(--muted)}\nlabel{display:block;font-weight:800;margin:14px 0 6px;font-size:.82rem;color:#204548}\ninput,textarea,select{width:100%;font:500 15px/1.5 Montserrat,Arial,sans-serif;border:1px solid #b5ceca;border-radius:11px;padding:12px 13px;color:#203739;background:#fff}\ninput:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #7bc2c8;outline-offset:1px}\ntextarea{min-height:165px;resize:vertical}\nbutton{width:100%;margin-top:16px;background:var(--teal);color:#fff;border:0;border-radius:11px;padding:14px;font:800 14px Montserrat,Arial,sans-serif;cursor:pointer}\nbutton:disabled{opacity:.55;cursor:wait}\n.muted{font-size:.75rem;color:var(--muted);margin:8px 0 0}\n.notice{font-size:.78rem;background:#fff8ea;border-left:4px solid var(--gold);padding:12px 13px;border-radius:9px;margin:16px 0 0}\n#status{font-size:.84rem;font-weight:700;margin-top:15px;min-height:24px}\n#status[data-kind=\"success\"]{color:#287052}\n#status[data-kind=\"error\"]{color:#922f30}\n#status a{color:var(--teal);text-decoration:underline}\n</style></head>\n<body>\n<h2>Post a trip update</h2>\n<p>A quick announcement for everyone traveling with us.</p>\n<form id=\"publish-form\">\n<label for=\"organizer\">Posting as</label>\n<select id=\"organizer\" required>\n<option value=\"ashlee\">Ashlee</option>\n<option value=\"rob\">Rob</option>\n</select>\n<label for=\"title\">Update title</label>\n<input id=\"title\" maxlength=\"110\" required placeholder=\"e.g., Tomorrow's departure\">\n<label for=\"message\">Message</label>\n<textarea id=\"message\" maxlength=\"3000\" required placeholder=\"Type the update for travelers here…\"></textarea>\n<label for=\"pin\">Your four-digit PIN</label>\n<input id=\"pin\" type=\"password\" inputmode=\"numeric\" pattern=\"[0-9]{4}\" minlength=\"4\" maxlength=\"4\" autocomplete=\"off\" required placeholder=\"••••\">\n<p class=\"muted\">Only organizers with a PIN can publish. Updates are visible to everyone.</p>\n<button id=\"publish\" type=\"submit\">Publish update</button>\n</form>\n<p id=\"status\" aria-live=\"polite\" role=\"status\"></p>\n<div class=\"notice\">New updates appear when the guide finishes publishing. Travelers can use the Refresh button to see the latest announcement.</div>\n<script>\n(() => {\n \"use strict\";\n const $=id=>document.getElementById(id);\n const setStatus=(message,kind)=>{\n   const el=$(\"status\");el.textContent=message;el.dataset.kind=kind||\"\";\n };\n $(\"publish-form\").addEventListener(\"submit\",event=>{\n   event.preventDefault();\n   const role=$(\"organizer\").value;\n   const pin=$(\"pin\").value;\n   const title=$(\"title\").value;\n   const message=$(\"message\").value;\n   if(!/^\\d{4}$/.test(pin)){setStatus(\"Enter a four-digit PIN.\",\"error\");return}\n   $(\"publish\").disabled=true;\n   setStatus(\"Publishing your update…\");\n   google.script.run\n     .withSuccessHandler(result=>{\n       $(\"publish\").disabled=false;\n       $(\"pin\").value=\"\";\n       if(!result||!result.ok){setStatus(\"The update could not be confirmed.\",\"error\");return}\n       $(\"title\").value=\"\";$(\"message\").value=\"\";\n       setStatus(\"Update submitted successfully.\",\"success\");\n       if(typeof result.url===\"string\"&&result.url.startsWith(\"https://github.com/\")){\n         const link=document.createElement(\"a\");\n         link.href=result.url;link.target=\"_blank\";link.rel=\"noopener noreferrer\";\n         link.textContent=\"View update record\";\n         $(\"status\").appendChild(document.createTextNode(\" \"));\n         $(\"status\").appendChild(link);\n       }\n     })\n     .withFailureHandler(error=>{\n       $(\"publish\").disabled=false;\n       $(\"pin\").value=\"\";\n       setStatus(error&&error.message?error.message:\"Unable to publish the update. Please retry.\",\"error\");\n     })\n     .publishUpdate(role,pin,title,message);\n });\n})();\n</script></body></html>";
