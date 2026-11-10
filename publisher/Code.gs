/**
 * Washington Legacy Tour — organizer Trip Updates.
 * A private Google Apps Script bridge for posting to the existing GitHub feed.
 *
 * The GitHub token and initial 4-digit PINs live ONLY in private Script Properties.
 * The public GitHub Pages source never contains them.
 */
const PUB={
  repository:"ebcnewington/legacy-dc-guide",
  roles:{rob:"Rob",ashlee:"Ashlee"},
  prefix:"EBC_UPDATES_",
  hour:60*60*1000
};
function publisherProps_(){return PropertiesService.getScriptProperties()}
function publisherProp_(key){return publisherProps_().getProperty(PUB.prefix+key)}
function publisherHash_(value){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value))
    .map(x=>("0"+(x&255).toString(16)).slice(-2)).join("");
}
function publisherRole_(value){
  const role=String(value||"").toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(PUB.roles,role))throw Error("Choose an organizer.");
  return role;
}
/** Run this once from the private Apps Script editor after entering Script Properties. */
function initializePublisher(){
  const props=publisherProps_();
  if(!publisherProp_("GITHUB_TOKEN"))throw Error("Add EBC_UPDATES_GITHUB_TOKEN to private Script Properties.");
  const updates=[];
  Object.keys(PUB.roles).forEach(role=>{
    const key=role.toUpperCase(),initial=publisherProp_(key+"_PIN_INITIAL");
    if(initial&&!/^\d{4}$/.test(initial))throw Error("Initial PIN must contain exactly four digits: "+role);
    if(!initial&&!publisherProp_(key+"_PIN_HASH"))throw Error("Add EBC_UPDATES_"+key+"_PIN_INITIAL.");
    if(initial){
      const salt=Utilities.getUuid()+Utilities.getUuid();
      updates.push({key,salt,digest:publisherHash_(salt+":"+initial)});
    }
  });
  updates.forEach(x=>{
    props.setProperty(PUB.prefix+x.key+"_PIN_SALT",x.salt);
    props.setProperty(PUB.prefix+x.key+"_PIN_HASH",x.digest);
    props.deleteProperty(PUB.prefix+x.key+"_PIN_INITIAL");
  });
  Logger.log("Organizers initialized. Original PIN values were removed from Script Properties.");
}
function doGet(){
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Legacy Tour — Trip Updates")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/** Locked functions are internal to the server; a client cannot call _-suffixed functions. */
function rateCheck_(role,recordFailure){
  const props=publisherProps_(),key=PUB.prefix+"RATE_PIN_"+role,now=Date.now();
  let state;
  try{state=JSON.parse(props.getProperty(key)||"{}")}catch(e){state={}}
  if(!state.since||now-state.since>PUB.hour)state={since:now,count:0};
  if(state.count>=5)throw Error("Too many incorrect PIN attempts. Try again later.");
  if(recordFailure){
    state.count++;
    props.setProperty(key,JSON.stringify(state));
  }
}
function pinMatches_(role,pin){
  const name=role.toUpperCase(),salt=publisherProp_(name+"_PIN_SALT"),hash=publisherProp_(name+"_PIN_HASH");
  return !!(salt&&hash&&/^\d{4}$/.test(String(pin||""))&&publisherHash_(salt+":"+pin)===hash);
}
/** Submit an announcement from the in-guide modal after validating its organizer PIN. */
function publishUpdate(role,pin,title,message){
  role=publisherRole_(role);
  title=String(title||"").trim();
  message=String(message||"").trim();
  if(title.length<3||title.length>110)throw Error("Please enter a title between 3 and 110 characters.");
  if(message.length<10||message.length>3000)throw Error("The update must be 10–3000 characters long.");
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(12000))throw Error("The publisher is busy. Please retry.");
  try{
    rateCheck_(role,false);
    if(!pinMatches_(role,pin)){
      rateCheck_(role,true);
      throw Error("Incorrect PIN.");
    }
    const props=publisherProps_(),key=PUB.prefix+"RATE_POST_"+role,now=Date.now();
    let state;
    try{state=JSON.parse(props.getProperty(key)||"{}")}catch(e){state={}}
    if(!state.since||now-state.since>PUB.hour)state={since:now,count:0};
    if(state.count>=15)throw Error("Too many updates this hour. Please try later.");
    state.count++;props.setProperty(key,JSON.stringify(state));
    props.deleteProperty(PUB.prefix+"RATE_PIN_"+role);
  }finally{lock.releaseLock()}
  const token=publisherProp_("GITHUB_TOKEN");
  if(!token)throw Error("The publisher has not been activated.");
  const payload={
    title:"[Trip Update] "+title,
    body:message+"\n\n<!-- Tour update submitted by "+PUB.roles[role]+" -->"
  };
  const response=UrlFetchApp.fetch("https://api.github.com/repos/"+PUB.repository+"/issues",{
    method:"post",
    contentType:"application/json",
    headers:{
      Authorization:"Bearer "+token,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28"
    },
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  if(response.getResponseCode()!==201){
    console.error("GitHub rejected the issue creation: "+response.getResponseCode());
    throw Error("Unable to publish the update. Please try again.");
  }
  const result=JSON.parse(response.getContentText());
  return {ok:true,url:result.html_url,number:result.number};
}
