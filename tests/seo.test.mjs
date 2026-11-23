import test from 'node:test';import assert from 'node:assert/strict';
import{applySeo,defaultSeo,seoContext,sitemap,robots}from'../lib/seo.mjs';
test('確認用サイトはnoindex、本番は明示設定した場合だけ検索対象にする',()=>{
 assert.equal(seoContext({CMS_ORIGIN:'https://worldfut-hp.pages.dev',SEO_INDEXABLE:'true'}).indexable,false);
 assert.equal(seoContext({CMS_ORIGIN:'https://worldfut.jp'}).indexable,false);
 assert.equal(seoContext({CMS_ORIGIN:'https://worldfut.jp',SEO_INDEXABLE:'true'}).indexable,true);
 const preview=applySeo('<head><title>旧</title></head>',{...defaultSeo,origin:'https://worldfut-hp.pages.dev',home:true});
 assert.match(preview,/noindex, follow/);assert.doesNotMatch(preview,/rel="canonical"/);
});
test('本番のタイトル・説明・canonical・OGP・構造化データを重複せず安全に生成する',()=>{
 const html=applySeo('<head><title>旧</title><meta name="description" content="旧"><meta name="robots" content="noindex"></head>',{...defaultSeo,title:'タイトル <確認>',description:'説明 " & <script>',origin:'https://worldfut.jp',indexable:true,home:true});
 assert.equal((html.match(/name="description"/g)||[]).length,1);assert.match(html,/rel="canonical" href="https:\/\/worldfut.jp\/"/);assert.match(html,/property="og:image" content="https:\/\/worldfut.jp\/assets\/logo.png"/);assert.match(html,/&lt;確認&gt;/);
 const data=JSON.parse(html.match(/data-worldfut-seo>(.*?)<\/script>/s)[1]);assert.equal(data['@graph'][0].name,'学生団体WorldFut');assert.equal(data['@graph'][1]['@type'],'WebSite');assert.doesNotMatch(html,/<script>[^<]/);
 const again=applySeo(html,{...defaultSeo,origin:'https://worldfut.jp',indexable:true,home:true});assert.equal((again.match(/data-worldfut-seo/g)||[]).length,1);
});
test('サイトマップに指定ページだけを載せ、robotsへ正式なURLを通知する',()=>{
 const xml=sitemap('https://worldfut.jp',['/','/news/test/']);assert.match(xml,/<loc>https:\/\/worldfut.jp\/<\/loc>/);assert.match(xml,/\/news\/test\//);assert.doesNotMatch(xml,/admin/);
 assert.match(robots('https://worldfut.jp',true),/Sitemap: https:\/\/worldfut.jp\/sitemap.xml/);assert.doesNotMatch(robots('https://worldfut.jp',false),/Sitemap:/);
});
