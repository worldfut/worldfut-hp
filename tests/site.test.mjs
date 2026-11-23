import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,symlink,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {renderSite,pageLink,validateFields,styleFields} from '../lib/site.mjs';
const root=resolve(import.meta.dirname,'..');
async function fixture(run){const dir=await mkdtemp(resolve(tmpdir(),'worldfut-site-'));try{await cp(resolve(root,'src'),resolve(dir,'src'),{recursive:true});await cp(resolve(root,'content'),resolve(dir,'content'),{recursive:true});await symlink(resolve(root,'public'),resolve(dir,'public'));return await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}
async function mutate(dir,file,fn){const path=resolve(dir,'content/pages/'+file+'.json');const data=JSON.parse(await readFile(path,'utf8'));fn(data);await writeFile(path,JSON.stringify(data));}
test('既存コンテンツ、写真、タブへのリンクを維持し、文章を安全に編集できる',()=>fixture(async dir=>{
 await mutate(dir,'about',d=>{d.field_1='<script>alert(1)</script>';});
 const {html}=await renderSite(dir,'<p>NEWS</p>');assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/data-tab="japan"/);assert.match(html,/data-tab="history"/);assert.match(html,/\/assets\/act_smaong.jpg/);assert.match(html,/<p>NEWS<\/p>/);assert.doesNotMatch(html,/@@[a-zA-Z0-9_]+@@/);
}));
test('新規セクションの表示・非表示・順序と文字設定を反映する',()=>fixture(async dir=>{
 await mutate(dir,'settings',d=>{d.style.font='serif';d.extra_sections=[{title:'テスト部品',published:true,after:'about',layout:'cards',cards:[{title:'カード',body:'説明',link:'https://example.com/'}],style:{heading_scale:'large'}},{title:'非掲載部品',published:false,after:'join',layout:'text'}];});
 const {html}=await renderSite(dir,'');assert.ok(html.indexOf('id="about"')<html.indexOf('id="extra-0"'));assert.ok(html.indexOf('id="extra-0"')<html.indexOf('id="activities"'));assert.match(html,/Yu Mincho/);assert.match(html,/カード/);assert.doesNotMatch(html,/非掲載部品/);
}));
test('不正なCSS値・危険なリンク・画像パス・不完全な表示順を拒否する',async()=>{
 assert.throws(()=>validateFields({font:'serif; color:red'},styleFields,resolve(root,'public')));
 for(const v of ['javascript:alert(1)','//evil.test/','mailto:x@example.com?body=bad','http://example.com'])assert.throws(()=>pageLink(v));
 assert.equal(pageLink('#about'),'#about');assert.equal(pageLink('mailto:info@example.com'),'mailto:info@example.com');
 await fixture(async dir=>{await mutate(dir,'settings',d=>d.section_order.pop());await assert.rejects(renderSite(dir,''),/表示順/);});
 await fixture(async dir=>{await mutate(dir,'top',d=>d.slides=[{image:'/assets/../../private.png'}]);await assert.rejects(renderSite(dir,''),/写真/);});
});

test('トップも含め、管理画面で保存された順番どおりに既存セクションを出力する',()=>fixture(async dir=>{
 await mutate(dir,'settings',d=>{d.section_order=[{section:'about'},{section:'top'},{section:'contact'},{section:'activities'},{section:'join'},{section:'media'}];});
 const {html}=await renderSite(dir,'');
 const actual=[...html.matchAll(/data-cms-section="(top|about|activities|media|join|contact)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,['about','top','contact','activities','join','media']);
}));
