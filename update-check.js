/* Legacy Tour: update installed and bookmarked guides without clearing browser data. */
(() => {
  "use strict";
  const current=document.querySelector('meta[name="ebc-build-id"]')?.content||"";
  if(!current||current.startsWith("__"))return;
  let checking=false,reloading=false;
  async function checkForRelease(){
    if(checking||reloading||document.visibilityState==="hidden"||navigator.onLine===false)return;
    checking=true;
    try{
      const url=new URL("data/site-version.json",document.baseURI);
      url.searchParams.set("_",String(Date.now()));
      const response=await fetch(url.href,{cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      const next=String(data.id||"");
      if(!/^[a-zA-Z0-9_-]{1,120}$/.test(next)||next===current)return;
      const guard="ebc-reload-attempt-"+next;
      try{
        if(sessionStorage.getItem(guard)==="done")return;
        sessionStorage.setItem(guard,"done");
      }catch(e){/* Private browsing may restrict session storage. */}
      reloading=true;
      try{
        const reg=await navigator.serviceWorker?.getRegistration();
        if(reg)await reg.update();
      }catch(e){/* Continue even if SW update cannot be checked. */}
      const target=new URL(window.location.href);
      target.searchParams.set("guide-version",next);
      window.location.replace(target.href);
    }catch(e){
      /* Stay on the current guide if offline or a transient network error occurs. */
    }finally{checking=false}
  }
  window.addEventListener("pageshow",checkForRelease);
  window.addEventListener("focus",checkForRelease);
  window.addEventListener("online",checkForRelease);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkForRelease()});
  navigator.serviceWorker?.addEventListener("controllerchange",checkForRelease);
  window.setInterval(checkForRelease,90000);
  checkForRelease();
})();
