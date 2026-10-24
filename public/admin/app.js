(async function () {
  const status = document.getElementById('status');
  let pendingLogin=null;
  try {
    const raw=sessionStorage.getItem('wf-cms-login');
    sessionStorage.removeItem('wf-cms-login');
    if(raw){const data=JSON.parse(raw);if(typeof data.token==='string'&&data.token&&data.provider==='github'&&Number.isFinite(data.expires)&&data.expires>Date.now()&&data.expires<=Date.now()+60000)pendingLogin={token:data.token,provider:'github'};}
  } catch { /* A new login can be started if temporary browser storage is unavailable. */ }

  try {
    const response = await fetch('/admin/settings.json', {cache:'no-store'});
    if (!response.ok) throw new Error('管理設定を取得できませんでした。');
    const settings = await response.json();
    const local = settings.local === true && ['localhost','127.0.0.1'].includes(location.hostname);
    if (!local && (!settings.repo || !settings.origin)) {
      status.textContent = '公開用のアカウント連携が未設定です。制作担当者がGitHubとCloudflareの設定を完了すると、ここからログインして更新できます。';
      return;
    }
    if (!local && settings.origin !== location.origin) {
      const a = document.createElement('a');a.href=settings.origin+'/admin/';a.textContent='正規の管理画面を開く';
      status.textContent='管理画面は次のURLから利用してください。 ';status.append(a);return;
    }
    const siteResponse=await fetch('/admin/site-schema.json',{cache:'no-store'});
    if(!siteResponse.ok)throw new Error('HP全体の編集設定を取得できませんでした。');
    const siteSchema=await siteResponse.json();
    const fields = [
      {name:'title',label:'タイトル',widget:'string',hint:'HPに表示する見出しです。'},
      {name:'section',label:'掲載場所',widget:'select',options:[{label:'新着',value:'new'},{label:'掲載記事',value:'press'}],default:'new'},
      {name:'date',label:'掲載日',widget:'datetime',date_format:'YYYY/MM/DD',time_format:false,format:'YYYY-MM-DD',required:false},
      {name:'date_label',label:'日付の表示を指定する場合',widget:'string',required:false,hint:'通常は空欄。「2026年 実施予定」などと表示したいときに入力。'},
      {name:'source',label:'主催者・掲載メディア名',widget:'string',default:'WorldFut',required:false},
      {name:'summary',label:'短い紹介文',widget:'text',required:false,hint:'トップページのカードに表示されます。'},
      {name:'body',label:'本文',widget:'text',required:false,hint:'入力すると詳細ページを自動作成します。改行が使えます。HTMLやMarkdownを書く必要はありません。'},
      {name:'image',label:'写真',widget:'image',required:false,allow_multiple:false,media_library:{config:{max_file_size:5000000}},hint:'JPEG・PNG・WebP・GIF。5MB以下、横幅1600px程度を推奨。'},
      {name:'image_alt',label:'写真の説明',widget:'string',required:false,hint:'写真の内容を短く説明してください。'},
      {name:'link',label:'関連リンク・申込先URL',widget:'string',required:false,pattern:['^$|^https://[^\\s]+$','https:// から始まるURLを入力してください。']},
      {name:'link_label',label:'リンクのボタン名',widget:'string',required:false,hint:'例：参加を申し込む。空欄でも自動で表示します。'},
      {name:'featured',label:'NEWを付けて強調する',widget:'boolean',default:false},
      {name:'order',label:'表示優先度',widget:'number',value_type:'int',default:0,hint:'数字が大きい記事を先に表示します。同じ数字では掲載日の新しい順です。'},
      {name:'published',label:'HPに掲載する',widget:'boolean',default:false,hint:'オンにして公開するとHPに表示されます。オフの記事もGitHubには保存されるので、個人情報は入力しないでください。'}
    ];
    if(!local){
      const GithubBackend=CMS.getBackend('github').BackendClass;
      let handingOff=false;
      function Login(props){
        if(pendingLogin&&!handingOff){handingOff=true;const credentials=pendingLogin;pendingLogin=null;setTimeout(()=>props.onLogin(credentials),0);}
        const h=window.h;
        return h('div',{style:{maxWidth:440,margin:'12vh auto',padding:28,textAlign:'center',lineHeight:1.8}},
          h('img',{src:'/assets/logo.png',alt:'WorldFut',style:{width:140,maxWidth:'100%'}}),
          h('h1',{style:{fontSize:24}},'WorldFut 更新管理'),
          h('p',{},'WorldFutの更新権限があるGitHubアカウントでログインしてください。'),
          props.error?h('p',{role:'alert'},String(props.error)):null,
          h('button',{type:'button',disabled:!!props.inProgress,onClick:()=>location.assign(settings.origin+'/api/auth?flow=redirect'),style:{background:'#12395a',color:'white',border:0,borderRadius:8,padding:'14px 24px',fontSize:16,cursor:'pointer'}},props.inProgress?'ログインを確認しています…':'GitHubでログインする'),
          h('p',{},h('a',{href:settings.origin+'/'},'サイトに戻る')));
      }
      CMS.registerBackend('worldfut-github',class extends GithubBackend{authComponent(){return Login;}});
    }
    const config = {
      backend:{name:local?'github':'worldfut-github',repo:settings.repo || 'local/worldfut',branch:settings.branch,base_url:settings.origin || location.origin,auth_endpoint:'api/auth'},
      load_config_file:false,locale:'ja',media_folder:'public/uploads',public_folder:'/uploads',
      site_url:local?location.origin:settings.origin,display_url:local?location.origin:settings.origin,
      logo_url:'/assets/logo.png',
      slug:{encoding:'unicode',clean_accents:false,sanitize_replacement:'-'},
      collections:[{name:'site',label:'HP全体・新規セクション',files:[{name:'settings',label:'全体設定・文字・セクション追加',file:'content/pages/settings.json',fields:siteSchema.globalFields,editor:{preview:false}}]},{name:'pages',label:'既存HPの各項目',files:siteSchema.sections.map(e=>({...e,editor:{preview:false}}))},{name:'news',label:'お知らせ・掲載記事',label_singular:'記事',folder:'content/news',create:true,delete:true,extension:'json',format:'json',slug:'{{year}}-{{month}}-{{day}}-{{slug}}',identifier_field:'title',summary:'{{title}}',editor:{preview:window.innerWidth>=900},sortable_fields:['date','title','order'],view_filters:[{label:'新着',field:'section',pattern:'new'},{label:'掲載記事',field:'section',pattern:'press'},{label:'HPに掲載しない記事',field:'published',pattern:false}],fields}]
    };
    if (local) config.local_backend={url:'http://localhost:8081/api/v1',allowed_hosts:['localhost','127.0.0.1']};
    const banner=document.createElement('div');banner.id='environment';
    banner.textContent=local?'ローカル確認用：保存はこのパソコン内だけに反映されます。本番サイトは変わりません。':'確認用サイトの編集：保存内容は worldfut-hp.pages.dev に反映されます。本番 worldfut.jp は変わりません。';document.body.append(banner);
    CMS.registerPreviewStyle('body{font-family:system-ui,sans-serif;color:#1a2332;line-height:1.9;padding:24px}h1{line-height:1.5}img{max-width:100%;border-radius:8px}.body{white-space:pre-wrap}.meta{color:#6b7280}',{raw:true});
    CMS.registerPreviewTemplate('news',function(props){
      const e=props.entry.get('data').toJS();const h=window.h;
      const img=e.image?props.getAsset(e.image):null;
      return h('article',{},h('p',{className:'meta'},e.published?'HPに掲載する記事':'HPには掲載しない記事'),h('p',{className:'meta'},(e.source||'')+' '+(e.date_label||e.date||'')),h('h1',{},e.title||'タイトル'),img?h('img',{src:img.toString(),alt:e.image_alt||e.title}):null,h('p',{},e.summary||''),h('div',{className:'body'},e.body||''),e.link?h('p',{},(e.link_label||'関連リンク')+'：'+e.link):null);
    });
    document.getElementById('setup').remove();
    await CMS.init({config});
  } catch (error) { status.textContent='管理画面を開けませんでした。制作担当者へ連絡してください。 '+error.message; }
})();
