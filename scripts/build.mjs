import { readFile, readdir, mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEntry, renderNews, renderDetail } from '../lib/content.mjs';
import { renderSite, typography, scaleDocument } from '../lib/site.mjs';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function build({ local = false } = {}) {
  const config = JSON.parse(await readFile(resolve(root,'site.config.json'),'utf8'));
  const repo = process.env.GITHUB_REPO || config.repo;
  const origin = process.env.CMS_ORIGIN || config.origin;
  if (repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('GITHUB_REPOは所有者/リポジトリ名で指定してください。');
  if (origin && (new URL(origin).origin !== origin || !origin.startsWith('https://'))) throw new Error('CMS_ORIGINは末尾スラッシュのないHTTPSオリジンにしてください。');
  const files=(await readdir(resolve(root,'content/news'))).filter(f=>f.endsWith('.json')).sort();
  const entries=await Promise.all(files.map(async file=>validateEntry(JSON.parse(await readFile(resolve(root,'content/news',file),'utf8')),file.slice(0,-5),resolve(root,'public'))));
  // Validate and render the complete site before replacing the previous output.
  const site=await renderSite(root,renderNews(entries));
  const dist=resolve(root,'dist');
  await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
  await cp(resolve(root,'public'),dist,{recursive:true});
  await writeFile(resolve(dist,'index.html'),site.html);
  let history=[];
  try{history=execFileSync('git',['log','-30','--format=%H'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(x=>/^[a-f0-9]{40}$/.test(x));}catch{}
  const commit=process.env.CF_PAGES_COMMIT_SHA||history[0]||'';
  await writeFile(resolve(dist,'publication.json'),JSON.stringify({commit,ancestors:history,built_at:new Date().toISOString()}));
  await writeFile(resolve(dist,'admin/site-schema.json'),JSON.stringify({sections:site.schema,globalFields:site.globalFields}));
  for(const e of entries.filter(e=>e.published!==false && e.body?.trim())) {
    const dir=resolve(dist,'news',e.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'index.html'),scaleDocument(renderDetail(e)).replace('</head>',()=>'<style>'+typography(site.global.style)+'</style></head>'));
  }
  await writeFile(resolve(dist,'admin/settings.json'),JSON.stringify({repo,origin,branch:config.branch||'main',local},null,2));
  console.log(`Built: ${entries.filter(e=>e.published!==false).length} public entries. CMS: ${local?'local editing':repo&&origin?'configured':'awaiting account setup'}`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await build({local:process.argv.includes('--local')});
