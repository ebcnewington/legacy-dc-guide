/**
 * Legacy Tour — secure organizer update publisher.
 * Standalone Google Apps Script. Secrets belong only in Script Properties.
 */
const PUB={repo:"ebcnewington/legacy-dc-guide",roles:{rob:"Rob",ashlee:"Ashlee"},prefix:"EBC_UPDATES_",hour:3600000};
function props_(){return PropertiesService.getScriptProperties()}
function prop_(k){return props_().getProperty(PUB.prefix+k)}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)).map(x=>("0"+(x&255).toString(16)).slice(-2)).join("")}
function role_(s){s=String(s||"").toLowerCase();if(!Object.prototype.hasOwnProperty.call(PUB.roles,s))throw Error("Invalid organizer");return s}
function initializePublisher(){
 const props=props_();
 if(!prop_("GITHUB_TOKEN"))throw Error("Configure EBC_UPDATES_GITHUB_TOKEN in Script Properties");
 const prepared=[];
 ["rob","ashlee"].forEach(role=>{
  const k=role.toUpperCase(),pin=prop_(k+"_PIN_INITIAL"),email=prop_(k+"_EMAIL");
  if(!email||!String(email).includes("@"))throw Error("Configure EBC_UPDATES_"+k+"_EMAIL");
  if(pin&&!/^\d{4}$/.test(pin))throw Error("Initial PIN must be four digits: "+role);
  if(!pin&&!prop_(k+"_PIN_HASH"))throw Error("Configure EBC_UPDATES_"+k+"_PIN_INITIAL");
  if(pin){const salt=Utilities.getUuid()+Utilities.getUuid();prepared.push({k,salt,digest:hash_(salt+":"+pin)})}
 });
 prepared.forEach(x=>{props.setProperty(PUB.prefix+x.k+"_PIN_SALT",x.salt);props.setProperty(PUB.prefix+x.k+"_PIN_HASH",x.digest);props.deleteProperty(PUB.prefix+x.k+"_PIN_INITIAL")});
 Logger.log("Organizer PIN hashes installed; raw PINs discarded.");
}
function doGet(){
 return HtmlService.createHtmlOutputFromFile("Index").setTitle("Legacy Tour Updates — Organizers")
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function rate_(name,limit,windowMs,increment){
 const p=props_(),key=PUB.prefix+"RATE_"+name,now=Date.now();
 let v;try{v=JSON.parse(p.getProperty(key)||"{}")}catch(e){v={}}
 if(!v.since||now-v.since>windowMs)v={since:now,count:0};
 if(v.count>=limit)throw Error("Too many attempts. Try again later.");
 if(increment){v.count++;p.setProperty(key,JSON.stringify(v))}
}
function clearRate_(name){props_().deleteProperty(PUB.prefix+"RATE_"+name)}
function randomToken_(){return Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"")}
function newOTP_(){return String(100000+parseInt(randomToken_().slice(0,10),16)%900000)}
function validPin_(role,pin){
 const k=role.toUpperCase(),salt=prop_(k+"_PIN_SALT"),digest=prop_(k+"_PIN_HASH");
 return !!(salt&&digest&&/^\d{4}$/.test(String(pin||""))&&hash_(salt+":"+pin)===digest);
}
function beginLogin(role,pin){
 role=role_(role);
 const lock=LockService.getScriptLock();if(!lock.tryLock(12000))throw Error("Temporarily busy");
 try{
  rate_("PIN_"+role,5,PUB.hour,false);
  if(!validPin_(role,pin)){rate_("PIN_"+role,5,PUB.hour,true);throw Error("Incorrect PIN or account temporarily locked")}
  clearRate_("PIN_"+role);
  rate_("MAIL_"+role,3,PUB.hour,true);
  const challenge=randomToken_(),otp=newOTP_(),email=prop_(role.toUpperCase()+"_EMAIL");
  if(!email)throw Error("Organizer email not configured");
  CacheService.getScriptCache().put("pub_ch_"+challenge,JSON.stringify({role,hash:hash_(challenge+":"+otp)}),600);
  MailApp.sendEmail({
   to:email,subject:"Washington Tour — organizer sign-in code",
   body:"Your one-time verification code is "+otp+". It expires in 10 minutes.\n\nIf you did not request this code, please ignore this message."
  });
  return {ok:true,challenge};
 }finally{lock.releaseLock()}
}
function confirmLogin(role,challenge,otp){
 role=role_(role);
 const lock=LockService.getScriptLock();if(!lock.tryLock(12000))throw Error("Temporarily busy");
 try{
  rate_("OTP_"+role,5,PUB.hour,false);
  if(!/^[0-9a-f]{64}$/.test(String(challenge||""))||!/^\d{6}$/.test(String(otp||"")))throw Error("Invalid verification code");
  const cache=CacheService.getScriptCache(),raw=cache.get("pub_ch_"+challenge);
  if(!raw)throw Error("Code expired. Sign in again.");
  const item=JSON.parse(raw);
  if(item.role!==role||item.hash!==hash_(challenge+":"+otp)){rate_("OTP_"+role,5,PUB.hour,true);throw Error("Incorrect verification code")}
  cache.remove("pub_ch_"+challenge);clearRate_("OTP_"+role);
  const session=randomToken_();cache.put("pub_session_"+hash_(session),role,3600);
  return {ok:true,session,name:PUB.roles[role]};
 }finally{lock.releaseLock()}
}
function publishUpdate(session,title,message){
 const role=CacheService.getScriptCache().get("pub_session_"+hash_(session||""));
 if(!role)throw Error("Session expired. Please sign in again.");
 title=String(title||"").trim();message=String(message||"").trim();
 if(title.length<3||title.length>110)throw Error("Title must be 3–110 characters");
 if(message.length<10||message.length>3000)throw Error("Message must be 10–3000 characters");
 const lock=LockService.getScriptLock();if(!lock.tryLock(12000))throw Error("Temporarily busy");
 try{rate_("POST_"+role,15,PUB.hour,true)}finally{lock.releaseLock()}
 const token=prop_("GITHUB_TOKEN");if(!token)throw Error("Publisher is not configured");
 const payload={title:"[Trip Update] "+title,body:message+"\n\n<!-- Legacy Tour organizer: "+PUB.roles[role]+" -->"};
 const res=UrlFetchApp.fetch("https://api.github.com/repos/"+PUB.repo+"/issues",{
  method:"post",contentType:"application/json",
  headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},
  payload:JSON.stringify(payload),muteHttpExceptions:true
 });
 if(res.getResponseCode()!==201){console.error("GitHub create issue status "+res.getResponseCode());throw Error("Publishing failed. No announcement was confirmed.")}
 const issue=JSON.parse(res.getContentText());return {ok:true,url:issue.html_url,number:issue.number};
}
