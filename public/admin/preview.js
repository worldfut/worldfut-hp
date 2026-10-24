import {values,typography,extraSection,scaleDocument,renderDetail} from './preview-renderer.js';
export function renderWorkspacePreview(payload,current,newsEntry=null){
 if(current==='news'&&newsEntry)return renderDetail(newsEntry);
 const sections={},docs=payload.docs,global=payload.global;let css=typography(global.style);
 for(const e of payload.schema){sections[e.name]=values(payload.templates[e.name],docs[e.name],e.fields,e.groups);css+=typography(docs[e.name].style,`[data-cms-section="${e.name}"]`);}
 const extra=global.extra_sections||[];
 const chunks=[extra.map((e,i)=>(e.published||current==='sections')&&e.after==='start'?extraSection(e,i):'').join(''),...global.section_order.map(({section})=>sections[section]+extra.map((e,i)=>(e.published||current==='sections')&&e.after===section?extraSection(e,i):'').join(''))].join('\n');
 extra.forEach((e,i)=>{if(e.published||current==='sections')css+=typography(e.style,`[data-cms-section="${(/^extra-[a-z0-9-]{1,64}$/.test(e.anchor||'')?e.anchor:'extra-'+i)}"]`);});
 // Only static layout is rendered. No site JavaScript, form submission or outgoing navigation.
 const html=payload.source.replace('class="op-lock"','').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/@@([A-Za-z0-9_]+)@@/g,(_,k)=>({PAGE:chunks,SECTION_navigation:sections.navigation,SECTION_footer:sections.footer}[k]||'')).replace('<!-- CMS_NEWS -->',()=>payload.news);
 const photo=String(docs.top.slides?.[0]?.image||'').replace(/["\\\n\r]/g,'');
 const gallery=(docs.about.gallery||[]).filter(e=>e.image).map(e=>'<img src="'+String(e.image).replaceAll('&','&amp;').replaceAll('"','&quot;')+'" alt="活動写真">').join('');
 return scaleDocument(html.replaceAll('loading="lazy"','loading="eager"').replace('<div class="mq-track" id="mqTrack"></div>','<div class="mq-track" id="mqTrack">'+gallery+'</div>')).replace('</head>',()=>`<link rel="stylesheet" href="/site-extra.css"><style>${css}
 html{scroll-behavior:auto!important}body{overflow:auto!important}#opening{display:none!important}.reveal,.rv,.fade-in,[class*="reveal"]{opacity:1!important;transform:none!important;visibility:visible!important}.act-card{opacity:1!important;translate:none!important;transform:none!important}.tab-content.active,.sub-tab-content.active,.news-tab-content.active{animation:none!important}.hero-content *{animation:none!important;opacity:1!important;transform:none!important}.slides-wrap{background:linear-gradient(#0005,#0005),url("${photo}") center/cover!important}a,button,input,textarea,select{pointer-events:none!important}.tab-btn,.news-tab-btn{pointer-events:auto!important}nav{position:relative!important}
 </style></head>`);
}
