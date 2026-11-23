import {escapeHtml} from './content.mjs';
export const defaultSeo={title:'学生団体WorldFut｜サッカー×国際協力・カンボジア支援',description:'学生団体WorldFutの公式サイト。サッカーを通じた国際協力を軸に、カンボジアの子どもたちへの支援や日本でのチャリティーイベントを行っています。活動内容・沿革・お知らせをご紹介します。'};
export const organizationLinks=['https://twitter.com/WorldFutJA','https://instagram.com/worldfutja','https://facebook.com/WorldFut','https://note.com/worldfut12_note','https://www.tiktok.com/@worldfut17'];
export function seoContext(env={}){
 const site=env.SITE_URL||'https://worldfut.jp';const u=new URL(site);
 if(u.protocol!=='https:'||u.origin!==site||u.username||u.password)throw new Error('SITE_URLは末尾スラッシュのないHTTPSオリジンにしてください。');
 const indexable=env.SEO_INDEXABLE==='true'&&env.CMS_ORIGIN===site;
 return {site,indexable,displayOrigin:indexable?site:env.CMS_ORIGIN||site};
}
export function applySeo(html,{title,description,origin,path='/',image='/assets/logo.png',indexable=false,home=false}){
 const url=new URL(path,origin).href;const absoluteImage=new URL(image,origin).href;
 const graph=home?[
  {'@type':'Organization','@id':origin+'/#organization',name:'学生団体WorldFut',alternateName:'WorldFut',url:origin+'/',logo:new URL('/seo-logo.png',origin).href,sameAs:organizationLinks},
  {'@type':'WebSite','@id':origin+'/#website',name:'学生団体WorldFut',alternateName:'WorldFut',url:origin+'/',inLanguage:'ja',publisher:{'@id':origin+'/#organization'}}
 ]:[{'@type':'WebPage',name:title,description,url,inLanguage:'ja',isPartOf:{'@id':origin+'/#website'}}];
 const json=JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c');
 const meta=(name,value,property=false)=>`<meta ${property?'property':'name'}="${name}" content="${escapeHtml(value)}">`;
 const head=[meta('description',description),meta('robots',indexable?'index, follow':'noindex, follow'),indexable?`<link rel="canonical" href="${escapeHtml(url)}">`:'',meta('og:type',home?'website':'article',true),meta('og:site_name','学生団体WorldFut',true),meta('og:title',title,true),meta('og:description',description,true),meta('og:url',url,true),meta('og:locale','ja_JP',true),meta('og:image',absoluteImage,true),meta('og:image:alt','学生団体WorldFutの活動写真',true),meta('twitter:card','summary_large_image'),meta('twitter:title',title),meta('twitter:description',description),meta('twitter:image',absoluteImage),`<script type="application/ld+json" data-worldfut-seo>${json}</script>`].filter(Boolean).join('\n');
 html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${escapeHtml(title)}</title>`).replace(/<meta\b[^>]*>/gi,tag=>/\b(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["']/i.test(tag)?'':tag).replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi,'').replace(/<script\b[^>]*\bdata-worldfut-seo[^>]*>[\s\S]*?<\/script>/gi,'');
 return html.replace('</head>',()=>head+'\n</head>');
}
export function sitemap(origin,paths){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(path=>'  <url><loc>'+escapeHtml(new URL(path,origin).href)+'</loc></url>').join('\n')+'\n</urlset>\n';}
export function robots(origin,indexable){return 'User-agent: *\nAllow: /\nDisallow: /api/\n'+(indexable?'Sitemap: '+origin+'/sitemap.xml\n':'# 確認用サイト：各ページの noindex を読み取れるようクロールは許可します。\n');}
