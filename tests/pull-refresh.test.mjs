import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source=readFileSync(new URL("../pull-refresh.js",import.meta.url),"utf8");

function harness(){
 const handlers={};
 const tokens=new Set();
 const classes={
  add(...items){items.forEach(x=>tokens.add(x));},
  remove(...items){items.forEach(x=>tokens.delete(x));},
  toggle(item,yes){if(yes)tokens.add(item);else tokens.delete(item);},
  contains(item){return tokens.has(item);}
 };
 const indicator={
  classList:classes,
  attributes:{},
  style:{setProperty(){},removeProperty(){}},
  setAttribute(k,v){this.attributes[k]=v;},
  querySelector(){return label;},
  set innerHTML(v){this.html=v;}
 };
 const label={textContent:""};
 const body={};
 const doc={
  readyState:"complete",body,scrollingElement:{scrollTop:0},
  documentElement:{classList:{add(x){tokens.add(x);}}},
  createElement(){return indicator;},
  addEventListener(type,fn,options){handlers[type]=fn;},
  querySelector(){return null;}
 };
 body.appendChild=()=>{};
 let scrollY=0,calls=0,timeout=null;
 const window={
  ontouchstart:null,
  get scrollY(){return scrollY;},
  set scrollY(v){scrollY=v;},
  getComputedStyle(){return {overflowY:"visible"};},
  __ebcRefreshGuide:async()=>{calls++;return true;},
  setTimeout(fn){timeout=fn;return 1;},
  addEventListener(){},
 };
 const context={document:doc,window,console,clearTimeout(){}};
 vm.runInNewContext(source,context);
 function gesture({startX=30,startY=10,endX=startX,endY=startY,target={closest(){return null},parentElement:body},cancelable=true}){
  const start={clientX:startX,clientY:startY},end={clientX:endX,clientY:endY};
  handlers.touchstart({touches:[start],target});
  let prevented=false;
  handlers.touchmove({touches:[end],cancelable,preventDefault(){prevented=true;}});
  handlers.touchend();
  return {prevented};
 }
 return {gesture,window,handlers,indicator,label,classes,get calls(){return calls;},finish(){timeout?.();}};
}
test("a deliberate vertical pull at the page top refreshes once",async()=>{
 const h=harness();
 const g=h.gesture({endY:125});
 assert.equal(g.prevented,true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls,1);
 assert.equal(h.label.textContent,"Guide is up to date");
 h.finish();
 assert.equal(h.indicator.attributes["aria-hidden"],"true");
});
test("short pulls and horizontal swipes do not refresh",async()=>{
 const h=harness();
 h.gesture({endY:52});
 h.gesture({endY:40,endX:120});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls,0);
});
test("scrolling the page or touching controls never starts a refresh",async()=>{
 const h=harness();
 h.window.scrollY=35;
 h.gesture({endY:135});
 h.window.scrollY=0;
 h.gesture({endY:135,target:{closest(){return {}},parentElement:{}}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls,0);
});
test("a multi-touch gesture and upward swipe never refresh",async()=>{
 const h=harness();
 const target={closest(){return null},parentElement:{}};
 h.handlers.touchstart({touches:[{clientX:0,clientY:0},{clientX:1,clientY:1}],target});
 h.handlers.touchmove({touches:[{clientX:0,clientY:130},{clientX:1,clientY:131}],cancelable:true,preventDefault(){}});
 h.handlers.touchend();
 h.gesture({startY:115,endY:5});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls,0);
});

test("the indicator uses an axis-aligned SVG, not a font glyph",()=>{
 const h=harness();
 assert.match(h.indicator.html,/class="pull-refresh-svg"/);
 assert.match(h.indicator.html,/cx="16" cy="16" r="12"/);
 assert.doesNotMatch(h.indicator.html,/[↻]/);
});
test("photo headers and refresh status maintain positive stacking and fixed centered layout",()=>{
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(css,/\.place-photo\{[^}]*z-index:0\}/);
 assert.match(css,/\.place-card-cover:after\{[^}]*z-index:1;/);
 assert.match(css,/\.place-photo-credit\{[^}]*z-index:2;/);
 assert.match(css,/\.pull-refresh-indicator\{[^}]*width:194px;height:82px/);
 assert.match(css,/\.pull-refresh-svg\{[^}]*width:34px;height:34px/);
});
