import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build, root } from './build.mjs';

await build({local:true});
const proxy=spawn(process.execPath,[resolve(root,'node_modules/decap-server/dist/index.js')],{cwd:root,stdio:'inherit',env:{...process.env,PORT:'8081',BIND_HOST:'127.0.0.1',ORIGIN:'http://localhost:4173'}});
proxy.on('error',e=>{console.error(e);process.exit(1);});
proxy.on('exit',code=>{if(code){console.error('ローカル編集サーバーが終了しました:',code);stop();}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.wasm':'application/wasm','.css':'text/css'};
const dist=resolve(root,'dist');
const server=createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=resolve(dist,'.'+path);
    if(file!==dist && !file.startsWith(dist+sep)){res.writeHead(403).end();return;}
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('ページが見つかりません');}
});
server.on('error',error=>{console.error(error.message);stop();});
server.listen(4173,'127.0.0.1',()=>console.log('HP: http://localhost:4173/  管理画面: http://localhost:4173/admin/'));
let previous='',busy=false;
async function signature(dir){let values=[];for(const f of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,f.name);values.push(f.isDirectory()?await signature(p):p+':'+(await stat(p)).mtimeMs);}return values.join('|');}
const timer=setInterval(async()=>{
  if(busy)return;busy=true;
  try{const current=await signature(resolve(root,'content'))+await signature(resolve(root,'public/uploads'));if(current!==previous){const initialized=!!previous;previous=current;if(initialized)await build({local:true});}}catch(e){console.error('更新エラー。公開用ファイルは変更しません:',e.message);}finally{busy=false;}
},700);
function stop(){clearInterval(timer);proxy.kill();server.close();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
