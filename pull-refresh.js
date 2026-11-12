/* Native-feeling pull to refresh for the Legacy Tour mobile guide.
 * Runs only after a one-finger downward gesture begins at the top of the page.
 * Never intercepts a horizontal swipe, nested scroller, or active control.
 */
(() => {
  "use strict";
  const THRESHOLD=82;
  const MAX_PULL=116;
  const DISMISS_DELAY=1150;
  const passive={passive:true};
  const activeTouch={passive:false};
  const doc=document;
  let startX=0,startY=0,tracking=false,pulling=false,blocked=false,busy=false,drag=0,hideTimer=null;
  let indicator=null,label=null;

  function atTop(){
    return window.scrollY<=2 && (doc.scrollingElement?.scrollTop||0)<=2;
  }
  function ignoreTarget(target){
    if(!target||typeof target.closest!=="function")return true;
    if(target.closest("a,button,input,textarea,select,summary,details,dialog,[contenteditable], [role='button'],[role='slider'],[role='tab'],.trivia-game"))return true;
    for(let node=target;node&&node!==doc.body;node=node.parentElement){
      if(node.scrollHeight>node.clientHeight+3){
        const style=window.getComputedStyle(node);
        if(/auto|scroll/.test(style.overflowY))return true;
      }
    }
    return false;
  }
  function reset(){
    tracking=false;pulling=false;blocked=false;drag=0;
    if(indicator&&!busy){
      indicator.classList.remove("is-pulling","is-ready","is-complete","is-error");
      indicator.style.removeProperty("--pull-shift");
      indicator.setAttribute("aria-hidden","true");
    }
  }
  function onStart(event){
    if(busy||!atTop()||event.touches.length!==1||doc.querySelector("dialog[open]")||ignoreTarget(event.target)){
      reset();return;
    }
    if(hideTimer!==null){clearTimeout(hideTimer);hideTimer=null;}
    tracking=true;pulling=false;blocked=false;drag=0;
    startX=event.touches[0].clientX;startY=event.touches[0].clientY;
  }
  function onMove(event){
    if(!tracking)return;
    if(event.touches.length!==1){reset();return;}
    const dx=event.touches[0].clientX-startX;
    const dy=event.touches[0].clientY-startY;
    if(!pulling){
      if(dy<0||Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){blocked=true;tracking=false;return;}
      if(dy<9||dy<Math.abs(dx)*1.35)return;
      pulling=true;
    }
    if(!atTop()){reset();return;}
    if(event.cancelable)event.preventDefault();
    drag=Math.min(MAX_PULL,Math.max(0,dy));
    indicator.classList.add("is-pulling");
    indicator.classList.toggle("is-ready",drag>=THRESHOLD);
    indicator.setAttribute("aria-hidden","false");
    indicator.style.setProperty("--pull-shift",Math.round(Math.min(114,drag*1.1))+"px");
    label.textContent=drag>=THRESHOLD?"Release to refresh":"Pull to refresh";
  }
  async function runRefresh(){
    if(busy)return;
    busy=true;
    indicator.classList.remove("is-pulling","is-ready","is-complete","is-error");
    indicator.classList.add("is-refreshing");
    indicator.style.removeProperty("--pull-shift");
    label.textContent="Refreshing guide…";
    indicator.setAttribute("aria-hidden","false");
    let ok=false;
    try{
      if(typeof window.__ebcRefreshGuide!=="function")throw Error("Guide refresh is not ready");
      ok=await window.__ebcRefreshGuide();
    }catch(error){
      console.warn("Pull to refresh was unavailable",error);
    }
    indicator.classList.remove("is-refreshing");
    indicator.classList.add("is-complete");
    indicator.classList.toggle("is-error",!ok);
    label.textContent=ok?"Guide is up to date":"Couldn’t refresh — try again";
    hideTimer=window.setTimeout(()=>{
      busy=false;hideTimer=null;reset();
    },DISMISS_DELAY);
  }
  function onEnd(){
    if(!tracking)return;
    const shouldRefresh=pulling&&drag>=THRESHOLD;
    tracking=false;pulling=false;drag=0;
    if(shouldRefresh)void runRefresh();
    else reset();
  }
  function init(){
    if(!("ontouchstart" in window)||!doc.body)return;
    indicator=doc.createElement("div");
    indicator.id="pull-refresh-indicator";
    indicator.className="pull-refresh-indicator";
    indicator.setAttribute("role","status");
    indicator.setAttribute("aria-live","polite");
    indicator.setAttribute("aria-hidden","true");
    indicator.innerHTML='<span class="pull-refresh-symbol" aria-hidden="true"><svg class="pull-refresh-svg" viewBox="0 0 32 32" focusable="false"><circle class="pull-refresh-track" cx="16" cy="16" r="12"/><path class="pull-refresh-arrow" d="M16 8v16m-5-5 5 5 5-5"/><circle class="pull-refresh-spinner" cx="16" cy="16" r="12"/><path class="pull-refresh-check" d="m10.5 16 3.5 3.5 7-7"/></svg></span><span class="pull-refresh-label">Pull to refresh</span>';
    doc.body.appendChild(indicator);
    label=indicator.querySelector(".pull-refresh-label");
    doc.documentElement.classList.add("pull-refresh-enabled");
    doc.addEventListener("touchstart",onStart,passive);
    doc.addEventListener("touchmove",onMove,activeTouch);
    doc.addEventListener("touchend",onEnd,passive);
    doc.addEventListener("touchcancel",reset,passive);
    window.addEventListener("pagehide",reset);
  }
  if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
