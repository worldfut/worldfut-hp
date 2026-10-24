/* Use Decap's list and object controls for uploads, validation and persistence. */
window.WorldFutSectionBuilder={register(CMS){
 const ListControl=CMS.getWidget('list').control;
 const Control=window.createClass({
  getInitialState(){return {selected:0};},
  render(){
  const props=this.props;
  const h=window.h,map=props.field.clear(),list=props.field.get('fields').clear();
  const immutable=value=>Array.isArray(value)?list.concat(value.map(immutable)):value&&typeof value==='object'?map.merge(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,immutable(v)]))):value;
  const add=layout=>{
   const items=props.value||list;
   const item={anchor:'extra-'+crypto.randomUUID(),title:layout==='cards'?'新しいカードセクション':'新しいセクション',eyebrow:'',published:true,after:'about',layout,body:layout==='text'?'ここに紹介文を入力してください。':'',image:'',alt:'',link:'',link_label:'',cards:layout==='cards'?[{title:'カードの見出し',body:'ここに説明文を入力してください。',image:'',alt:'',link:'',link_label:''}]:[],style:{font:'inherit',heading_scale:'inherit',body_scale:'inherit',align:'inherit',heading_weight:'inherit'}};
   props.onChange(items.push(immutable(item)));this.setState({selected:items.size});
  };
  const items=props.value||list;const selected=Math.max(0,Math.min(this.state.selected,items.size-1));
  const focus=index=>{this.setState({selected:index});const entry=items.get(index);if(entry)window.parent.postMessage({type:'wf-section-focus',anchor:entry.get('anchor')||'extra-'+index},location.origin);};
  const change=(updated,...args)=>{const next=updated.size?items.set(selected,updated.get(0)):items.delete(selected);props.onChange(next,...args);};
  const layout=items.get(selected)?.get('layout');const irrelevant=layout==='cards'?['body','image','alt','link','link_label']:['cards'];
  const visibleFields=props.field.get('fields').map(field=>irrelevant.includes(field.get('name'))?field.set('widget','hidden'):field);
  const move=delta=>{const index=selected+delta;if(index<0||index>=items.size)return;props.onChange(items.delete(selected).insert(index,items.get(selected)));this.setState({selected:index});};
  const style={border:'1px solid #cadacb',borderRadius:8,padding:'14px 16px',background:'#fff',color:'#28583e',fontSize:13,fontWeight:700,cursor:'pointer',flex:1,textAlign:'left'};
  return h('div',{},h('div',{style:{background:'#f1f6ed',borderRadius:10,padding:16,marginBottom:20}},
   h('p',{style:{fontSize:14,fontWeight:700,margin:'0 0 8px'}},'① 作りたいセクションを選ぶ'),
   h('p',{style:{fontSize:11,lineHeight:1.8,margin:'0 0 14px',color:'#617461'}},'追加したら見出しや写真を編集し、「挿入位置」で置く場所を選びます。右のプレビューで保存前に確認できます。'),
   h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
    h('button',{type:'button',style,onClick:()=>add('text')},'＋ 文章・写真・ボタン'),
    h('button',{type:'button',style,onClick:()=>add('cards')},'＋ カード一覧'))),
   items.size?h('div',{style:{marginBottom:14}},h('label',{htmlFor:'wf-edit-section',style:{display:'block',fontSize:12,marginBottom:8}},'② 編集するセクション'),h('select',{id:'wf-edit-section',value:selected,onChange:event=>focus(Number(event.target.value)),style:{width:'100%',padding:12,border:'1px solid #cadacb',borderRadius:6,background:'white',fontSize:14}},items.map((item,i)=>h('option',{key:item.get('anchor')||i,value:i},(i+1)+'. '+(item.get('title')||'新しいセクション'))).toArray())):h('p',{style:{fontSize:12,color:'#71816f'}},'上のボタンから最初のセクションを追加してください。'),
   items.size>1?h('div',{style:{display:'flex',gap:8,marginBottom:16}},h('button',{type:'button',disabled:selected===0,onClick:()=>move(-1)},'↑ 表示順を上へ'),h('button',{type:'button',disabled:selected===items.size-1,onClick:()=>move(1)},'↓ 表示順を下へ')):null,
   items.size?h(ListControl,{...props,key:items.get(selected)?.get('anchor')||selected,value:items.slice(selected,selected+1),onChange:change,field:props.field.set('fields',visibleFields).set('widget','list').set('allow_add',false).set('collapsed',false)}):null);
 }});
 CMS.registerWidget('section-builder',Control);
}};
