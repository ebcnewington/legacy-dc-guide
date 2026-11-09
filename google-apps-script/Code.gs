/**
 * Washington Legacy Tour — Shared Trivia Statistics
 *
 * Google Apps Script web app. Runs from your own Google account and stores
 * aggregate ratings in a private Google Sheet you own.
 *
 * First run setupTriviaBackend() from the script editor and authorize it.
 * Then deploy as "Web app" -> "Execute as me" -> "Who has access: Anyone".
 * See README.md for setup and privacy/security notes.
 */
const APP = {
  sheets: { games: "Games", ratings: "Ratings" },
  maxGamesPerDevicePerDay: 10,
  maxRatingsPerDevicePerDay: 150,
  callback: /^__ebcTriviaCb_[a-z0-9]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  question: /^dc-\d{3}$/
};

function setupTriviaBackend(){
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty("EBC_TRIVIA_SHEET_ID");
  if(!id){
    const file=SpreadsheetApp.create("Washington Legacy Tour — Anonymous Trivia Statistics");
    id=file.getId();
    props.setProperty("EBC_TRIVIA_SHEET_ID",id);
  }
  if(!props.getProperty("EBC_TRIVIA_HASH_KEY")){
    props.setProperty("EBC_TRIVIA_HASH_KEY",Utilities.getUuid()+"-"+Utilities.getUuid());
  }
  const book=SpreadsheetApp.openById(id);
  ensureSheet_(book,APP.sheets.games,["session_id","device_hash","correct","answered","finished_at"]);
  ensureSheet_(book,APP.sheets.ratings,["question_id","device_hash","stars","updated_at"]);
  Logger.log("Private statistics sheet: "+book.getUrl());
  return book.getUrl();
}

function ensureSheet_(book,name,cols){
  let sheet=book.getSheetByName(name);
  if(!sheet)sheet=book.insertSheet(name);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,cols.length).setValues([cols]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,cols.length).setBackground("#044F56").setFontColor("#ffffff").setFontWeight("bold");
    sheet.autoResizeColumns(1,cols.length);
  }
  return sheet;
}

function getBook_(){
  const id=PropertiesService.getScriptProperties().getProperty("EBC_TRIVIA_SHEET_ID");
  if(!id)throw new Error("Please run setupTriviaBackend once before deploying.");
  return SpreadsheetApp.openById(id);
}

function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  const p=(e&&e.parameter)||{};
  const callback=String(p.callback||"");
  if(callback&&!APP.callback.test(callback))return json_({error:"Invalid callback"});
  let result;
  try{
    if((p.action||"stats")==="health")result={ok:true,service:"ebc-legacy-trivia-google"};
    else if((p.action||"stats")==="stats")result=readStats_();
    else result={error:"Unsupported action"};
  }catch(ex){console.error(ex);result={error:"Statistics temporarily unavailable"}}
  // JSONP is used only for PUBLIC, NONSENSITIVE aggregate statistics.
  // The write endpoint is POST-only, and no raw device identifier is sent back.
  if(callback){
    return ContentService.createTextOutput(callback+"("+JSON.stringify(result)+");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(result);
}

function doPost(e){
  let lock;
  try{
    if(!e||!e.postData||!e.postData.contents||e.postData.contents.length>1300)
      return json_({ok:false,error:"Invalid request"});
    const body=JSON.parse(e.postData.contents);
    if(!body||!APP.uuid.test(String(body.deviceToken||"")))
      return json_({ok:false,error:"Invalid device token"});
    const deviceHash=hmac_(body.deviceToken);
    lock=LockService.getScriptLock();
    if(!lock.tryLock(12000))return json_({ok:false,error:"Please retry"});
    const book=getBook_(),now=new Date();
    let response;
    if(body.kind==="rating")response=writeRating_(book,deviceHash,body,now);
    else if(body.kind==="score")response=writeScore_(book,deviceHash,body,now);
    else response={ok:false,error:"Unsupported request"};
    if(response.ok)CacheService.getScriptCache().remove("ebc_stats_v1");
    return json_(response);
  }catch(ex){
    console.error(ex);
    return json_({ok:false,error:"Request could not be recorded"});
  }finally{
    if(lock)try{lock.releaseLock()}catch(_){}
  }
}

function hmac_(value){
  const secret=PropertiesService.getScriptProperties().getProperty("EBC_TRIVIA_HASH_KEY");
  if(!secret)throw new Error("Run setupTriviaBackend first");
  return Utilities.computeHmacSha256Signature(String(value),secret)
    .map(function(byte){return ("0"+(byte&255).toString(16)).slice(-2)}).join("");
}

function rows_(sheet){
  const count=sheet.getLastRow()-1;
  return count<=0?[]:sheet.getRange(2,1,count,sheet.getLastColumn()).getValues();
}

function recentCount_(rows,hash,hashColumn,stampColumn,now){
  const since=now.getTime()-24*60*60*1000;
  return rows.filter(r=>String(r[hashColumn])===hash&&new Date(r[stampColumn]).getTime()>since).length;
}

function writeScore_(book,hash,b,now){
  const correct=Number(b.correct),answered=Number(b.answered);
  if(!APP.uuid.test(String(b.sessionId||""))||
    !Number.isInteger(correct)||!Number.isInteger(answered)||
    answered<1||answered>120||correct<0||correct>answered)
    return {ok:false,error:"Invalid score"};
  const sheet=book.getSheetByName(APP.sheets.games),rows=rows_(sheet);
  if(rows.some(r=>String(r[0])===b.sessionId))return {ok:true,duplicate:true};
  if(recentCount_(rows,hash,1,4,now)>=APP.maxGamesPerDevicePerDay)
    return {ok:false,error:"Daily submission limit reached"};
  sheet.appendRow([b.sessionId,hash,correct,answered,now]);
  return {ok:true};
}

function writeRating_(book,hash,b,now){
  const stars=Number(b.stars);
  if(!APP.question.test(String(b.questionId||""))||
    !Number.isInteger(stars)||stars<1||stars>5)
    return {ok:false,error:"Invalid rating"};
  const sheet=book.getSheetByName(APP.sheets.ratings),rows=rows_(sheet);
  const existing=rows.findIndex(r=>String(r[0])===b.questionId&&String(r[1])===hash);
  if(existing!==-1){
    sheet.getRange(existing+2,3,1,2).setValues([[stars,now]]);
    return {ok:true,updated:true};
  }
  if(recentCount_(rows,hash,1,3,now)>=APP.maxRatingsPerDevicePerDay)
    return {ok:false,error:"Daily rating limit reached"};
  sheet.appendRow([b.questionId,hash,stars,now]);
  return {ok:true};
}

function readStats_(){
  const cache=CacheService.getScriptCache(),cacheKey="ebc_stats_v1";
  const existing=cache.get(cacheKey);
  if(existing)return JSON.parse(existing);
  const book=getBook_();
  const games=rows_(book.getSheetByName(APP.sheets.games));
  const ratings=rows_(book.getSheetByName(APP.sheets.ratings));
  const complete=games.filter(r=>Number(r[3])>0&&Number(r[2])>=0&&Number(r[2])<=Number(r[3]));
  const avg=complete.length?complete.reduce((n,r)=>n+100*Number(r[2])/Number(r[3]),0)/complete.length:null;
  const bucket={};
  ratings.forEach(r=>{
    const id=String(r[0]),stars=Number(r[2]);
    if(!APP.question.test(id)||!Number.isInteger(stars)||stars<1||stars>5)return;
    if(!bucket[id])bucket[id]={votes:0,sum:0};
    bucket[id].votes++;bucket[id].sum+=stars;
  });
  const questionRatings={};
  Object.keys(bucket).forEach(id=>{
    questionRatings[id]={votes:bucket[id].votes,mean:Math.round(bucket[id].sum/bucket[id].votes*100)/100};
  });
  const stats={
    totalGames:complete.length,
    averageAccuracy:avg===null?null:Math.round(avg*10)/10,
    questionRatings:questionRatings,
    updated:new Date().toISOString(),
    note:"Based on voluntarily submitted completed games; scores are for friendly recreation."
  };
  cache.put(cacheKey,JSON.stringify(stats),50);
  return stats;
}
