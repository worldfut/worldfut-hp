import { readFile, readdir, mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEntry, renderNews, renderDetail, escapeHtml, safeLink, dateText, textLines } from '../lib/content.mjs';
import {applySeo,defaultSeo,seoContext,sitemap,robots} from '../lib/seo.mjs';
import { renderSite, typography, scaleDocument, values, fonts, extraSection, pageLink, scalableCss } from '../lib/site.mjs';
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
  const seo=seoContext(process.env),meta=site.global.seo||{};
  const title=site.global.title||defaultSeo.title,description=site.global.description||defaultSeo.description;
  const shareImage=meta.image||JSON.parse(await readFile(resolve(root,'content/pages/top.json'),'utf8')).slides?.[0]?.image||'/assets/logo.png';
  const dist=resolve(root,'dist');
  await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
  await cp(resolve(root,'public'),dist,{recursive:true});
  await writeFile(resolve(dist,'index.html'),applySeo(site.html,{title,description,origin:seo.displayOrigin,indexable:seo.indexable,image:shareImage,home:true}));
  await cp(resolve(root,'public/assets/logo.png'),resolve(dist,'seo-logo.png'));
  await writeFile(resolve(dist,'robots.txt'),robots(seo.site,seo.indexable));
  if(seo.indexable)await writeFile(resolve(dist,'sitemap.xml'),sitemap(seo.site,['/',...entries.filter(e=>e.published!==false&&e.body?.trim()).map(e=>'/news/'+encodeURIComponent(e.id)+'/')]));
  else await writeFile(resolve(dist,'_headers'),(await readFile(resolve(dist,'_headers'),'utf8'))+'\n/*\n  X-Robots-Tag: noindex, follow\n');
  await writeFile(resolve(dist,'404.html'),(await readFile(resolve(dist,'404.html'),'utf8')).replace('<head>','<head><meta name="robots" content="noindex, follow">'));
  let history=[];
  try{history=execFileSync('git',['log','-30','--format=%H'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(x=>/^[a-f0-9]{40}$/.test(x));}catch{}
  const commit=process.env.CF_PAGES_COMMIT_SHA||history[0]||'';
  await writeFile(resolve(dist,'publication.json'),JSON.stringify({commit,ancestors:history,built_at:new Date().toISOString()}));
  await writeFile(resolve(dist,'admin/site-schema.json'),JSON.stringify({sections:site.schema,globalFields:site.globalFields}));
  // Share the actual rendering functions with the isolated, script-free editor preview.
  const previewSchema=JSON.parse(await readFile(resolve(root,'src/site-schema.json'),'utf8'));
  const previewDocs={},templates={};
  for(const section of previewSchema){previewDocs[section.name]=JSON.parse(await readFile(resolve(root,section.file),'utf8'));templates[section.name]=await readFile(resolve(root,'src/components',section.name+'.html'),'utf8');}
  const source=await readFile(resolve(root,'src/index.html'),'utf8');
  await writeFile(resolve(dist,'admin/preview-data.json'),JSON.stringify({schema:previewSchema,docs:previewDocs,templates,global:site.global,source,news:renderNews(entries)}));
  const renderer=[`const fonts=${JSON.stringify(fonts)};`,`const escapeHtml=${escapeHtml.toString()};`,`const dateText=${dateText.toString()};`,`const textLines=${textLines.toString()};`,renderDetail.toString(),safeLink.toString(),pageLink.toString(),values.toString(),typography.toString(),extraSection.toString(),scalableCss.toString(),scaleDocument.toString()].join('\n');
  await writeFile(resolve(dist,'admin/preview-renderer.js'),renderer+'\nexport {values,typography,extraSection,scaleDocument,renderDetail};');

  for(const e of entries.filter(e=>e.published!==false && e.body?.trim())) {
    const dir=resolve(dist,'news',e.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'index.html'),applySeo(scaleDocument(renderDetail(e)).replace('</head>',()=>'<style>'+typography(site.global.style)+'</style></head>'),{title:e.title.replaceAll('\n',' ')+'｜学生団体WorldFut',description:e.summary||e.title,origin:seo.displayOrigin,path:'/news/'+encodeURIComponent(e.id)+'/',image:e.image||shareImage,indexable:seo.indexable}));
  }
  await writeFile(resolve(dist,'admin/settings.json'),JSON.stringify({repo,origin,branch:config.branch||'main',local},null,2));
  console.log(`Built: ${entries.filter(e=>e.published!==false).length} public entries. CMS: ${local?'local editing':repo&&origin?'configured':'awaiting account setup'}`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await build({local:process.argv.includes('--local')});
