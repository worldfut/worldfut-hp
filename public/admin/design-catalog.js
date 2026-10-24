window.WorldFutDesigns={
 labels:{top:'トップ',about:'団体概要',activities:'活動内容',media:'お知らせ',join:'募集案内',contact:'お問い合わせ'},
 designs:[
  {id:'text',name:'シンプルな文章',description:'お知らせや補足説明を、すっきり伝える。',type:'text'},
  {id:'split',name:'写真＋ストーリー',description:'活動の紹介や団体の想いを、写真と並べて伝える。',type:'split'},
  {id:'cards',name:'カードを並べる',description:'複数の活動・支援先・募集内容を比較しやすく。',type:'cards'},
  {id:'banner',name:'目立つ案内・ボタン',description:'参加募集や寄付など、次の行動につなげる。',type:'banner'},
  {id:'steps',name:'手順・ステップ',description:'参加や申し込みの流れを、順番に説明する。',type:'steps'}
 ],
 recommended(after){return ({start:'banner',top:'split',about:'split',activities:'cards',media:'text',join:'steps',contact:'banner'})[after]||'text';},
 create(layout,after,anchor){
  const cards=['cards','steps'].includes(layout);
  return {anchor,title:({text:'新しいお知らせ',split:'私たちの取り組み',cards:'活動のご紹介',banner:'一緒に、次の一歩を。',steps:'参加までの流れ'})[layout],eyebrow:({text:'INFORMATION',split:'OUR STORY',cards:'OUR ACTIVITIES',banner:'JOIN US',steps:'HOW TO JOIN'})[layout],published:true,after,layout,body:cards?'':'ここに伝えたい内容を入力してください。見出し・写真・ボタンは自由に変更できます。',image:layout==='split'?'/assets/new1.jpg':'',alt:layout==='split'?'活動の様子':'',link:layout==='banner'?'#contact':'',link_label:layout==='banner'?'詳しく見る':'',cards:cards?[1,2,3].map((n)=>({title:layout==='steps'?['お問い合わせ','説明・ご案内','参加する'][n-1]:'活動の見出し '+n,body:'ここに説明を入力してください。',image:'',alt:'',link:'',link_label:''})):[],style:{font:'inherit',heading_scale:'inherit',body_scale:'inherit',align:'inherit',heading_weight:'inherit'}};
 }
};
