import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../public/admin/publication.js',import.meta.url),'utf8');
const sha='a'.repeat(40),newer='b'.repeat(40);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({state,checks=[],apiError=false,head=()=>sha}){
 let now=0,message='',urls=[];const timers=[],handlers={};
 const banner={replaceChildren(node){message=node;},append(){}};
 const context={window:{},document:{createTextNode:t=>t,createElement:()=>({style:{}})},Date:{now:()=>now},clearTimeout:()=>{},setTimeout:(fn,delay)=>{timers.push({fn,delay});},fetch:async url=>{urls.push(url);return {ok:!apiError,json:async()=>url==='/publication.json'?state():url.endsWith('check-runs')?{check_runs:checks}:{sha:head()}};}};
 vm.runInNewContext(code,context);context.window.WorldFutPublication.start({settings:{repo:'worldfut/worldfut-hp',branch:'codex/cloudflare-cms',origin:'https://worldfut-hp.pages.dev'},banner,CMS:{registerEventListener:({name,handler})=>handlers[name]=handler}});
 return {message:()=>message,urls,handlers,advance:async ms=>{now+=ms;const item=timers.shift();if(item)await item.fn();await flush();}};
}
test('実際に公開されたコミットまたはその祖先だけを反映済みと判定する',async()=>{
 let deployed=false;const f=fixture({state:()=>({commit:deployed?newer:'c'.repeat(40),ancestors:deployed?[sha]:[]})});await flush();assert.match(f.message(),/反映待ち/);deployed=true;await f.advance(5000);assert.match(f.message(),/反映済み/);
});
test('公開失敗・API制限では反映完了と誤表示しない',async()=>{
 const f=fixture({state:()=>({commit:'c'.repeat(40),ancestors:[]}),checks:[{name:'Cloudflare Pages',status:'completed',conclusion:'failure'}]});await flush();await f.advance(45000);assert.match(f.message(),/失敗/);
 const limited=fixture({state:()=>({}),apiError:true});await flush();assert.match(limited.message(),/未確認/);assert.doesNotMatch(limited.message(),/反映済み|完了しました/);
});
test('保存イベントの後に最新コミットを調べ直し、公開確認まで待機する',async()=>{
 let deployed=true;const f=fixture({state:()=>({commit:deployed?sha:'c'.repeat(40),ancestors:[]})});await flush();deployed=false;f.handlers.postSave();await f.advance(1000);assert.match(f.message(),/反映待ち/);deployed=true;await f.advance(5000);assert.match(f.message(),/反映が完了/);
});

test('保存前のコミットを完了扱いせず、後から失敗した公開も検知する',async()=>{
 let current=sha,deployed=sha;const checks=[{name:'Cloudflare Pages',status:'in_progress'}];
 const f=fixture({head:()=>current,state:()=>({commit:deployed,ancestors:[]}),checks});await flush();f.handlers.preSave();current=newer;f.handlers.postSave();await f.advance(1000);assert.match(f.message(),/反映待ち/);
 await f.advance(45000);assert.match(f.message(),/反映待ち/);checks[0]={name:'Cloudflare Pages',status:'completed',conclusion:'failure'};await f.advance(35000);assert.match(f.message(),/失敗/);
});
