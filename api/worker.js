/**
 * Washington Legacy Tour trivia API for Cloudflare Workers + D1.
 * Deploy separately from GitHub Pages; see api/README.md.
 * No names, emails, or raw IP addresses are stored.
 */
const SITE="https://ebcnewington.github.io";
const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
function respond(data,status=200,origin=""){const h={...JSON_HEADERS};if(origin===SITE){h["Access-Control-Allow-Origin"]=SITE;h["Vary"]="Origin"}return new Response(JSON.stringify(data),{status,headers:h})}
async function digest(secret, input){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(input));
 return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function rateCheck(req,env,kind){
 if(!env.RATE_HASH_SECRET)throw Error("Missing RATE_HASH_SECRET secret");
 const ip=req.headers.get("CF-Connecting-IP")||"unavailable";
 const bucket=new Date().toISOString().slice(0,13);
 const key=await digest(env.RATE_HASH_SECRET,kind+"|"+bucket+"|"+ip);
 const row=await env.DB.prepare("SELECT count FROM rate_limits WHERE bucket_hash=?").bind(key).first();
 const limit=kind==="rating"?45:12;
 if(row&&row.count>=limit)return false;
 await env.DB.prepare("INSERT INTO rate_limits(bucket_hash,count,expires_at) VALUES (?,1,datetime('now','+3 hours')) ON CONFLICT(bucket_hash) DO UPDATE SET count=count+1").bind(key).run();
 return true;
}
async function stats(env){
 const [games,ratings]=await Promise.all([
  env.DB.prepare("SELECT COUNT(*) AS games,COALESCE(SUM(correct),0) AS correct,COALESCE(SUM(answered),0) AS answered,ROUND(AVG(CAST(correct AS REAL)/NULLIF(answered,0))*100,1) AS averageAccuracy FROM games WHERE answered>0").first(),
  env.DB.prepare("SELECT question_id AS id, COUNT(*) AS votes,ROUND(AVG(stars),2) AS mean FROM ratings GROUP BY question_id").all()
 ]);
 const questionRatings={};for(const x of ratings.results||[])questionRatings[x.id]={votes:x.votes,mean:x.mean};
 return {totalGames:games?.games||0,averageAccuracy:games?.games?games.averageAccuracy:null,questionRatings,updated:new Date().toISOString(),note:"Based on completed, submitted games; optional participation. Anonymous-device ratings may be updated."};
}
async function readBody(req){
 const length=Number(req.headers.get("content-length")||0);
 if(length>2048)throw Error("Request is too large");
 const text=await req.text();if(text.length>2048)throw Error("Request is too large");
 return JSON.parse(text||"{}");
}
function validId(id){return typeof id==="string"&&/^dc-\d{3}$/.test(id)}
function validUuid(id){return typeof id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)}
async function rating(req,env,origin){
 const b=await readBody(req);
 if(!validId(b.questionId)||!validUuid(b.deviceToken)||!Number.isInteger(b.stars)||b.stars<1||b.stars>5)
   return respond({error:"Invalid rating"},400,origin);
 if(!await rateCheck(req,env,"rating"))return respond({error:"Too many ratings; please try again later"},429,origin);
 const key=await digest(env.RATE_HASH_SECRET,"visitor|"+b.deviceToken);
 await env.DB.prepare("INSERT INTO ratings(question_id,visitor_hash,stars) VALUES(?,?,?) ON CONFLICT(question_id,visitor_hash) DO UPDATE SET stars=excluded.stars,updated_at=CURRENT_TIMESTAMP")
  .bind(b.questionId,key,b.stars).run();
 return respond({ok:true},200,origin);
}
async function score(req,env,origin){
 const b=await readBody(req);
 if(!validUuid(b.sessionId)||!validUuid(b.deviceToken)||!Number.isInteger(b.answered)||!Number.isInteger(b.correct)||b.answered<1||b.answered>120||b.correct<0||b.correct>b.answered)
   return respond({error:"Invalid game submission"},400,origin);
 if(!await rateCheck(req,env,"score"))return respond({error:"Too many submissions; please try again later"},429,origin);
 const device=await digest(env.RATE_HASH_SECRET,"visitor|"+b.deviceToken);
 await env.DB.prepare("INSERT INTO games(session_id,visitor_hash,correct,answered) VALUES(?,?,?,?) ON CONFLICT(session_id) DO NOTHING")
  .bind(b.sessionId,device,b.correct,b.answered).run();
 return respond({ok:true},200,origin);
}
export default{
 async fetch(req,env){
  const origin=req.headers.get("Origin")||"";
  if(req.method==="OPTIONS"){if(origin!==SITE)return respond({error:"Not allowed"},403);
    return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600","Vary":"Origin"}})}
  if(req.method==="POST"&&origin!==SITE)return respond({error:"Not allowed"},403);
  if(!env.DB)return respond({error:"Database not configured"},503,origin);
  try{
   const path=new URL(req.url).pathname;
   if(req.method==="GET"&&path==="/health")return respond({ok:true,service:"legacy-trivia-api"},200,origin);
   if(req.method==="GET"&&path==="/v1/stats")return respond(await stats(env),200,origin);
   if(req.method==="POST"&&path==="/v1/rating")return await rating(req,env,origin);
   if(req.method==="POST"&&path==="/v1/score")return await score(req,env,origin);
   return respond({error:"Not found"},404,origin);
  }catch(ex){console.error(ex);if(ex instanceof SyntaxError)return respond({error:"Invalid JSON"},400,origin);if(ex.message?.includes("Request is too large"))return respond({error:"Request too large"},413,origin);return respond({error:"Service temporarily unavailable"},503,origin)}
 }
};
