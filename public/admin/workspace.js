import {values,typography,extraSection,scaleDocument,renderDetail} from './preview-renderer.js';
const $=id=>document.getElementById(id),editor=$('editor'),preview=$('preview');
const labels={top:['トップ','最初のメッセージ・写真'],about:['団体概要','理念・団体紹介'],activities:['活動内容','支援活動・沿革'],media:['お知らせ','見出し・タブの名前'],join:['募集案内','参加方法・募集カード'],contact:['お問い合わせ','連絡先・フォーム'],navigation:['メニュー','上部のナビゲーション'],footer:['フッター','ページ下部の情報'],settings:['全体・デザイン設定','文字・表示順・セクション追加'],news:['お知らせ・掲載記事','記事を追加・編集']};
let payload,current='top',device='desktop',settings,dirty=false,newsEntry=null;
const savedEntries=new Map();
const route=key=>key==='settings'?'#/collections/site/entries/settings':key==='news'?'#/collections/news':'#/collections/pages/entries/'+key;
function keyFromHash(hash){if(hash.includes('/collections/news'))return 'news';if(hash.includes('/collections/site'))return 'settings';return Object.keys(labels).find(k=>hash.endsWith('/entries/'+k))||'top';}
function navigation(){
 const order=(payload.global.section_order||[]).map(e=>e.section);
 const items=[...order,'news','navigation','footer','settings'];
 $('sections').replaceChildren();
 items.forEach((key,i)=>{
  if(!labels[key])return;
  if(key==='news'){const label=document.createElement('div');label.className='nav-divider';label.textContent='記事・共通設定';$('sections').append(label);}
  const a=document.createElement('a');a.href=route(key);a.dataset.section=key;
  if(key===current)a.setAttribute('aria-current','page');
  const n=document.createElement('span');n.className='number';n.textContent=i<6?String(i+1).padStart(2,'0'):'＋';
  const title=document.createElement('span');title.className='nav-label';title.textContent=labels[key][0];const sub=document.createElement('small');sub.textContent=labels[key][1];title.append(sub);a.append(n,title);
  a.addEventListener('click',event=>{event.preventDefault();editor.contentWindow.location.hash=route(key);});
  $('sections').append(a);
 });
}
function select(key){current=key;$('editing-title').textContent=labels[key]?.[0]||'編集';$('editing-help').textContent=key==='settings'?'HP全体の文字・セクションの順番・追加項目をまとめて設定します。':key==='news'?'記事を選ぶか、新しい記事を作成してください。':'文章や画像を変更し、右側で見え方を確認してください。';navigation();}
function previewHtml(){
 if(current==='news'&&newsEntry)return renderDetail(newsEntry);
 const sections={},docs=payload.docs,global=payload.global;let css=typography(global.style);
 for(const e of payload.schema){sections[e.name]=values(payload.templates[e.name],docs[e.name],e.fields,e.groups);css+=typography(docs[e.name].style,`[data-cms-section="${e.name}"]`);}
 const extra=global.extra_sections||[];
 const chunks=global.section_order.map(({section})=>sections[section]+extra.map((e,i)=>e.published&&e.after===section?extraSection(e,i):'').join('')).join('\n');
 extra.forEach((e,i)=>{if(e.published)css+=typography(e.style,`[data-cms-section="${e.anchor||'extra-'+i}"]`);});
 // Only static layout is rendered. No site JavaScript, form submission or outgoing navigation.
 const html=payload.source.replace('class="op-lock"','').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/@@([A-Za-z0-9_]+)@@/g,(_,k)=>({PAGE:chunks,SECTION_navigation:sections.navigation,SECTION_footer:sections.footer}[k]||'')).replace('<!-- CMS_NEWS -->',()=>payload.news);
 const photo=String(docs.top.slides?.[0]?.image||'').replace(/["\\\n\r]/g,'');
 const gallery=(docs.about.gallery||[]).filter(e=>e.image).map(e=>'<img src="'+String(e.image).replaceAll('&','&amp;').replaceAll('"','&quot;')+'" alt="活動写真">').join('');
 return scaleDocument(html.replace('<div class="mq-track" id="mqTrack"></div>','<div class="mq-track" id="mqTrack">'+gallery+'</div>')).replace('</head>',()=>`<link rel="stylesheet" href="/site-extra.css"><style>${css}
 html{scroll-behavior:auto!important}body{overflow:auto!important}#opening{display:none!important}.reveal,.rv,.fade-in,[class*="reveal"]{opacity:1!important;transform:none!important;visibility:visible!important}.hero-content *{animation:none!important;opacity:1!important;transform:none!important}.slides-wrap{background:linear-gradient(#0005,#0005),url("${photo}") center/cover!important}a,button,input,textarea,select{pointer-events:none!important}.tab-btn,.news-tab-btn{pointer-events:auto!important}nav{position:relative!important}
 </style></head>`);
}
function render(){try{preview.srcdoc=previewHtml();$('preview-note').textContent='保存前の見え方です。「公開」→「今すぐ公開」で確認用HPへ保存します。';}catch(error){$('preview-note').textContent='プレビューを作れませんでした。入力内容をご確認ください：'+error.message;}}
function resize(){const box=$('preview-device');const width=device==='mobile'?375:1280;box.style.maxWidth=device==='mobile'?'375px':'';const scale=Math.min(1,box.clientWidth/width);preview.style.width=width+'px';preview.style.height=Math.max(600,box.clientHeight/scale)+'px';preview.style.transform=`scale(${scale})`;}
preview.addEventListener('load',()=>{resize();try{const doc=preview.contentDocument;doc.addEventListener('click',e=>{e.preventDefault();const button=e.target.closest('.tab-btn,.news-tab-btn');if(!button)return;const news=button.classList.contains('news-tab-btn');const buttons=Array.from(doc.querySelectorAll(news?'.news-tab-btn':'.tab-btn'));const ids=news?['new','press']:['cambodia','japan','history'];const selected=ids[buttons.indexOf(button)];buttons.forEach(b=>b.classList.toggle('active',b===button));doc.querySelectorAll(news?'.news-tab-content':'.tab-content').forEach(p=>p.classList.toggle('active',p.id===(news?'news-tab-':'tab-')+selected));});doc.addEventListener('submit',e=>e.preventDefault());const target=current==='settings'?null:doc.querySelector(`[data-cms-section="${current==='news'?'media':current}"]`);if(target)doc.defaultView.scrollTo(0,target.offsetTop);}catch{}});
document.querySelectorAll('[data-device]').forEach(button=>button.addEventListener('click',()=>{device=button.dataset.device;document.querySelectorAll('[data-device]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));resize();}));
new ResizeObserver(resize).observe($('preview-device'));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==editor.contentWindow||!payload)return;
 const message=event.data;
 if(message?.type==='wf-editor-status'){dirty=message.dirty;$('environment').textContent=message.text;return;}
 if(message?.type==='wf-editor-route'){if(dirty&&savedEntries.has(current)){if(current==='settings')payload.global=structuredClone(savedEntries.get(current));else if(current!=='news')payload.docs[current]=structuredClone(savedEntries.get(current));}dirty=false;select(keyFromHash(message.hash));location.hash=message.hash;render();return;}
 if(message?.type==='wf-editor-saved'){savedEntries.set(current,structuredClone(current==='settings'?payload.global:current==='news'?newsEntry:payload.docs[current]));dirty=false;return;}
 if(message?.type!=='wf-editor-change'||!message.data||typeof message.data!=='object')return;
 const key=message.collection==='site'?'settings':message.collection==='news'?'news':message.slug;
 if(!labels[key])return;
 if(!savedEntries.has(key))savedEntries.set(key,structuredClone(message.data));
 if(key==='settings'){if(JSON.stringify(payload.global)===JSON.stringify(message.data))return;payload.global=message.data;}
 else if(key==='news'){newsEntry=message.data;}
 else if(key!=='news'){if(JSON.stringify(payload.docs[key])===JSON.stringify(message.data))return;payload.docs[key]=message.data;}
 select(key);render();
});
try{
 const responses=await Promise.all([fetch('/admin/preview-data.json',{cache:'no-store'}),fetch('/admin/settings.json',{cache:'no-store'})]);
 if(responses.some(r=>!r.ok))throw new Error('編集設定を取得できませんでした。再読み込みしてください。');
 [payload,settings]=await Promise.all(responses.map(r=>r.json()));
 current=keyFromHash(location.hash);select(current);render();
 editor.src='/admin/editor.html'+(location.hash||route('top'));
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
}catch(error){$('editing-help').textContent=error.message;$('environment').textContent='管理画面を読み込めませんでした。ページを再読み込みしてください。';}
