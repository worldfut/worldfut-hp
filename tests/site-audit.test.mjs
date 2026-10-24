import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,symlink,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {applySeo} from '../lib/seo.mjs';
import {renderSite,styleFields,globalFields} from '../lib/site.mjs';
const root=resolve(import.meta.dirname,'..');
function leaves(data,fields,path=[]){return fields.flatMap(f=>{
 const v=data[f.name],p=[...path,f.name];
 if(f.widget==='object')return leaves(v||{},f.fields,p);
 if(f.widget==='list')return (v||[]).flatMap((x,i)=>leaves(x,f.fields,[...p,i]));
 return [{field:f,path:p,value:v}];
});}
function set(data,path,value){let d=data;for(const key of path.slice(0,-1))d=d[key]??={};d[path.at(-1)]=value;}
test('全既存編集欄は単独の変更がHTML・属性・CSSまたはスライド設定に反映される',async t=>{
 const dir=await mkdtemp(resolve(tmpdir(),'worldfut-all-fields-'));let count=0;const failed=[];
 try{
  await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));
  const schema=JSON.parse(await readFile(resolve(dir,'src/site-schema.json'),'utf8'));
  for(const e of schema){const f=e.fields.find(f=>f.name==='style');if(f)f.fields=styleFields;}
  schema.push({name:'settings',file:'content/pages/settings.json',fields:globalFields});
  const fullRender=async()=>{const site=await renderSite(dir,'');const top=JSON.parse(await readFile(resolve(dir,'content/pages/top.json'),'utf8'));return applySeo(site.html,{title:site.global.title,description:site.global.description,origin:'https://worldfut-hp.pages.dev',image:site.global.seo?.image||top.slides[0].image,home:true});};
  const baseline=await fullRender();
  for(const entry of schema){
   const file=resolve(dir,entry.file),original=await readFile(file,'utf8'),data=JSON.parse(original);
   for(const {field:f,path,value:v} of leaves(data,entry.fields)){
    // Existing section order is tested separately; replacing one choice would duplicate another.
    if(path[0]==='section_order')continue;
    const changed=structuredClone(data);let value;
    if(f.widget==='image')value=v==='/assets/logo.png'?'/assets/new1.jpg':'/assets/logo.png';
    else if(f.widget==='boolean')value=!v;
    else if(f.widget==='select')value=f.options.map(o=>typeof o==='string'?o:o.value).find(x=>x!==v&&x!=='inherit');
    else if(f.widget==='color')value='#123456';
    else if(f.label.startsWith('リンク先：'))value='https://example.com/audit-'+count;
    else value='編集反映確認'+count;
    set(changed,path,value);await writeFile(file,JSON.stringify(changed));
    try{const html=await fullRender();assert.notEqual(html,baseline);}
    catch(error){failed.push(entry.name+'.'+path.join('.')+': '+error.message);}
    count++;
    await writeFile(file,original);
   }
  }
  t.diagnostic(`単独の編集反映を確認：${count}欄`);assert.deepEqual(failed,[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('お問い合わせ種別の表示と送信値が一致し、送信後も編集したボタン名を維持する',async()=>{
 const dir=await mkdtemp(resolve(tmpdir(),'worldfut-form-'));
 try{
  await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));
  const path=resolve(dir,'content/pages/contact.json');const d=JSON.parse(await readFile(path,'utf8'));d.field_15='確認用の問い合わせ種別';await writeFile(path,JSON.stringify(d));
  const {html}=await renderSite(dir,'');assert.match(html,/<option value="確認用の問い合わせ種別">確認用の問い合わせ種別<\/option>/);
  const vm=await import('node:vm');const source=await readFile(resolve(root,'src/index.html'),'utf8');const fn=source.slice(source.indexOf('  async function sendMail'),source.indexOf('  // MISSION MARQUEE'));
  const button={textContent:'団体に連絡する',disabled:false},message={style:{}};
  const nodes={submitBtn:button,formMsg:message,fname:{value:'確認'},femail:{value:'test@example.com'},ftype:{value:'確認用'},fmsg:{value:'テスト'},contactForm:{reset(){}}};
  const context={document:{getElementById:id=>nodes[id]},fetch:async()=>({json:async()=>({success:true})})};vm.runInNewContext(fn,context);await context.sendMail({preventDefault(){}});
  assert.equal(button.textContent,'団体に連絡する');assert.equal(button.disabled,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('追加セクションの文章・写真・ボタン・カード・表示切替・挿入位置と各文字設定を検証する',async t=>{
 const dir=await mkdtemp(resolve(tmpdir(),'worldfut-extra-fields-'));let count=0;
 try{
  await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));
  const file=resolve(dir,'content/pages/settings.json'),original=JSON.parse(await readFile(file,'utf8'));
  const base={title:'新規案内',eyebrow:'EXTRA',published:true,after:'about',layout:'text',body:'案内文',image:'/assets/logo.png',alt:'ロゴ画像',link:'https://example.com/base',link_label:'案内を開く',cards:[],style:{font:'inherit',heading_scale:'inherit',body_scale:'inherit'}};
  const fields=globalFields.find(f=>f.name==='extra_sections').fields;
  for(const layout of ['text','cards']){
   const item=structuredClone(base);item.layout=layout;if(layout==='cards')item.cards=[{title:'カード1',body:'説明1',image:'/assets/logo.png',alt:'画像1',link:'https://example.com/card',link_label:'詳細'}];
   const initial={...original,extra_sections:[item]};await writeFile(file,JSON.stringify(initial));const baseline=(await renderSite(dir,'')).html;
   for(const leaf of leaves(item,fields)){
    const {field:f,path,value:v}=leaf;
    if(f.widget==='hidden'||path[0]==='layout'||(layout==='text'&&path[0]==='cards')||(layout==='cards'&&['body','image','alt','link','link_label'].includes(path[0])))continue;
    const changed=structuredClone(initial);let value;
    if(f.widget==='boolean')value=!v;
    else if(f.widget==='image')value='/assets/new1.jpg';
    else if(f.widget==='color')value='#123456';
    else if(f.widget==='select')value=f.options.map(o=>typeof o==='string'?o:o.value).find(x=>x!==v&&x!=='inherit');
    else if(path.at(-1)==='link')value='https://example.com/extra-audit-'+count;
    else value='追加部品確認'+count;
    set(changed.extra_sections[0],path,value);await writeFile(file,JSON.stringify(changed));const html=(await renderSite(dir,'')).html;assert.notEqual(html,baseline,path.join('.'));count++;
   }
  }
  const d={...original,extra_sections:[{...base,title:'先の項目'},{...base,title:'後の項目'}]};await writeFile(file,JSON.stringify(d));const html=(await renderSite(dir,'')).html;assert.ok(html.indexOf('先の項目')<html.indexOf('後の項目'));
  t.diagnostic(`新規セクションの条件別編集反映：${count}ケースと並べ替え`);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('既存の繰り返し項目の追加・削除・逆順がすべて出力を変更する',async t=>{
 const dir=await mkdtemp(resolve(tmpdir(),'worldfut-lists-'));let count=0;
 try{
  await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));
  const schema=JSON.parse(await readFile(resolve(dir,'src/site-schema.json'),'utf8'));
  const baseline=(await renderSite(dir,'')).html;
  for(const entry of schema){
   const file=resolve(dir,entry.file),raw=await readFile(file,'utf8'),data=JSON.parse(raw);
   for(const f of entry.fields.filter(f=>f.widget==='list')){
    const list=data[f.name];if(!list?.length)continue;
    for(const operation of ['add','remove','reverse']){
     if(operation==='remove'&&f.name==='slides'&&list.length===1)continue;
     if(operation==='reverse'&&list.length<2)continue;
     const d=structuredClone(data);
     if(operation==='add')d[f.name].push(structuredClone(list[0]));
     if(operation==='remove')d[f.name].pop();
     if(operation==='reverse')d[f.name].reverse();
     await writeFile(file,JSON.stringify(d));assert.notEqual((await renderSite(dir,'')).html,baseline,entry.name+'.'+f.name+' '+operation);count++;
    }
    await writeFile(file,raw);
   }
  }
  t.diagnostic(`既存リストの追加・削除・並べ替え：${count}ケース`);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('本文中のテンプレート風文字列・短縮色・空の写真を安全に扱い、固定リンクが順序に依存しない',async()=>{
 const dir=await mkdtemp(resolve(tmpdir(),'worldfut-edge-fields-'));
 try{
  await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));
  const about=resolve(dir,'content/pages/about.json'),a=JSON.parse(await readFile(about,'utf8'));a.field_1='@@SLIDES@@ と @@abc@@ の説明';a.gallery=[{}];a.style.heading_color='#abc';await writeFile(about,JSON.stringify(a));
  const activities=resolve(dir,'content/pages/activities.json'),d=JSON.parse(await readFile(activities,'utf8'));d.schools[0].field_1='';await writeFile(activities,JSON.stringify(d));
  const path=resolve(dir,'content/pages/settings.json'),settings=JSON.parse(await readFile(path,'utf8'));settings.extra_sections=[{anchor:'extra-stable-b',title:'B',after:'join',layout:'text',published:true},{anchor:'extra-stable-a',title:'A',after:'about',layout:'text',published:true}];await writeFile(path,JSON.stringify(settings));
  const {html}=await renderSite(dir,'');assert.ok(html.includes('@@SLIDES@@ と @@abc@@ の説明'));assert.ok(html.includes('#aabbcc'));assert.ok(html.includes('class="act-card cms-no-photo"'));assert.doesNotMatch(html,/const pics=\[null\]/);assert.ok(html.includes('id="extra-stable-a"'));assert.ok(html.includes('id="extra-stable-b"'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
