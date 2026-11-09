import assert from "node:assert/strict";
import worker from "./worker.js";
const env={DB:{}};
function get(url,origin="https://ebcnewington.github.io"){return new Request(url,{headers:{Origin:origin}})}
function post(path,origin){return new Request("https://example.workers.dev"+path,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:"{}"})}
const health=await worker.fetch(get("https://example.workers.dev/health"),env);
assert.equal(health.status,200);
assert.equal((await health.json()).service,"legacy-trivia-api");
assert.equal(health.headers.get("Access-Control-Allow-Origin"),"https://ebcnewington.github.io");
const forbidden=await worker.fetch(post("/v1/score","https://malicious.invalid"),env);
assert.equal(forbidden.status,403);
const options=await worker.fetch(new Request("https://example.workers.dev/v1/score",{method:"OPTIONS",headers:{Origin:"https://ebcnewington.github.io"}}),env);
assert.equal(options.status,204);
const invalid=await worker.fetch(get("https://example.workers.dev/missing"),env);
assert.equal(invalid.status,404);
const noDatabase=await worker.fetch(get("https://example.workers.dev/health"),{});
assert.equal(noDatabase.status,503);
console.log("Worker smoke tests passed: health, CORS, preflight, not found and missing database.");
