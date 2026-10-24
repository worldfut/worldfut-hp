(function(){
  window.WorldFutPublication={start({settings,banner,CMS}){
    let serial=0,timer,debounce,lastHead=null,saveBaseline=null;const repo=settings.repo,branch=settings.branch;
    const api='https://api.github.com/repos/'+repo;
    function show(message,target){
      banner.replaceChildren(document.createTextNode(message));
      if(target){const a=document.createElement('a');a.href=settings.origin+'/?revision='+target;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' 最新HPを開く';a.style.color='#bde7ff';banner.append(a);}
    }
    async function json(url){const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('取得不可');return r.json();}
    async function begin(saved){
      const id=++serial;clearTimeout(timer);const start=Date.now();let target,lastCheck=-40;
      show(saved?'GitHubに保存済み。HPへの反映を確認しています…':'HPの公開状態を確認しています…');
      try{
        target=(await json(api+'/commits/'+encodeURIComponent(branch))).sha;
        if(saved&&target===saveBaseline){await new Promise(resolve=>setTimeout(resolve,1500));target=(await json(api+'/commits/'+encodeURIComponent(branch))).sha;}
        if(!/^[a-f0-9]{40}$/.test(target)||(saved&&target===saveBaseline))throw new Error();
        lastHead=target;
      }
      catch{if(id===serial)show('保存後のHPへの反映は未確認です。通常30〜90秒程度かかります。少し待ってHPを再読み込みしてください。');return;}
      async function poll(){
        if(id!==serial)return;
        const seconds=Math.floor((Date.now()-start)/1000);
        try{
          const state=await json('/publication.json');if(id!==serial)return;
          if(state.commit===target||(Array.isArray(state.ancestors)&&state.ancestors.includes(target))){
            show(saved?'HPへの反映が完了しました（確認まで約'+seconds+'秒）。確認用サイトだけに反映されます。':'最新の保存内容はHPに反映済みです。確認用サイトを編集中です。',target);return;
          }
          if(seconds>=40&&seconds-lastCheck>=30){
            lastCheck=seconds;
            try{const checks=await json(api+'/commits/'+target+'/check-runs');if(id!==serial)return;
              const cf=(checks.check_runs||[]).find(c=>c.name==='Cloudflare Pages');
              if(cf?.status==='completed'&&['failure','timed_out','cancelled','action_required','stale'].includes(cf.conclusion)){
                show('HPの公開処理に失敗しました。直前の正常なHPが表示されています。入力内容を確認するか、制作担当者に連絡してください。');return;
              }
            }catch{ /* Public API limits must not interrupt the CMS or imply a successful deploy. */ }
          }
        }catch{ /* Old deployments may not yet contain the publication marker. */ }
        if(id!==serial)return;
        if(seconds>=600){show('10分以内にHPへの反映を確認できませんでした。制作担当者に公開状態の確認を依頼してください。');return;}
        if(seconds>=180){show('保存済み・公開処理が通常より長引いています（経過'+seconds+'秒）。直前の正常なHPを表示し、確認を継続しています。');timer=setTimeout(poll,15000);return;}
        show('保存済み・HPへの反映待ち（経過'+seconds+'秒）。通常30〜90秒程度かかります。');
        timer=setTimeout(poll,5000);
      }
      await poll();
    }
    CMS.registerEventListener({name:'preSave',handler:()=>{saveBaseline=lastHead;}});
    for(const name of ['postSave','postPublish','postUnpublish'])CMS.registerEventListener({name,handler:()=>{clearTimeout(debounce);serial++;clearTimeout(timer);show('GitHubに保存済み。HPへの反映を確認しています…');debounce=setTimeout(()=>{void begin(true);},1000);}});
    void begin(false);
  }};
})();
