window.WorldFutDesigns={
 labels:{top:'トップ',about:'団体概要',activities:'活動内容',media:'お知らせ',join:'募集案内',contact:'お問い合わせ'},
 designs:[
  {id:'text',name:'シンプルな文章',description:'お知らせや補足説明を、すっきり伝える。',type:'text'},
  {id:'split',name:'写真＋ストーリー',description:'活動の紹介や団体の想いを、写真と並べて伝える。',type:'split'},
  {id:'cards',name:'カードを並べる',description:'複数の活動・支援先・募集内容を比較しやすく。',type:'cards'},
  {id:'banner',name:'目立つ案内・ボタン',description:'参加募集や寄付など、次の行動につなげる。',type:'banner'},
  {id:'steps',name:'手順・ステップ',description:'参加や申し込みの流れを、順番に説明する。',type:'steps'},
  {id:'split-reverse',name:'写真を左にした紹介',description:'写真を先に見せ、活動の背景や想いを伝える。',type:'split'},
  {id:'metrics',name:'数字で伝える活動',description:'支援先や参加者数など、確認できた実績をまとめる。',type:'metrics'},
  {id:'timeline',name:'活動のタイムライン',description:'これまでの歩みや今後の予定を、時系列で紹介する。',type:'timeline'},
  {id:'faq',name:'よくある質問',description:'参加・協賛前の疑問を、質問と回答で解消する。',type:'faq'},
  {id:'quote',name:'想い・メッセージ',description:'代表やメンバーの想いを、文章で丁寧に伝える。',type:'quote'},
  {id:'gallery',name:'活動写真のギャラリー',description:'同じ大きさの写真で、現場の雰囲気を伝える。',type:'gallery'},
  {id:'partners',name:'協力・協賛団体',description:'掲載許可のある団体名やロゴを整えて紹介する。',type:'partners'}
 ],
 recommended(after){return ({start:'banner',top:'split',about:'split',activities:'cards',media:'text',join:'steps',contact:'banner'})[after]||'text';},
 listLayouts:['cards','steps','metrics','timeline','faq','gallery','partners'],
 category(id){return ({text:'info',split:'intro','split-reverse':'intro',cards:'intro',banner:'join',steps:'join',metrics:'impact',timeline:'impact',faq:'info',quote:'intro',gallery:'impact',partners:'impact'})[id];},
 create(layout,after,anchor){
  const list=this.listLayouts.includes(layout),photo=['split','split-reverse'].includes(layout);
  const title={text:'新しいお知らせ',split:'私たちの取り組み','split-reverse':'活動に込めた想い',cards:'活動のご紹介',banner:'一緒に、次の一歩を。',steps:'参加までの流れ',metrics:'数字で見るWorldFut',timeline:'これまでの歩み',faq:'よくある質問',quote:'私たちが大切にしていること',gallery:'活動の風景',partners:'活動を支えてくださる皆さま'};
  const eyebrow={text:'INFORMATION',split:'OUR STORY','split-reverse':'OUR STORY',cards:'OUR ACTIVITIES',banner:'JOIN US',steps:'HOW TO JOIN',metrics:'OUR IMPACT',timeline:'OUR JOURNEY',faq:'FAQ',quote:'OUR MESSAGE',gallery:'GALLERY',partners:'OUR PARTNERS'};
  const titles={steps:['お問い合わせ','説明・ご案内','参加する'],metrics:['—','—','—'],timeline:['年・月を入力','年・月を入力','年・月を入力'],faq:['どのような活動をしていますか？','参加までの流れは？','協賛について相談できますか？'],gallery:['活動写真 1','活動写真 2','活動写真 3'],partners:['協力団体名を入力','協賛企業名を入力','支援者名を入力']};
  return {anchor,title:title[layout],eyebrow:eyebrow[layout],published:true,after,layout,body:list?'':layout==='quote'?'ここに活動に込めた想いやメッセージを入力してください。':'ここに伝えたい内容を入力してください。見出し・写真・ボタンは自由に変更できます。',image:photo?'/assets/new1.jpg':'',alt:photo?'活動の様子':'',link:layout==='banner'?'#contact':'',link_label:layout==='banner'?'詳しく見る':'',cards:list?[1,2,3].map((n)=>({title:titles[layout]?.[n-1]||'活動の見出し '+n,body:layout==='metrics'?'実績の項目名を入力':layout==='faq'?'団体の実際の活動・運用に合わせて回答を入力してください。':'ここに説明を入力してください。',image:layout==='gallery'?['/assets/new1.jpg','/assets/new4.jpg','/assets/new3.jpg'][n-1]:'',alt:layout==='gallery'?'活動の様子':'',link:'',link_label:''})):[],style:{font:'inherit',heading_scale:'inherit',body_scale:'inherit',align:'inherit',heading_weight:'inherit'}};
 }
};
