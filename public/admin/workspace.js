import {renderWorkspacePreview} from './preview.js';
const $=id=>document.getElementById(id),editor=$('editor'),preview=$('preview');
const labels={top:['トップ','最初のメッセージ・写真'],about:['団体概要','理念・団体紹介'],activities:['活動内容','支援活動・沿革'],media:['お知らせ','見出し・タブの名前'],join:['募集案内','参加方法・募集カード'],contact:['お問い合わせ','連絡先・フォーム'],navigation:['メニュー','上部のナビゲーション'],footer:['フッター','ページ下部の情報'],sections:['新規セクションを追加','文章・写真・カードを作る'],settings:['全体・デザイン設定','文字・既存セクションの順番'],news:['お知らせ・掲載記事','記事を追加・編集']};
let previewTarget='',lastExtraCount=-1,previewCandidate=null;
let payload,current='top',device='desktop',settings,dirty=false,newsEntry=null;
const savedEntries=new Map();
const route=key=>key==='sections'?'#/collections/sections/entries/builder':key==='settings'?'#/collections/site/entries/settings':key==='news'?'#/collections/news':'#/collections/pages/entries/'+key;
function keyFromHash(hash){if(hash.includes('/collections/sections'))return 'sections';if(hash.includes('/collections/news'))return 'news';if(hash.includes('/collections/site'))return 'settings';return Object.keys(labels).find(k=>hash.endsWith('/entries/'+k))||'top';}
function navigation(){
 const order=(payload.global.section_order||[]).map(e=>e.section);
 const items=[...order,'sections','news','navigation','footer','settings'];
 $('sections').replaceChildren();
 items.forEach((key,i)=>{
  if(!labels[key])return;
  if(key==='news'){const label=document.createElement('div');label.className='nav-divider';label.textContent='記事・共通設定';$('sections').append(label);}
  const a=document.createElement('a');a.href=route(key);a.dataset.section=key;
  if(key===current)a.setAttribute('aria-current','page');
  const n=document.createElement('span');n.className='number';n.textContent=i<6?String(i+1).padStart(2,'0'):'＋';
  const title=document.createElement('span');title.className='nav-label';title.textContent=labels[key][0];const sub=document.createElement('small');sub.textContent=labels[key][1];title.append(sub);a.append(n,title);
  a.addEventListener('click',event=>{event.preventDefault();if(dirty&&!confirm('保存していない変更があります。保存せずに移動しますか？'))return;select(key);location.hash=route(key);editor.src='/admin/editor.html'+route(key);render();});
  $('sections').append(a);
 });
}
function select(key){if(key!=='sections')previewCandidate=null;current=key;$('editing-title').textContent=labels[key]?.[0]||'編集';$('editing-help').textContent=key==='sections'?'① 表示する場所を選ぶ → ② デザインを比較 → ③ 内容を編集して保存。':key==='settings'?'HP全体の文字と既存セクションの順番を設定します。':key==='news'?'記事を選ぶか、新しい記事を作成してください。':'文章や画像を変更し、右側で見え方を確認してください。';navigation();}

function updateSectionPicker(){
 const extras=[...(payload.global.extra_sections||[]),...(previewCandidate?[previewCandidate]:[])];
 const bar=$('section-preview-controls');bar.hidden=current!=='sections';
 const picker=$('section-preview-target');
 if(extras.length>lastExtraCount&&lastExtraCount>=0){const i=extras.length-1;previewTarget=extras[i].anchor||'extra-'+i;}
 lastExtraCount=extras.length;
 picker.replaceChildren();
 extras.forEach((e,i)=>{const option=document.createElement('option');option.value=e.anchor||'extra-'+i;option.textContent=(i+1)+'. '+(e.title||'新しいセクション')+(e.published?'':'（非公開）');picker.append(option);});
 if(!extras.some((e,i)=>(e.anchor||'extra-'+i)===previewTarget))previewTarget=extras[0]?.anchor||(extras.length?'extra-0':'');
 picker.value=previewTarget;picker.disabled=!extras.length;
}
$('section-preview-target').addEventListener('change',event=>{previewTarget=event.target.value;render();});


function render(){try{updateSectionPicker();const view=previewCandidate?{...payload,global:{...payload.global,extra_sections:[...(payload.global.extra_sections||[]),previewCandidate]}}:payload;preview.srcdoc=renderWorkspacePreview(view,current,newsEntry);$('preview-note').textContent=current==='sections'?'追加したセクションを保存前に表示中です。「HPに表示する」がオフの項目も、この画面では確認できます。':'保存前の見え方です。「公開」→「公開する」で確認用HPへ保存します。';}catch(error){$('preview-note').textContent='プレビューを作れませんでした。入力内容をご確認ください：'+error.message;}}
function resize(){const box=$('preview-device');const width=device==='mobile'?375:1280;box.style.maxWidth=device==='mobile'?'375px':'';const scale=Math.min(1,box.clientWidth/width);preview.style.width=width+'px';preview.style.height=Math.max(600,box.clientHeight/scale)+'px';preview.style.transform=`scale(${scale})`;}
preview.addEventListener('load',()=>{resize();try{const doc=preview.contentDocument;doc.addEventListener('click',e=>{e.preventDefault();const button=e.target.closest('.tab-btn,.news-tab-btn');if(!button)return;const news=button.classList.contains('news-tab-btn');const buttons=Array.from(doc.querySelectorAll(news?'.news-tab-btn':'.tab-btn'));const ids=news?['new','press']:['cambodia','japan','history'];const selected=ids[buttons.indexOf(button)];buttons.forEach(b=>b.classList.toggle('active',b===button));doc.querySelectorAll(news?'.news-tab-content':'.tab-content').forEach(p=>p.classList.toggle('active',p.id===(news?'news-tab-':'tab-')+selected));});doc.addEventListener('submit',e=>e.preventDefault());const target=current==='sections'?doc.querySelector('[data-cms-section="'+(previewTarget||'extra-0')+'"]'):['settings','sections'].includes(current)?null:doc.querySelector(`[data-cms-section="${current==='news'?'media':current}"]`);if(target)doc.defaultView.scrollTo(0,target.offsetTop);}catch{}});
document.querySelectorAll('[data-device]').forEach(button=>button.addEventListener('click',()=>{device=button.dataset.device;document.querySelectorAll('[data-device]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));resize();}));
new ResizeObserver(resize).observe($('preview-device'));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==editor.contentWindow||!payload)return;
 const message=event.data;
 if(message?.type==='wf-section-candidate'&&message.data&&typeof message.data==='object'){previewCandidate={...message.data,anchor:'extra-candidate'};previewTarget='extra-candidate';render();return;}
 if(message?.type==='wf-section-candidate-clear'){previewCandidate=null;render();return;}
 if(message?.type==='wf-section-focus'&&typeof message.anchor==='string'&&/^extra-[a-z0-9-]+$/.test(message.anchor)){previewTarget=message.anchor;render();return;}
 if(message?.type==='wf-editor-status'){dirty=message.dirty;$('environment').textContent=message.text;return;}
 if(message?.type==='wf-editor-route'){if(dirty&&savedEntries.has(current)){if(['settings','sections'].includes(current))payload.global=structuredClone(savedEntries.get(current));else if(current!=='news')payload.docs[current]=structuredClone(savedEntries.get(current));}dirty=false;select(keyFromHash(message.hash));location.hash=message.hash;render();return;}
 if(message?.type==='wf-editor-saved'){savedEntries.set(current,structuredClone(['settings','sections'].includes(current)?payload.global:current==='news'?newsEntry:payload.docs[current]));dirty=false;return;}
 if(message?.type!=='wf-editor-change'||!message.data||typeof message.data!=='object')return;
 const key=message.collection==='sections'?'sections':message.collection==='site'?'settings':message.collection==='news'?'news':message.slug;
 if(!labels[key])return;
 if(!savedEntries.has(key))savedEntries.set(key,structuredClone(message.data));
 if(key==='settings'||key==='sections'){if(JSON.stringify(payload.global)===JSON.stringify(message.data))return;payload.global=message.data;}
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
