window.WorldFutSectionBuilder={register(CMS){
 const ListControl=CMS.getWidget('list').control,catalog=window.WorldFutDesigns;
 const Control=window.createClass({
  getInitialState(){return {selected:0,mode:'new',after:'',design:'',category:'all'};},
  componentDidMount(){this.syncPreview();},
  componentDidUpdate(previous){if(previous.value!==this.props.value)this.syncPreview();},
  syncPreview(){if(!this.props.value?.toJS)return;this.send('wf-sections-update',{sections:this.props.value.toJS()});},
  send(type,data={}){window.parent.postMessage({type,...data},location.origin);},
  render(){
   const props=this.props,h=window.h,map=props.field.clear(),list=props.field.get('fields').clear();
   const immutable=value=>Array.isArray(value)?list.concat(value.map(immutable)):value&&typeof value==='object'?map.merge(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,immutable(v)]))):value;
   const items=props.value||list,selected=Math.max(0,Math.min(this.state.selected,items.size-1));
   const order=props.entry?.getIn?.(['data','section_order'])?.toJS?.().map(e=>e.section)||Object.keys(catalog.labels);
   const places=['start',...order];
   const placeLabel=key=>key==='start'?'ページの最初（'+catalog.labels[order[0]]+'の前）':catalog.labels[key]+'の後'+(order.indexOf(key)<order.length-1?' → '+catalog.labels[order[order.indexOf(key)+1]]+'の前':'（ページ末尾）');
   const preview=(after,design)=>this.send('wf-section-candidate',{data:design?catalog.create(design,after,'extra-candidate'):{anchor:'extra-candidate',title:'ここに新しいセクションを追加',body:'下のデザイン候補を選ぶと、この位置で見え方を確認できます。',published:true,after,layout:'text'}});
   const add=()=>{const {after,design}=this.state;if(!after||!design)return;const entry=catalog.create(design,after,'extra-'+crypto.randomUUID()),next=items.push(immutable(entry));props.onChange(next);this.setState({mode:'edit',selected:items.size});this.send('wf-sections-update',{sections:next.toJS(),focus:entry.anchor});};
   const focus=index=>{this.setState({selected:index,mode:'edit'});this.send('wf-section-candidate-clear');const entry=items.get(index);if(entry)this.send('wf-section-focus',{anchor:entry.get('anchor')||'extra-'+index});};
   const change=(updated,...args)=>props.onChange(updated.size?items.set(selected,updated.get(0)):items.delete(selected),...args);
   const layout=items.get(selected)?.get('layout'),irrelevant=catalog.listLayouts.includes(layout)?['body','image','alt','link','link_label']:['cards'];
   const visibleFields=props.field.get('fields').map(field=>irrelevant.includes(field.get('name'))?field.set('widget','hidden'):field);
   const move=delta=>{const index=selected+delta;if(index<0||index>=items.size)return;props.onChange(items.delete(selected).insert(index,items.get(selected)));this.setState({selected:index});};
   const modes=h('div',{className:'builder-modes'},h('button',{type:'button','aria-pressed':this.state.mode==='new',onClick:()=>{this.setState({mode:'new'});if(this.state.after)preview(this.state.after,this.state.design);}},'新しく追加する'),h('button',{type:'button','aria-pressed':this.state.mode==='edit',disabled:!items.size,onClick:()=>focus(selected)},'追加済みを編集（'+items.size+'）'));
   if(this.state.mode==='new'){
    const recommended=catalog.recommended(this.state.after),designs=catalog.designs.filter(d=>this.state.category==='all'||catalog.category(d.id)===this.state.category).sort((a,b)=>Number(b.id===recommended)-Number(a.id===recommended));
    return h('div',{className:'section-wizard'},modes,
     h('section',{className:'builder-step'},h('h3',{},'① どこに表示しますか？'),h('p',{},'先に追加する場所を選びます。右のHPにも、その位置を表示します。'),h('label',{htmlFor:'wf-new-placement'},'追加する場所'),h('select',{id:'wf-new-placement',value:this.state.after,onChange:event=>{const after=event.target.value;this.setState({after,design:''});if(after)preview(after,'');else this.send('wf-section-candidate-clear');}},h('option',{value:''},'表示する場所を選んでください'),places.map(key=>h('option',{key,value:key},placeLabel(key)))),this.state.after?h('div',{className:'builder-location'},placeLabel(this.state.after)+' に追加'):null),
     this.state.after?h('section',{className:'builder-step'},h('h3',{},'② デザインを選んでください'),h('p',{},'候補をクリックすると、右のHPで大きく確認できます。追加後も文章や写真を変更できます。'),h('div',{className:'design-filter'},h('label',{htmlFor:'wf-design-category'},'目的で絞り込む'),h('select',{id:'wf-design-category',value:this.state.category,onChange:event=>this.setState({category:event.target.value})},...[['all','すべて（12種類）'],['intro','団体・活動を紹介'],['impact','実績・写真・協力団体'],['join','参加・申し込みを案内'],['info','お知らせ・よくある質問']].map(([value,label])=>h('option',{key:value,value},label)))),h('div',{className:'design-grid'},designs.map(d=>h('button',{key:d.id,type:'button',className:'design-choice'+(this.state.design===d.id?' selected':''),'aria-pressed':this.state.design===d.id,onClick:()=>{this.setState({design:d.id});preview(this.state.after,d.id);}},h('div',{className:'design-thumbnail design-'+d.type+' design-variant-'+d.id,'aria-hidden':true},h('span',{className:'mock-heading'}),'split'===d.type?h('span',{className:'mock-photo'}):null,h('div',{className:'mock-lines'},h('i'),h('i'),h('i')),['cards','steps','metrics','timeline','faq','gallery','partners'].includes(d.type)?h('div',{className:'mock-cards'},...[1,2,3].map(n=>h('span',{key:n},d.type==='steps'?'0'+n:d.type==='metrics'?'—':d.type==='faq'?'Q':''))):null,d.type==='banner'?h('span',{className:'mock-button'}):null),h('strong',{},d.name),d.id===recommended?h('span',{className:'design-badge'},'この位置におすすめ'):null,h('small',{},d.description))))):null,
     this.state.design?h('div',{className:'builder-confirm'},h('p',{},placeLabel(this.state.after)+' ／ '+catalog.designs.find(d=>d.id===this.state.design).name),h('button',{type:'button',className:'builder-add',onClick:add},'この場所・デザインで追加する →'),h('small',{},'③ 追加後に内容を編集します。この操作だけではHPには保存されません。')):null);
   }
   return h('div',{className:'section-wizard'},modes,h('h3',{},'③ 内容を編集して仕上げる'),h('p',{className:'builder-help'},'右のプレビューを見ながら編集し、「公開」→「公開する」で保存します。'),items.size?h('div',{},h('label',{htmlFor:'wf-edit-section'},'編集するセクション'),h('select',{id:'wf-edit-section',value:selected,onChange:event=>focus(Number(event.target.value))},items.map((item,i)=>h('option',{key:item.get('anchor')||i,value:i},(i+1)+'. '+(item.get('title')||'新しいセクション'))).toArray())):h('p',{},'新しく追加するタブから、セクションを作成してください。'),items.size>1?h('div',{className:'builder-reorder'},h('button',{type:'button',disabled:selected===0,onClick:()=>move(-1)},'↑ 表示順を上へ'),h('button',{type:'button',disabled:selected===items.size-1,onClick:()=>move(1)},'↓ 表示順を下へ')):null,items.size?h(ListControl,{...props,key:items.get(selected)?.get('anchor')||selected,value:items.slice(selected,selected+1),onChange:change,field:props.field.set('fields',visibleFields).set('widget','list').set('allow_add',false).set('collapsed',false)}):null);
  }
 });
 CMS.registerWidget('section-builder',Control);
}};
