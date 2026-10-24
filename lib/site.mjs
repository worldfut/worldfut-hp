import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';
import { escapeHtml, safeLink } from './content.mjs';
export const styleFields = [
 {name:'font',label:'フォント',widget:'select',options:[{label:'全体設定に合わせる',value:'inherit'},{label:'ゴシック体',value:'sans'},{label:'明朝体',value:'serif'},{label:'丸ゴシック体',value:'rounded'}],default:'inherit'},
 ...['heading','body'].map(kind=>({name:kind+'_scale',label:kind==='heading'?'見出しの大きさ':'本文の大きさ',widget:'select',options:[{label:'全体設定に合わせる',value:'inherit'},{label:'小',value:'small'},{label:'標準',value:'normal'},{label:'大',value:'large'}],default:'inherit'})),
 {name:'align',label:'文字の配置',widget:'select',options:[{label:'元の配置・全体設定に合わせる',value:'inherit'},{label:'左寄せ',value:'left'},{label:'中央寄せ',value:'center'}],default:'inherit'},
 {name:'heading_weight',label:'見出しの太さ',widget:'select',options:[{label:'元の太さ・全体設定に合わせる',value:'inherit'},{label:'標準',value:'normal'},{label:'太字',value:'bold'}],default:'inherit'},
 {name:'heading_color',label:'見出しの文字色',widget:'color',allowInput:true,required:false,hint:'空欄なら元の配色・全体設定を使用。背景との読みやすさを確認してください。'},
 {name:'body_color',label:'本文の文字色',widget:'color',allowInput:true,required:false,hint:'空欄なら元の配色・全体設定を使用。'}
];
const str=(name,label,widget='string',required=false)=>({name,label,widget,required});
const imageFields=[str('image','写真','image'),str('alt','写真の説明')];
export const globalFields=[str('title','ブラウザーに表示するHP名','string',true),str('description','検索結果の説明文','text'),str('opening_logo','オープニングのロゴ','image'),{name:'opening_enabled',label:'最初のオープニング演出を表示',widget:'boolean',default:true},{name:'style',label:'HP全体の文字設定',widget:'object',fields:styleFields},
 {name:'section_order',label:'既存セクションの表示順',widget:'list',allow_add:false,allow_remove:false,min:6,max:6,summary:'{{fields.section}}',hint:'各項目をドラッグして並べ替え。上から順にHPへ表示されます。',fields:[{name:'section',label:'セクション',widget:'select',options:[{label:'トップ',value:'top'},{label:'団体概要',value:'about'},{label:'活動内容',value:'activities'},{label:'お知らせ',value:'media'},{label:'募集案内',value:'join'},{label:'お問い合わせ',value:'contact'}]}]},
 {name:'extra_sections',label:'新規セクション（追加・並べ替え）',widget:'list',required:false,default:[],collapsed:true,summary:'{{fields.title}}',fields:[str('title','見出し','string',true),str('eyebrow','小見出し（英語など）'),{name:'published',label:'HPに表示する',widget:'boolean',default:false},{name:'after',label:'挿入位置',widget:'select',options:[{label:'トップの後',value:'top'},{label:'団体概要の後',value:'about'},{label:'活動内容の後',value:'activities'},{label:'お知らせの後',value:'media'},{label:'募集案内の後',value:'join'},{label:'お問い合わせの後',value:'contact'}],default:'join'},{name:'layout',label:'部品の種類',widget:'select',options:[{label:'文章・写真・ボタン',value:'text'},{label:'カード一覧',value:'cards'}],default:'text'},str('body','本文','text'),...imageFields,str('link','ボタンのリンク先'),str('link_label','ボタン名'),{name:'cards',label:'カード一覧',widget:'list',required:false,default:[],collapsed:true,fields:[str('title','見出し','string',true),str('body','説明','text'),...imageFields,str('link','リンク先'),str('link_label','リンク名')]},{name:'style',label:'文字の見た目',widget:'object',fields:styleFields}]}];
export function validateFields(data,fields,publicDir,path='設定'){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(path+'：データ形式が不正です。');
 for(const field of fields){let v=data[field.name]; const p=path+' / '+field.label;
  if(v===undefined||v===null||v===''){if(field.required===true)throw new Error(p+'を入力してください。');continue;}
  if(field.widget==='list'){if(!Array.isArray(v)||v.length>150||v.length<(field.min||0))throw new Error(p+'：項目数が不正です。');v.forEach((e,i)=>validateFields(e,field.fields,publicDir,p+' '+(i+1)));}
  else if(field.widget==='object')validateFields(v,field.fields,publicDir,p);
  else if(field.widget==='boolean'){if(typeof v!=='boolean')throw new Error(p+'はオン・オフで設定してください。');}
  else {if(typeof v!=='string'||v.length>30000)throw new Error(p+'：文字列が不正です。');
   if(field.widget==='select'&&!field.options.some(o=>(typeof o==='string'?o:o.value)===v))throw new Error(p+'：選択値が不正です。');
   if(field.widget==='color'&&!/^#[\da-f]{6}$/i.test(v))throw new Error(p+'：色は # と6桁の英数字で指定してください。');
   if(field.widget==='image')validateImage(v,publicDir,p);
  }
 }
}
export function validateImage(v,publicDir,path='写真'){
 const file=resolve(publicDir,'.'+v);
 if(!/^\/(assets|uploads)\/[A-Za-z0-9_\-./\u0080-\uffff %]+\.(png|jpe?g|webp|gif)$/i.test(v)||!file.startsWith(resolve(publicDir)+sep)||!existsSync(file))throw new Error(path+'：保存済みのPNG/JPEG/WebP/GIF画像を選んでください。');
}
export function pageLink(v){
 if(!v)return '';
 if(/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(v))return v;
 if(/^mailto:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v))return v;
 return safeLink(v);
}
function values(template,data,fields,groups=[]){
 const lookup=new Map(fields.map(f=>[f.name,f]));
 return template.replace(/@@([a-zA-Z0-9_]+)@@/g,(_,key)=>{
  const field=lookup.get(key);if(!field)throw new Error('テンプレートの項目が未定義です：'+key);
  const value=data[key];
  if(field.widget==='list'){
   const g=groups.find(x=>x.name===key);if(!g)throw new Error('繰り返しテンプレートがありません：'+key);
   return (value||[]).map(item=>values(g.template,item,field.fields)).join('\n');
  }
  let text=value||'';
  if(field.label.startsWith('リンク先：'))text=pageLink(text);
  return escapeHtml(text).replaceAll('\n','<br>');
 }).replace(/<img\b[^>]*\bsrc=""[^>]*>/g,'').replace(/ href=""/g,'');
}
const fonts={sans:'"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',serif:'"Yu Mincho","Hiragino Mincho ProN",serif',rounded:'"Hiragino Maru Gothic ProN","BIZ UDGothic","Yu Gothic",sans-serif'};
export function typography(style={},selector='body'){
 let css='';const headings=`${selector} h1,${selector} h2,${selector} h3,${selector} h4`,body=`${selector} p,${selector} .act-year,${selector} .tl-y,${selector} .cf-platform,${selector} label,${selector} button,${selector} .sns-btn,${selector} .nav-links a,${selector} .ft2-col a`;
 if(fonts[style.font])css+=`${selector},${selector} *{font-family:${fonts[style.font]}!important;}`;
 const scale={small:.9,normal:1,large:1.15};
 if(scale[style.heading_scale]){const n=scale[style.heading_scale];css+=`${selector} h1{font-size:clamp(${1.8*n}rem,${4.8*n}vw,${4*n}rem)!important}${selector} h2{font-size:clamp(${1.7*n}rem,${3.5*n}vw,${2.6*n}rem)!important}${selector} h3{font-size:clamp(${1.1*n}rem,${2*n}vw,${1.6*n}rem)!important}${selector} h4{font-size:${n}rem!important}`;}
 if(scale[style.body_scale])css+=`${body}{font-size:${scale[style.body_scale]}rem!important}`;
 if(['left','center'].includes(style.align))css+=`${selector},${body},${headings}{text-align:${style.align}!important}`;
 if(['normal','bold'].includes(style.heading_weight))css+=`${headings}{font-weight:${style.heading_weight==='bold'?800:500}!important}`;
 if(/^#[\da-f]{6}$/i.test(style.heading_color||''))css+=`${headings}{color:${style.heading_color}!important}`;
 if(/^#[\da-f]{6}$/i.test(style.body_color||''))css+=`${body}{color:${style.body_color}!important}`;
 return css;
}
function extraSection(e,i){
 const link=(href,label)=>href?`<a class="cms-button" href="${escapeHtml(pageLink(href))}">${escapeHtml(label||'詳しく見る')}</a>`:'';
 const image=e=>e.image?`<img class="cms-extra-image" src="${escapeHtml(e.image)}" alt="${escapeHtml(e.alt||e.title||'')}" loading="lazy">`:'';
 const text=v=>escapeHtml(v||'').replaceAll('\n','<br>');
 return `<section class="cms-extra" id="extra-${i}" data-cms-section="extra-${i}"><div class="si"><p class="sl">${text(e.eyebrow)}</p><h2 class="st">${text(e.title)}</h2><div class="dv"></div>${e.layout==='cards'?`<div class="cms-extra-grid">${(e.cards||[]).map(c=>`<article>${image(c)}<h3>${text(c.title)}</h3><p>${text(c.body)}</p>${link(c.link,c.link_label)}</article>`).join('')}</div>`:`${image(e)}<p>${text(e.body)}</p>${link(e.link,e.link_label)}`}</div></section>`;
}
export async function renderSite(root,news){
 const schema=JSON.parse(await readFile(resolve(root,'src/site-schema.json'),'utf8'));
 const publicDir=resolve(root,'public');const sections={};let styles='';const docs={};
 for(const entry of schema){
  // Extend typography controls centrally, without changing migrated text field keys.
  const style=entry.fields.find(f=>f.name==='style');if(style)style.fields=styleFields;
  const data=JSON.parse(await readFile(resolve(root,entry.file),'utf8'));docs[entry.name]=data;
  validateFields(data,entry.fields,publicDir,entry.label);
  sections[entry.name]=values(await readFile(resolve(root,'src/components',entry.name+'.html'),'utf8'),data,entry.fields,entry.groups);
  styles+=typography(data.style,`[data-cms-section="${entry.name}"]`);
 }
 const global=JSON.parse(await readFile(resolve(root,'content/pages/settings.json'),'utf8'));
 validateFields(global,globalFields,publicDir,'全体設定');
 const order=(global.section_order||[]).map(x=>x.section);
 if(order.length!==6||new Set(order).size!==6)throw new Error('表示順には既存6セクションを1つずつ含めてください。');
 if(!docs.top.slides?.length||docs.top.slides.some(x=>!x.image))throw new Error('トップの写真は空欄にせず、1枚以上設定してください。');
 const extra=(global.extra_sections||[]);const chunks=order.map(key=>sections[key]+extra.map((e,i)=>e.published&&e.after===key?extraSection(e,i):'').join(''));
 extra.forEach((e,i)=>{if(e.published)styles+=typography(e.style,`[data-cms-section="extra-${i}"]`);});
 styles=typography(global.style)+styles;
 let html=await readFile(resolve(root,'src/index.html'),'utf8');
 html=html.replace('@@PAGE@@',()=>chunks.join('\n')).replace('@@SECTION_navigation@@',()=>sections.navigation).replace('@@SECTION_footer@@',()=>sections.footer).replace('<!-- CMS_NEWS -->',()=>news);
 const js=v=>JSON.stringify(v).replaceAll('<','\\u003c');
 html=html.replace('@@SLIDES@@',()=>js(docs.top.slides.map(x=>x.image))).replace('@@GALLERY@@',()=>js((docs.about.gallery||[]).map(x=>x.image)));
 if(global.opening_logo)html=html.replace('logo: "/assets/logo.png"',()=> 'logo: '+js(global.opening_logo));
 if(global.opening_enabled===false)html=html.replace("if(reduce||seen)","if(true||reduce||seen)");
 html=html.replace(/<title>.*?<\/title>/,()=>`<title>${escapeHtml(global.title)}</title>`).replace('</head>',()=>`<meta name="description" content="${escapeHtml(global.description||'')}"><link rel="stylesheet" href="/site-extra.css"><style>${styles}</style></head>`);
 if(/@@[A-Z_a-z0-9]+@@/.test(html))throw new Error('未処理の表示項目があります：'+html.match(/@@[A-Z_a-z0-9]+@@/g));
 return {html,schema:schema.map(({groups,...e})=>e),globalFields,global};
}
