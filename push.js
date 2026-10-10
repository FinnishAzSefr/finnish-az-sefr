/* Finnish az Sefr: consent-based Web Push using OneSignal Web SDK v16.
   Public SDK App ID only. NEVER put OneSignal REST API keys in this site. */
(function(){
  'use strict';
  const KEY='finnish-push-enabled-v12';
  const cfg=window.FINNISH_PUSH_CONFIG||{};
  const configured=()=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cfg.appId||'');
  let sdk=null, loading=null, busy=false;
  const saved=()=>{try{return localStorage.getItem(KEY)==='yes'}catch{return false}};
  const store=(on)=>{try{if(on)localStorage.setItem(KEY,'yes');else localStorage.removeItem(KEY)}catch{}};
  const notify=()=>window.dispatchEvent(new Event('finnish-push-status'));
  function isIos(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}
  function standalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function supported(){return window.isSecureContext&&'serviceWorker'in navigator&&'Notification'in window&&'PushManager'in window}
  async function load(){
    if(sdk)return sdk;
    if(loading)return loading;
    if(!configured())throw Error('شناسه OneSignal هنوز تنظیم نشده است.');
    if(!supported())throw Error('این مرورگر از اعلان پشتیبانی نمی‌کند.');
    if(isIos()&&!standalone())throw Error('در آیفون، اول اپ را با Safari به صفحه اصلی اضافه کن و از آیکون اپ باز کن.');
    loading=new Promise((resolve,reject)=>{
      let done=false;
      const timer=setTimeout(()=>{if(!done){done=true;reject(Error('اتصال به سرویس اعلان برقرار نشد.'))}},18000);
      window.OneSignalDeferred=window.OneSignalDeferred||[];
      window.OneSignalDeferred.push(async function(OneSignal){
        try{
          OneSignal.setConsentRequired(true);
          if(saved()) OneSignal.setConsentGiven(true);
          await OneSignal.init({
            appId:cfg.appId,
            allowLocalhostAsSecureOrigin:false,
            serviceWorkerPath:'/finnish-az-sefr/OneSignalSDKWorker.js',
            serviceWorkerParam:{scope:'/finnish-az-sefr/push/'},
            notifyButton:{enable:false},
            welcomeNotification:{disable:true}
          });
          if(done)return;
          sdk=OneSignal;done=true;clearTimeout(timer);resolve(sdk);
        }catch(e){if(!done){done=true;clearTimeout(timer);reject(e)}}
      });
      if(!document.querySelector('script[data-onesignal-sdk]')){
        const script=document.createElement('script');
        script.dataset.onesignalSdk='1';
        script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.async=true;
        script.onerror=()=>{if(!done){done=true;clearTimeout(timer);reject(Error('دریافت کتابخانه اعلان ممکن نشد.'))}};
        document.head.appendChild(script);
      }
    }).catch(e=>{loading=null;throw e});
    return loading;
  }
  async function enable(){
    if(busy)return;
    busy=true;notify();
    try{
      const OneSignal=await load();
      if(!OneSignal.Notifications.isPushSupported())throw Error('این گوشی یا مرورگر از Push پشتیبانی نمی‌کند.');
      if(Notification.permission==='denied')throw Error('اجازه اعلان قبلاً رد شده؛ از تنظیمات گوشی آن را فعال کن.');
      OneSignal.setConsentGiven(true);
      const permitted=await OneSignal.Notifications.requestPermission();
      if(permitted===false||Notification.permission!=='granted')throw Error('برای دریافت یادآوری، اجازه اعلان را تأیید کن.');
      await OneSignal.User.PushSubscription.optIn();
      if(!OneSignal.User.PushSubscription.optedIn)throw Error('اشتراک اعلان ثبت نشد. دوباره امتحان کن.');
      store(true);
    }catch(e){
      // No consent was recorded; keep the switch off.
      store(false);
      if(sdk) sdk.setConsentGiven(false);
      throw e;
    }finally{busy=false;notify()}
  }
  async function disable(){
    if(busy)return;
    busy=true;notify();
    try{
      const OneSignal=await load();
      await OneSignal.User.PushSubscription.optOut();
      store(false);
      OneSignal.setConsentGiven(false);
    }finally{busy=false;notify()}
  }
  window.FINNISH_PUSH={configured,isEnabled:saved,isBusy:()=>busy,enable,disable};
  // Preload SDK with consent gated. This improves iOS permission prompts on a real tap.
  // No permission prompt is shown and no subscription is created automatically.
  if(configured()&&supported()&&(!isIos()||standalone())){
    window.addEventListener('load',()=>load().catch(e=>console.warn('Push init:',e.message)),{once:true});
  }
})();
