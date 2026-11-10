
// Shared artwork for record actions.
const V2ActionIcons=(()=>{
 const blue='#417bff',red='#ff6268';
 const shapes={
  export:`<rect x="0" y="0" width="24" height="24" rx="3" fill="#72c914"/>
          <path d="M12 19V5m-4 4 4-4 4 4m-7 10h6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  add:`<rect x="2" y="2" width="17" height="18" rx="2" fill="none" stroke="${blue}" stroke-width="2"/>
       <rect x="5" y="5" width="18" height="18" rx="2" fill="${blue}"/>
       <path d="M14 10v8m-4-4h8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  delete:`<path d="M5 6h14v14.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="${red}"/>
          <path d="M2.5 6h19M8 6V4l1.5-2h5L16 4v2" fill="none" stroke="${red}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8.5 10v9m3.5-9v9m3.5-9v9" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
  agency:`<rect x=".5" y="1" width="18.5" height="21.5" rx="1.7" fill="${blue}"/>
          <path d="M4 6h5m-5 5h9m-9 5h6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="18.5" cy="18.5" r="5" fill="${blue}" stroke="#fff" stroke-width="1.2"/>
          <circle cx="18.5" cy="17" r="1.35" fill="#fff"/>
          <path d="M15.9 21a2.6 2.6 0 0 1 5.2 0z" fill="#fff"/>`
 };
 function create(kind){
  const icon=document.createElement('span');
  icon.className='v2-action-icon';
  icon.dataset.actionIcon=kind;
  icon.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.innerHTML=shapes[kind];
  icon.append(svg);
  return icon;
 }
 function prepend(button,kind){button.prepend(create(kind));return button;}
 return {prepend};
})();

// Shared help for device queries and both field settings dialogs.
const V2Help=(()=>{
 let serial=0;
 function position(wrap){
  const [trigger,tip]=wrap.children,anchor=trigger.getBoundingClientRect();
  const dialog=wrap.closest('dialog')?.getBoundingClientRect(),inset=8;
  const left=Math.max(inset,(dialog?.left??0)+inset);
  const right=Math.min(document.documentElement.clientWidth-inset,(dialog?.right??innerWidth)-inset);
  tip.style.setProperty('--help-available-width',Math.max(0,right-left)+'px');
  tip.style.maxHeight='';
  const {width,height}=tip.getBoundingClientRect();
  const above=anchor.top-inset,below=document.documentElement.clientHeight-anchor.bottom-inset;
  const preferBelow=!!dialog;
  const openBelow=preferBelow ? below>=height||below>=above : above<height&&below>above;
  const available=Math.max(0,openBelow?below:above),visibleHeight=Math.min(height,available);
  tip.style.maxHeight=available+'px';
  tip.style.left=Math.max(left,Math.min(anchor.right-width,right-width))+'px';
  tip.style.top=(openBelow?anchor.bottom:anchor.top-visibleHeight)+'px';
 }
 function create(content,{header=false,compact=false,onClick,label}={}){
  const {el}=V2QueryResults,wrap=el('span','boiler-help-wrap');
  const trigger=el('button',header?'link boiler-help':'help'+(compact?'':' equipment-help'),header?'？帮助提示':'?');
  const tip=el('span','boiler-tooltip');
  tip.append(content);
  trigger.type='button';
  trigger.setAttribute('aria-label',label||(header?'帮助提示':'查询使用说明'));
  tip.id='v2-help-'+(++serial);
  trigger.setAttribute('aria-describedby',tip.id);
  tip.setAttribute('role','tooltip');
  if(onClick)trigger.onclick=onClick;
  wrap.append(trigger,tip);
  wrap.addEventListener('pointerenter',()=>position(wrap));
  trigger.addEventListener('focus',()=>position(wrap));
  return wrap;
 }
 function showSettings(show,title,body,mode,text,onClose=()=>{}){
  const wrap=create(text,{header:true});
  show(title,body,mode,()=>{wrap.remove();onClose();});
  const header=body.closest('dialog').querySelector('.dialog-header');
  header.insertBefore(wrap,header.lastElementChild);
 }
 function reposition(){
  for(const wrap of document.querySelectorAll('.boiler-help-wrap:hover,.boiler-help-wrap:focus-within'))position(wrap);
 }
 window.addEventListener('resize',reposition);
 window.addEventListener('scroll',reposition,true);
 return {create,showSettings};
})();

// Shared field-order dialog used by all nine device queries.
const V2FieldSettings=(()=>{
 function open({items,defaults,isQuery,show,close,refresh,onSave,helpText,onPreview,onClose}){
 const {el,button}=V2QueryResults,root=el('div','boiler-settings'),holder=el('div'),error=el('p','form-error');
 error.setAttribute('role','alert');let draft=items.map(item=>({...item})),dragged=null;
 function paint(){holder.replaceChildren();const table=el('table'),head=el('thead'),hr=el('tr'),all=el('input');all.type='checkbox';all.setAttribute('aria-label','选择全部字段');all.checked=draft.every(f=>f.shown);all.indeterminate=draft.some(f=>f.shown)&&!all.checked;all.onchange=()=>{for(const f of draft)f.shown=all.checked;paint();onPreview?.(draft);};const check=el('th');check.append(all);hr.append(check,el('th','','字段名称'));if(!isQuery)hr.append(el('th','','字段文字颜色'),el('th','','冻结字段'));head.append(hr);const body=el('tbody');
 for(const [i,f]of draft.entries()){const tr=el('tr');tr.dataset.field=f.key;tr.draggable=true;tr.ondragstart=e=>{dragged=f.key;e.dataTransfer.setData('text/plain',f.key);};tr.ondragover=e=>e.preventDefault();tr.ondrop=e=>{e.preventDefault();const at=draft.findIndex(x=>x.key===dragged);if(at<0)return;const [moved]=draft.splice(at,1);draft.splice(i,0,moved);paint();onPreview?.(draft);};
 const td=el('td'),cb=el('input');cb.type='checkbox';cb.checked=f.shown;cb.setAttribute('aria-label','显示 '+f.label+(isQuery?(f.key==='inspectionCredit'?'（检验机构）':f.key==='creditCode'?'（使用单位）':''):''));cb.onchange=()=>{f.shown=cb.checked;all.checked=draft.every(x=>x.shown);all.indeterminate=draft.some(x=>x.shown)&&!all.checked;onPreview?.(draft);};td.append(cb);
 const name=el('td','boiler-setting-name',f.label),moves=el('span','boiler-order-buttons');for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,'link',()=>{const j=i+delta;if(j>=0&&j<draft.length){[draft[i],draft[j]]=[draft[j],draft[i]];paint();onPreview?.(draft);}});b.setAttribute('aria-label',f.label+(delta<0?'上移':'下移'));b.disabled=i+delta<0||i+delta>=draft.length;moves.append(b);}name.append(moves);tr.append(td,name);
 if(!isQuery){const color=el('input');color.type='color';color.value=f.color;color.setAttribute('aria-label',f.label+'文字颜色');color.oninput=()=>f.color=color.value;const c=el('td');c.append(color);const frozen=el('input');frozen.type='checkbox';frozen.checked=f.frozen;frozen.setAttribute('aria-label','冻结 '+f.label);frozen.onchange=()=>f.frozen=frozen.checked;const freezeCell=el('td');freezeCell.append(frozen);tr.append(c,freezeCell);}body.append(tr);}
 table.append(head,body);holder.append(table);}

 const actions=el('div','boiler-modal-actions');
 actions.append(button('还原初始配置','primary',()=>{draft=defaults();paint();onPreview?.(draft);}),
 button('保存','primary',()=>{
  if(isQuery&&!draft.some(f=>f.shown)){error.textContent='至少选择一个字段';return;}
  try{onSave(draft);}catch(e){error.textContent=e.message;return;}
  close();refresh();
 }));
 root.append(holder,error,actions);paint();
 V2Help.showSettings(show,isQuery?'查询条件自定义字段':'表格自定义展示字段',root,'boiler-settings-dialog',helpText,onClose);
 }
 return {open};
})();

/* Device controller; shared table presentation persists separately from query/session state. */
window.V2EquipmentPage=(()=>{
'use strict';
let serial=0,st=null,apiRef=null,type="boiler";const states={};
const U=()=>V2QueryResults,S=()=>V2EquipmentSchema.get(type);
const usageHelp='1、查询条件是范围查询的包含左右边界值查询\n2、边界值为0的会查到非特殊符号数据，如/或者--数据';
const settingsHelp='提示\n1.勾选展示字段，可设置字段是否在页面上展示\n2.上下拖动字段名称，可调整字段在页面上的显示位置\n3.勾选冻结字段，左右拖动视图时，该字段及该字段之前字段将始终显示在页面上';
function defaultColumns(){return V2.types[type].columns.map(c=>({...c,color:'#000000',shown:true,frozen:false}));}
function initial(){return {searched:false,filters:{},draft:{},advanced:false,queryOrder:S().advanced.map(f=>f.key),hiddenQueries:new Set(),columns:defaultColumns(),table:U().state()};}
function select(label,options,value,name){const {el}=U(),input=el('select','control');input.name=name;input.setAttribute('aria-label',label);for(const v of ['',...options]){const o=el('option','',v||'请选择');o.value=v;input.append(o);}input.value=value||'';return input;}
function control(f,values){if(['单位所属行业','所属行业'].includes(f.label))f={...f,type:'cascade',tree:V2CommonFields.industry};const {el}=U(),wrap=el('div','field'),label=el('label','',f.label),id='equipment-'+type+'-'+f.key+'-'+(++serial);label.htmlFor=id;wrap.append(label);
 const uniqueLabel=f.key==='creditCode'?'社会信用代码（使用单位）':f.key==='inspectionCredit'?'社会信用代码（检验机构）':f.label;
 if(f.type==='problemPair'){
  const box=el('div','pipeline-problem-pair');
  box.append(select('主要问题（设备问题）',V2PipelineSchema.enums.inspectionProblems,values.inspectionProblems,'inspectionProblems'),
   select('主要问题（管理问题）',V2PipelineSchema.enums.managementProblems,values.managementProblems,'managementProblems'));
  box.firstElementChild.id=id;wrap.append(box);return wrap;
 }
 if(f.type==='cascade'){
 const box=el('div','boiler-cascade'),[parent,child]=String(values[f.key]||'').split(' / '),first=select(f.label+'一级',Object.keys(f.tree),parent,''),second=select(f.label+'二级',f.tree[parent]||[],child,''),hidden=el('input');hidden.type='hidden';hidden.name=f.key;hidden.value=values[f.key]||'';
 first.id=id;const update=()=>{const children=f.tree[first.value]||[];second.replaceChildren(...select('',children,'','').children);second.hidden=!children.length;hidden.value=first.value;};first.onchange=update;second.onchange=()=>hidden.value=first.value+(second.value?' / '+second.value:'');second.hidden=!(f.tree[parent]||[]).length;box.append(first,second,hidden);wrap.append(box);return wrap;
 }
 if(f.type==='region'){
 const box=el('div','boiler-cascade'),first=select('所在地区省级',S().regions.map(p=>p.name),'','province'),second=el('select','control');second.name='area';second.setAttribute('aria-label','所在地区市区县');
 for(const o of first.options)if(o.value){const p=S().regions.find(p=>p.name===o.value);o.value=p.code;}first.value=values.province||'';first.id=id;
 function fill(){second.replaceChildren();const blank=el('option','','请选择');blank.value='';second.append(blank);const p=S().regions.find(p=>p.code===first.value);second.disabled=!p;for(const city of p?.children||[]){const group=el('optgroup');group.label=city.name;if(!['市辖区','县','省直辖县级行政区划','自治区直辖县级行政区划'].includes(city.name)){const o=el('option','',city.name);o.value=city.code;group.append(o);}for(const area of city.children||[]){const o=el('option','',area.name);o.value=area.code;group.append(o);}second.append(group);}}
 fill();second.value=values.area||'';first.onchange=fill;box.append(first,second);wrap.append(box);return wrap;
 }
 if(f.type.endsWith('Range')){const box=el('div','range');for(const [i,suffix]of ['min','max'].entries()){const input=el('input','control');input.type=f.type==='dateRange'?'date':'number';input.name=f.key+'_'+suffix;input.value=values[input.name]??'';input.setAttribute('aria-label',uniqueLabel+(i?'上限':'下限'));if(!i)input.id=id;if(input.type==='number')input.step='any';if(i)box.append(document.createTextNode('—'));box.append(input);}wrap.append(box);return wrap;}
 const input=f.type==='select'?select(uniqueLabel,f.options,values[f.key],f.key):el('input','control');if(f.type!=='select'){input.name=f.key;input.type=f.type==='number'?'number':'text';if(input.type==='number')input.step='any';input.value=values[f.key]??'';input.placeholder=f.placeholder||'请输入';input.setAttribute('aria-label',uniqueLabel);}input.id=id;input.disabled=!!f.disabled;wrap.append(input);return wrap;
}
function selected(){return V2.fixtures[type].filter(r=>st.table.selected.has(r.id));}
function queryRows(){return st.searched?V2.fixtures[type].filter(r=>S().matches(r,st.filters)):[];}
function institution(){
 const rows=selected();if(!S().sameUnit(rows)){apiRef.announce('请勾选归属于同一使用单位的设备');return;}
 const {el,button}=U(),root=el('div','boiler-institution'),dl=el('dl');
 for(const [label,value]of [['使用单位名称',rows[0].unit],['使用单位地址',rows[0].unitAddress||''],['当前调整设备数',rows.length]]){const div=el('div');div.append(el('dt','',label+'：'),el('dd','',String(value)));dl.append(div);}root.append(dl);
 const label=el('label','boiler-institution-field'),star=el('span','required-mark','*');label.append(star,document.createTextNode('检验责任主体机构名称：'));
 const input=el('input','control');input.setAttribute('aria-label','检验责任主体机构名称');input.placeholder='请输入';input.setAttribute('list','boiler-agencies');const list=el('datalist');list.id='boiler-agencies';for(const unit of V2InspectionUnits.rows.filter(r=>r.enabled!=='否')){const o=el('option');o.value=unit.name;list.append(o);}label.append(input,list);root.append(label,el('p','notice','仅调整勾选设备在当前前端演示会话的责任机构；不更改既有检验报告或真实监管资料。'));
 const error=el('p','form-error');error.setAttribute('role','alert');const actions=el('div','boiler-modal-actions');actions.append(button('保存','primary',()=>{const name=input.value.trim();if(!name){error.textContent='请填写检验责任主体机构名称';return;}if(name.length>120){error.textContent='机构名称不能超过120字';return;}for(const r of rows){r._historicalInspectionOrg??=r.inspectionOrg??'';r.inspectionOrg=name;}apiRef.close();apiRef.refresh();apiRef.announce('已更新当前前端演示会话中的责任机构，未写入数据库');}),button('关闭','secondary',apiRef.close));root.append(error,actions);apiRef.show('更改检验机构',root,'boiler-institution-dialog');
}
function settings(kind){
 const isQuery=kind==='query';
 if(!isQuery){V2TableSettings.open('main/'+type,V2.types[type].columns,apiRef.refresh,apiRef);return;}
 V2FieldSettings.open({
  isQuery,show:apiRef.show,close:apiRef.close,refresh:apiRef.refresh,helpText:settingsHelp,
  items:isQuery?st.queryOrder.map(k=>({...S().advanced.find(f=>f.key===k),shown:!st.hiddenQueries.has(k)})):st.columns,
  defaults:()=>isQuery?S().advanced.map(f=>({...f,shown:true})):defaultColumns(),
  onSave:draft=>{
   if(isQuery){
    st.queryOrder=draft.map(f=>f.key);st.hiddenQueries=new Set(draft.filter(f=>!f.shown).map(f=>f.key));
    for(const k of st.hiddenQueries)if(!S().base.some(f=>f.key===k))for(const suffix of ['', '_min','_max']){delete st.draft[k+suffix];delete st.filters[k+suffix];}
    st.table.selected.clear();
   }else st.columns=draft.map(f=>({...f}));
  }
 });
}

function render(api,key='boiler'){apiRef=api;type=key;st=states[type]??=initial();const {el,button}=U(),root=el('div','boiler-page'),panel=el('section','panel query-panel'),form=el('form');form.id='query-form';form.setAttribute('aria-label',V2.types[type].title+'查询条件');
 form.addEventListener('input',e=>{const source=e.target;if(source.name)for(const target of form.querySelectorAll('[name]'))if(target!==source&&target.name===source.name)target.value=source.value;});form.addEventListener('change',e=>{const source=e.target;if(source.name)for(const target of form.querySelectorAll('[name]'))if(target!==source&&target.name===source.name)target.value=source.value;});const grid=el('div','query-grid');for(const f of S().base)grid.append(control(f,st.draft));form.append(grid);
 if(st.advanced){const advanced=el('section','boiler-advanced'),h=el('h2','','高级查询条件'),g=el('div','query-grid');advanced.append(h);for(const key of st.queryOrder)if(!st.hiddenQueries.has(key))g.append(control(S().advanced.find(f=>f.key===key),st.draft));advanced.append(g);form.append(advanced);}
 const actions=el('div','query-actions'),submit=el('button','primary','⌕ 查询');submit.type='submit';const links=el('div','query-links');links.append(V2Help.create(usageHelp),button('⚙ 设置','link',()=>{st.draft=Object.fromEntries(new FormData(form));settings('query');}),button(st.advanced?'⌕普通查询':'⌕高级查询','link',()=>{st.draft=Object.fromEntries(new FormData(form));st.advanced=!st.advanced;if(!st.advanced)for(const f of S().advanced)if(!S().base.some(base=>base.key===f.key))for(const suffix of ['', '_min','_max'])delete st.draft[f.key+suffix];api.refresh();}));
 actions.append(submit,button('⟳ 重置','secondary',()=>{st.searched=false;st.filters={};st.draft={};st.table.page=1;st.table.selected.clear();api.refresh();}),links);const error=el('p','form-error');error.id='form-error';error.setAttribute('role','alert');form.append(actions,error);
 form.onsubmit=e=>{e.preventDefault();const filters=Object.fromEntries(new FormData(form)),problem=S().valid(filters);if(problem){error.textContent=problem;return;}st.filters=filters;st.draft={...filters};st.searched=true;st.table.page=1;st.table.selected.clear();api.refresh();};panel.append(form);root.append(panel);
 const tablePanel=el('section','panel table-panel'),toolbar=el('div','table-toolbar'),agency=V2ActionIcons.prepend(button('更改检验机构','tool',institution),'agency');
 function update(){if(type==='elevator')V2ElevatorTools.update(toolbar,selected());agency.disabled=!S().sameUnit(selected());agency.title=agency.disabled?'请勾选同一使用单位的一条或多条记录':'';}
 function exportRows(){if(!st.searched){api.announce('请先进行查询');return;}const matched=queryRows(),exported=st.table.selected.size?matched.filter(r=>st.table.selected.has(r.id)):matched;U().csv([{key:'seq',label:'序号'},{key:'operation',label:'操作'},...st.columns],exported.map((r,i)=>({...r,seq:i+1,operation:'虚构样本，仅用于演示'})),V2.types[type].title);}
 const tools=type==='elevator'?V2ElevatorTools.toolbar({api,selected,refresh:api.refresh,remember:()=>{st.draft=Object.fromEntries(new FormData(form));},agency}):[];toolbar.append(agency,...tools,V2ActionIcons.prepend(button('导出','tool',exportRows),'export'),button('设置','link boiler-table-settings',()=>settings('table')));tablePanel.append(toolbar,el('p','data-source','前端虚构'+V2.types[type].title+'样本 · 不写入数据库 · 地区为离线行政区划选项'));
 const columns=V2.types[type].columns;const rows=queryRows();tablePanel.append(U().table({title:V2.types[type].title+'设备列表',tableId:'main/'+type,columns,rows,st:st.table,actionWidth:300,emptyText:st.searched?'暂无匹配记录':'请设置查询条件后点击“查询”',actions:r=>[
 button('精简档案','row-action',()=>api.show('精简档案',V2Dossier.brief(type,r),'brief-dialog brief-single-scroll')),
 button('详情','row-action',()=>api.openDevice(type,r)),
 button('更多>>','row-action',e=>{})].map((b,i)=>{if(i===2)b.onclick=()=>V2Dossier.more(b,name=>['检测信息','检验检测更正'].includes(name)?V2ElevatorMore.open(name,r,{...api,refresh:api.refresh}):V2MoreDialogs.open(name,type,r,api.show),V2ElevatorMore.menuItems(type));return b;})}));
 root.append(tablePanel);root.addEventListener('change',()=>queueMicrotask(update));root.addEventListener('click',()=>queueMicrotask(update));update();return root;
}
return {render,control,usageHelp,settingsHelp};
})();

window.V2BoilerPage=V2EquipmentPage;
(() => {
'use strict';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const state={key:'boiler',tabs:['boiler'],pages:{},details:{},openGroups:new Set(['设备管理'])};
const labels=Object.fromEntries(V2.groups.flatMap(g=>g[1]));
let returnFocus=null,dialogCleanup=null,bodyOverflowBeforeDialog=null;
const icon=(text,blue=false)=>{const i=el('span','tool-icon'+(blue?' blue':''),text);i.setAttribute('aria-hidden','true');return i;};
function importIcon(){
 const wrapper=icon('');
 wrapper.classList.add('import-icon');
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('width','100%');
 svg.setAttribute('height','100%');
 const folder=document.createElementNS(ns,'path');
 folder.setAttribute('fill','#417bff');
 folder.setAttribute('d','M3 0h6.5a2.5 2.5 0 0 1 1.8.8L13.5 3H21a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3Z');
 const arrow=document.createElementNS(ns,'path');
 arrow.setAttribute('fill','#fff');
 arrow.setAttribute('d','M10 7.5h4a.7.7 0 0 1 .7.7V12h2.4a.8.8 0 0 1 .6 1.4l-5.1 5.1a.85.85 0 0 1-1.2 0l-5.1-5.1a.8.8 0 0 1 .6-1.4h2.4V8.2a.7.7 0 0 1 .7-.7Z');
 svg.append(folder,arrow);
 wrapper.append(svg);
 return wrapper;
}
function button(text,cls,fn){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function announce(text){const a=$('#announcement');a.textContent=text;a.style.display='block';clearTimeout(announce.timer);announce.timer=setTimeout(()=>a.style.display='none',2800);}
function safetyApi(){return {show:dialog,close:closeDialog,refresh:renderTable,announce,selected:pageState().selected};}
function pageState(){return state.pages[state.key]??=( {hasSearched:false,filters:{},page:1,size:V2.types[state.key]?.defaultPageSize||5,sort:null,descending:false,hidden:new Set(),hiddenQueries:new Set(),selected:new Set()} );}
function dialog(title,body,mode='',cleanup=null){dialogCleanup?.();dialogCleanup=cleanup;if(bodyOverflowBeforeDialog===null){bodyOverflowBeforeDialog=document.body.style.overflow;document.body.style.overflow='hidden';}$('#dialog').className=mode;returnFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren(body);$('#dialog-body').scrollTop=0;if(!$('#dialog').open)$('#dialog').showModal();if(mode.includes('brief-single-scroll'))$('#dialog-body').scrollTop=0;}
function finishDialogClose(){if($('#dialog').open||(bodyOverflowBeforeDialog===null&&!dialogCleanup))return;const cleanup=dialogCleanup;dialogCleanup=null;cleanup?.();if(bodyOverflowBeforeDialog!==null){document.body.style.overflow=bodyOverflowBeforeDialog;bodyOverflowBeforeDialog=null;}if(returnFocus?.isConnected)returnFocus.focus();}
function closeDialog(){$('#dialog').close();finishDialogClose();}
$('#dialog-close').onclick=$('#dialog-done').onclick=closeDialog;
$('#dialog').addEventListener('close',finishDialogClose);
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
$('#menu-toggle').onclick=()=>{if(innerWidth<=650)document.body.classList.toggle('mobile-menu');else document.body.classList.toggle('sidebar-hidden');};
function nav(){
 const n=$('#nav');n.replaceChildren();const activeType=state.details[state.key]?.type||state.key;
 for(const [title,items] of V2.groups){
  const expanded=state.openGroups.has(title),group=button('', 'nav-group',()=>{expanded?state.openGroups.delete(title):state.openGroups.add(title);nav();});
  group.append(el('span','',title),el('span','chevron'));group.setAttribute('aria-expanded',String(expanded));
  const children=el('div','nav-children');children.hidden=!expanded;
  for(const [key,name] of items){const b=button(name,'nav-item'+(activeType===key?' active':''),()=>open(key));b.dataset.page=key;if(activeType===key)b.setAttribute('aria-current','page');children.append(b);}
  n.append(group,children);
 }
}
function tabs(){
 $('#tabs').replaceChildren(...state.tabs.map(key=>{
 const tab=el('div','tab'+(key===state.key?' active':'')),b=button('','tab-select',()=>open(key));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===state.key));b.append(el('span','tab-dot'),el('span','',labels[key]));
 const close=button('×','tab-close',()=>{state.tabs=state.tabs.filter(k=>k!==key);if(state.details[key]){delete state.details[key];delete labels[key];}if(!state.tabs.length)state.tabs=['boiler'];if(state.key===key)open(state.tabs.at(-1));else tabs();});close.setAttribute('aria-label','关闭'+labels[key]+(state.details[key]?.row?' '+state.details[key].row.equipmentCode:'')+'标签');
 if(state.details[key]?.row)b.title=state.details[key].row.equipmentCode;tab.append(b,close);return tab;
 }));
}
function open(key){
 if(!labels[key])key='boiler';const changed=key!==state.key;state.key=key;if(!state.tabs.includes(key))state.tabs.push(key);
 const u=new URL(location.href);u.hash=key;history.replaceState(null,'',u);document.title=labels[key]+' · 特种设备综合管理系统';
 document.body.classList.remove('mobile-menu');nav();tabs();render();
 if(changed)$('#workspace-content').scrollTop=0;
}
function pipeQueryConfig(p){
 if(p.queryFields)return p.queryPreview||p.queryFields;
 const keys=pipeSchema().advanced.map(f=>f.key);
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem('v2:pipe-query-fields:'+state.key+':v1'));}
 catch{}
 const order=Array.isArray(saved?.order)?saved.order.filter(k=>keys.includes(k)):[];
 const hidden=Array.isArray(saved?.hidden)?saved.hidden.filter(k=>keys.includes(k)):[];
 p.queryFields={order:[...new Set([...order,...keys])],hidden:hidden.length===keys.length?[]:[...new Set(hidden)]};
 return p.queryFields;
}
function pipeQuerySettings(){
 const p=pageState(),schema=pipeSchema(),config=pipeQueryConfig(p);
 p.filters=Object.fromEntries(new FormData(document.querySelector('#query-form')));
 const moduleKey=state.key,storageKey='v2:pipe-query-fields:'+moduleKey+':v1';
 const rows=()=>config.order.map(key=>({...schema.advanced.find(f=>f.key===key),shown:!config.hidden.includes(key)}));
 const configuration=draft=>({order:draft.map(f=>f.key),hidden:draft.filter(f=>!f.shown).map(f=>f.key)});
 V2FieldSettings.open({
  isQuery:true,show:dialog,close:closeDialog,refresh:render,helpText:V2EquipmentPage.settingsHelp,
  items:rows(),defaults:()=>schema.advanced.map(f=>({...f,shown:true})),
  onPreview:draft=>{p.queryPreview=configuration(draft);render();},
  onClose:()=>{delete p.queryPreview;if(state.key===moduleKey)render();},
  onSave:draft=>{
   const next=configuration(draft);
   try{localStorage.setItem(storageKey,JSON.stringify(next));}
   catch{throw Error('浏览器未能保存字段配置，请检查本地存储权限后重试。');}
   p.queryFields=next;
   for(const field of schema.advanced)if(next.hidden.includes(field.key)&&!schema.base.some(base=>base.key===field.key)){
    for(const suffix of ['','_min','_max'])delete p.filters[field.key+suffix];
    if(field.type==='problemPair')delete p.filters.managementProblems;
   }
   p.page=1;p.selected.clear();
  }
 });
}
function activeQuerySchema(){return pipeSchema()||(state.key==='inspection-unit'?V2InspectionUnits.schema:state.key==='personnel'?V2Personnel.schema:null);}
function pipeSchema(){return state.key==='installation'?V2InstallationSchema:state.key==='pipeline'?V2PipelineSchema:null;}
function render(){
 V2InspectionUnits.closeMenu();V2BoilerProducts.closeMenu();document.getElementById('record-more-menu')?.remove();const main=$('#main'),t=V2.types[state.key];main.replaceChildren();if(state.details[state.key]?.creating){main.append(V2Dossier.createInstallation(state.details[state.key],{show:dialog,close:closeDialog}));return;}if(state.details[state.key]){main.append(V2Dossier.page(state.details[state.key],{show:dialog,close:closeDialog,openDevice}));return;}
 if(V2EquipmentSchema.supported.includes(state.key)){main.append(V2EquipmentPage.render({show:dialog,close:closeDialog,refresh:render,announce,openDevice},state.key));return;}
 if(['person-query','unit-query','equipment-query'].includes(state.key)){main.append(V2QueryPlans.render({show:dialog,close:closeDialog,refresh:render,announce},state.key.replace('-query','')));return;}
 if(!t?.implemented){const panel=el('section','panel planned');panel.append(el('span','planned-label','后续设计 · 尚未开发'),el('h1','',labels[state.key]),el('p','','本批已实现设备管理下九类设备页面，其他基础档案模块保留后续设计。'),el('p','','此菜单保留信息架构，未接通业务操作及数据接口。'));if(t?.queryPlan)panel.append(el('p','','已规划查询字段：'+t.queryPlan.join('、')));main.append(panel);return;}
 const p=pageState(),panel=el('section','panel query-panel'),form=el('form');form.id='query-form';form.setAttribute('aria-label',t.title+'查询条件');
 const grid=el('div','query-grid');
 for(const field of (activeQuerySchema()?activeQuerySchema().base:t.queries)){const holder=activeQuerySchema()?V2EquipmentPage.control(field,p.filters):fieldControl(field,p.filters);holder.hidden=!activeQuerySchema()&&p.hiddenQueries.has(field.key);if(holder.hidden)holder.style.display='none';grid.append(holder);}
 const actions=el('div','query-actions'),search=el('button','primary','⌕  查询');search.type='submit';const reset=button('⟳  重置','secondary',()=>{p.hasSearched=false;p.filters={};p.page=1;p.selected.clear();render();announce('已重置查询条件，列表等待查询');});
 if(t.entity==='product'||t.entity==='safety-valve')actions.classList.add('compact-query-actions');
 else{
 const links=el('div','query-links'),helpText=t.entity==='person'?'综合查询匹配姓名、演示身份证标识或关联单位名称；地区、持证状态、数据来源按且组合。全部为虚构人员，持证状态不是实际资格结论。':t.entity==='organization'?'单位名称、信用代码、联系人支持文本匹配；地区和超期状态精确组合筛选。超期为预设演示状态，不代表真实资质结论。':'查询条件按“且”组合；综合查询匹配设备代码、注册代码及使用证编号。日期和数值支持仅填单侧边界；表头可排序，表格可横向滚动。全部记录为虚构样本。';
 const showHelp=()=>info('使用说明',helpText);
 const help=['installation','pipeline'].includes(state.key)?V2Help.create(helpText,{compact:true,onClick:showHelp}):button('?','help',showHelp);
 if(help.tagName==='BUTTON')help.setAttribute('aria-label','查询使用说明');
 links.append(help,button('⚙ 设置','link',()=>settings('query')),button(activeQuerySchema()&&p.advanced?'⌕普通查询':'⌕高级查询','link',advanced));
 actions.append(links);
 }
 form.append(grid);
 if(activeQuerySchema()&&p.advanced){
  const section=el('section','boiler-advanced'),grid=el('div','query-grid');section.append(el('h2','','高级查询条件'));
  const config=pipeSchema()?pipeQueryConfig(p):{order:activeQuerySchema().advanced.map(f=>f.key),hidden:[...p.hiddenQueries]};
  for(const key of config.order)if(!config.hidden.includes(key))grid.append(V2EquipmentPage.control(activeQuerySchema().advanced.find(f=>f.key===key),p.filters));
  section.append(grid);form.append(section);
 }
 actions.prepend(search,reset);const error=el('p','form-error');error.id='form-error';error.setAttribute('role','alert');form.append(actions,error);
 form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));if(activeQuerySchema()){const problem=activeQuerySchema().valid(data);if(problem){error.textContent=problem;return;}}else if(!validate(data,t,error))return;p.filters=data;p.hasSearched=true;p.page=1;p.selected.clear();renderTable();});
 for(const event of ['input','change'])form.addEventListener(event,e=>{
 if(activeQuerySchema()&&e.target.name)for(const other of form.querySelectorAll('[name]'))if(other!==e.target&&other.name===e.target.name)other.value=e.target.value;
 if(p.selected.size){p.selected.clear();renderTable();}});
 panel.append(form);main.append(panel,el('section','panel table-panel'));renderTable();
}
function fieldControl(f,values){
 if(['单位所属行业','所属行业'].includes(f.label))return V2EquipmentPage.control(f,values);
 const holder=el('div','field'),label=el('label','',f.label);label.htmlFor='f-'+f.key;holder.append(label);
 if(f.productCategory){holder.append(V2ProductCategories.create(f.productCategory,values[f.key]||'',{query:true,id:'f-'+f.key}).element);return holder;}
 if(f.type.endsWith('Range')){
 const range=el('div','range');for(const [i,suffix] of ['min','max'].entries()){if(i)range.append(el('span','','-'));const input=el('input','control');input.type=f.type==='dateRange'?'date':'number';input.name=f.key+'_'+suffix;input.id='f-'+f.key+(i?'-max':'');input.value=values[input.name]||'';input.placeholder='请输入';input.setAttribute('aria-label',f.label+(i?'上限':'下限'));if(input.type==='number'){input.min='0';input.step='any';}range.append(input);}holder.append(range);
 }else{
 const input=el(f.type==='select'?'select':'input','control');input.name=f.key;input.id='f-'+f.key;input.setAttribute('aria-label',f.label);
 if(f.type==='select'){const placeholder=el('option','',f.allLabel||'请选择');placeholder.value='';input.append(placeholder,...f.options.map(v=>{const o=el('option','',v);o.value=v;return o;}));}else{input.type='text';input.placeholder=f.placeholder;}
 input.value=values[f.key]||'';holder.append(input);
 }return holder;
}
function validate(data,t,error){
 for(const f of t.queries.filter(f=>f.type.endsWith('Range'))){const min=data[f.key+'_min'],max=data[f.key+'_max'];if(min&&max&&(f.type==='dateRange'?min>max:Number(min)>Number(max))){error.textContent=f.label+'：下限不能大于上限';return false;}}
 error.textContent='';return true;
}
function filtered(){
 const p=pageState(),t=V2.types[state.key];
 if(!p.hasSearched)return [];
 const rows=activeQuerySchema()?V2.fixtures[state.key].filter(r=>activeQuerySchema().matches(r,p.filters)):V2.fixtures[state.key].filter(row=>Object.entries(p.filters).every(([key,value])=>{
 value=String(value??'').trim();if(!value)return true;
 if(key==='category'&&t.entity==='product')return V2ProductCategories.matches(state.key,row.category,value);
 if(key==='search')return (t.searchKeys||['equipmentCode','registrationCode','certificate','registrationCertificate','vehicleRegistrationCertificate','installationCertificate']).some(k=>String(row[k]??'').toLowerCase().includes(value.toLowerCase()));
 if(key.endsWith('_min')||key.endsWith('_max')){const name=key.slice(0,-4),field=t.queries.find(f=>f.key===name),a=field?.type==='dateRange'?row[name]:Number(row[name]),b=field?.type==='dateRange'?value:Number(value);if(t.entity==='safety-valve'&&field?.type==='dateRange'&&!a)return false;return key.endsWith('_min')?a>=b:a<=b;}
 const f=t.queries.find(f=>f.key===key);return f?.type==='select'?row[key]===value:String(row[key]??'').toLowerCase().includes(value.toLowerCase());
 }));
 if(p.sort)rows.sort((a,b)=>{const x=a[p.sort],y=b[p.sort];return (typeof x==='number'?x-y:String(x).localeCompare(String(y),'zh-CN',{numeric:true}))*(p.descending?-1:1);});
 return rows;
}
function openExcelImport(type,page){
 const api={show:dialog,close:closeDialog,announce,refresh:()=>{page.hasSearched=true;page.page=1;renderTable();}};
 if(type.entity==='person')V2Personnel.importDialog(api);
 else V2ProductImport.show(state.key,api);
}
function renderTable(){
 const panel=$('.table-panel');if(!panel)return;const p=pageState(),t=V2.types[state.key],rows=filtered();const validIds=new Set(rows.map(r=>r.id));for(const id of p.selected)if(!validIds.has(id))p.selected.delete(id);p.page=Math.max(1,Math.min(p.page,Math.ceil(rows.length/p.size)||1));panel.replaceChildren();
 const toolbar=el('div','table-toolbar');
 for(const action of t.actions){const b=button('','tool',()=>action==='导出'?exportRows():t.entity==='safety-valve'?V2SafetyValves.toolbar(action,safetyApi()):action==='导入'&&(t.entity==='person'||t.entity==='product')?openExcelImport(t,p):action==='管道汇总表'?pipelineSummary():t.entity==='organization'&&action==='删除'?V2InspectionUnits.removeUnits([...p.selected],{show:dialog,close:closeDialog,refresh:renderTable,announce}):state.key==='installation'&&action==='新增'?newInstallation():action.startsWith('更多')?moreActions():info(action+' · 未接通后端','该业务操作保留参考系统入口。本批仅实现查询与查看，未提供'+action+'的业务提交接口，不会修改任何记录。'));
 b.append(el('span','',action));
 if(action==='新增'||action==='管道汇总表')V2ActionIcons.prepend(b,'add');
 else if(action==='删除')V2ActionIcons.prepend(b,'delete');
 else b.prepend(action==='导入'?importIcon():icon(t.icons?.[action]||(action==='使用标志'?'▤':action.startsWith('更多')?'⋯':'↥'),action==='使用标志'||action.startsWith('更多')));
 if(state.key==='installation'&&action==='管道汇总表'){
 b.title='打印勾选相同单位、相同类别的在用管线信息';
 b.append(el('span','installation-summary-hint','（打印勾选相同单位、相同类别在用管线信息）'));
 }b.dataset.action=action;toolbar.append(b);}
 toolbar.append(button('设 置','link',()=>settings('column')));
 const source=el('div','data-source');source.append(el('span','',(t.entity==='safety-valve'?'数据来源：安全阀演示样本及浏览器本地记录':t.entity==='product'?'数据来源：前端演示产品及浏览器本地导入记录':t.entity==='person'?'数据来源：前端演示人员及浏览器本地导入记录':t.entity==='organization'?'数据来源：前端虚构单位 · 是否超期为预设演示状态 · 不写入数据库':'数据来源：前端虚构样本 · 非法定检验数据 · 不写入数据库')));
 const wrap=el('div','table-scroll');wrap.tabIndex=0;wrap.setAttribute('aria-label',t.title+(t.entity==='organization'||t.entity==='person'||t.entity==='product'||t.entity==='safety-valve'?'列表':'设备列表')+'，可横向滚动');
 const table=el('table',t.inlineSelection?'inline-selection':'');table.setAttribute('aria-label',t.title+(t.entity==='organization'||t.entity==='person'||t.entity==='product'||t.entity==='safety-valve'?'列表':'设备列表'));
 const cols=t.columns,cg=el('colgroup');
 for(const width of [...(t.inlineSelection?[]:[42]),t.sequenceWidth||64,t.operationWidth||240,...cols.map(c=>c.width)]){const c=el('col');c.style.width=width+'px';cg.append(c);}
 const head=el('thead'),hr=el('tr'),check=el('th','fixed check'),all=el('input');all.type='checkbox';all.setAttribute('aria-label','选择本页全部设备');
 const visible=rows.slice((p.page-1)*p.size,p.page*p.size);all.checked=visible.length>0&&visible.every(r=>p.selected.has(r.id));all.indeterminate=!all.checked&&visible.some(r=>p.selected.has(r.id));
 all.disabled=!visible.length;all.onchange=()=>{for(const r of visible)all.checked?p.selected.add(r.id):p.selected.delete(r.id);renderTable();};check.append(all);const seqHead=el('th','fixed sequence');seqHead.scope='col';seqHead.append(document.createTextNode('序号'));if(t.inlineSelection)seqHead.prepend(all);else hr.append(check);hr.append(seqHead,el('th','fixed actions','操作'));
 for(const c of cols){const th=el('th');th.scope='col';th.setAttribute('aria-sort',p.sort===c.key?(p.descending?'descending':'ascending'):'none');const b=button('','',()=>{p.descending=p.sort===c.key?!p.descending:false;p.sort=c.key;p.page=1;renderTable();});b.setAttribute('aria-label','按'+c.label+'排序');b.append(el('span','',c.label),el('span','sort-icon'+(p.sort===c.key?' sorted':''),p.sort===c.key?(p.descending?'▼':'▲'):'◆'));th.append(b);hr.append(th);}
 head.append(hr);const body=el('tbody');
 if(!visible.length){const tr=el('tr'),td=el('td','empty');td.append(el('div','empty-message',p.hasSearched?'暂无匹配记录，请调整查询条件后重新查询':'请设置查询条件后点击“查询”'));td.colSpan=cols.length+(t.inlineSelection?2:3);tr.append(td);body.append(tr);}
 for(const [i,row] of visible.entries()){
 const tr=el('tr');tr.dataset.id=row.id;const td=el('td','fixed check'),cb=el('input');cb.type='checkbox';cb.checked=p.selected.has(row.id);cb.setAttribute('aria-label','选择 '+(t.entity==='safety-valve'?row.productNumber:t.entity==='organization'||t.entity==='person'?row.name:row.equipmentCode));cb.onchange=()=>{cb.checked?p.selected.add(row.id):p.selected.delete(row.id);renderTable();};td.append(cb);
 const operation=el('td','fixed actions'),actions=el('div','record-actions');for(const [label,kind] of t.rowActions){const b=button(label,'row-action',()=>kind.startsWith('valve-')?V2SafetyValves.action(kind,row,b,safetyApi()):kind.startsWith('product-')?V2BoilerProducts.action(kind,row,b,{show:dialog,close:closeDialog,refresh:renderTable,announce}):kind.startsWith('person-')?V2Personnel.action(kind,row,dialog):kind==='organization-edit'?V2InspectionUnits.edit(row,dialog,{close:closeDialog,refresh:renderTable}):kind==='organization-menu'?V2InspectionUnits.menu(b,row,dialog,{close:closeDialog,refresh:renderTable}):kind==='menu'?V2Dossier.more(b,name=>['检测信息','检验检测更正'].includes(name)?V2ElevatorMore.open(name,row,{show:dialog,close:closeDialog,refresh:renderTable,announce}):V2MoreDialogs.open(name,state.key,row,dialog),V2ElevatorMore.menuItems(state.key)):rowOperation(row,kind));actions.append(b);}operation.append(actions);
 const sequence=el('td','fixed sequence',String((p.page-1)*p.size+i+1));if(t.inlineSelection)sequence.prepend(cb);else tr.append(td);tr.append(sequence,operation);
 for(const c of cols){const cell=el('td');cell.title=String(row[c.key]??'—');if(c.key==='status')cell.append(el('span','status'+(row.status==='停用'?' stopped':row.status==='报废'?' scrapped':''),row.status));else cell.textContent=state.key==='installation'&&c.key==='pipelineTotalLength'?Number(row[c.key]||0).toFixed(3):row[c.key]??'—';tr.append(cell);}body.append(tr);
 }
 table.append(cg,head,body);V2TableSettings.decorate(table,'main/'+state.key,cols,t.inlineSelection?2:3);wrap.append(table);
 const pagination=el('div','pagination');
 const size=el('select');size.setAttribute('aria-label','每页条数');for(const n of t.pageSizes||[5,10,20]){const o=el('option','',n+' 条/页');o.value=n;size.append(o);}size.value=p.size;size.onchange=()=>{p.size=Number(size.value);p.page=1;renderTable();};pagination.append(size);
 const prev=button('‹','',()=>{p.page--;renderTable();});prev.disabled=p.page<=1;prev.setAttribute('aria-label','上一页');pagination.append(prev);
 const pages=Math.ceil(rows.length/p.size)||1;
 for(let i=1;i<=pages;i++){const b=button(String(i),p.page===i?'current':'',()=>{p.page=i;renderTable();});b.setAttribute('aria-label','第'+i+'页');if(p.page===i)b.setAttribute('aria-current','page');pagination.append(b);}
 const next=button('›','',()=>{p.page++;renderTable();});next.disabled=p.page>=pages;next.setAttribute('aria-label','下一页');pagination.append(next,el('span','','第 '+p.page+' / '+pages+' 页'));
 panel.append(toolbar,source);if(t.summary){const pipes=relatedPipelines(rows);panel.append(el('p','installation-totals','合计数据：装置数量 '+rows.length+'；管线数量 '+pipes.length+'；管线总长度 '+V2InstallationSchema.lengthTotal(pipes)+' m（虚构样本）'));}const stats=el('div','result-count');stats.setAttribute('role','status');stats.setAttribute('aria-live','polite');
 stats.append(document.createTextNode('当前共有 '),el('span','count-total',String(rows.length)),document.createTextNode(' 条数据，已选 '),el('span','count-selected',String(p.selected.size)),document.createTextNode(' 条'));
 const tableFooter=el('div','table-footer');tableFooter.append(pagination,stats);panel.append(wrap,tableFooter);
}
function openDevice(type,row){const key='info:'+type+':'+row.id;state.details[key]??={type,row,section:0,tables:{}};labels[key]=(type==='installation'?'压力管道':V2.types[type].title)+'设备信息';open(key);}
function rowOperation(row,kind){
 if(['inspection-dialog','audit-dialog','qr-dialog'].includes(kind)){V2MoreDialogs.open({'inspection-dialog':'检验信息','audit-dialog':'修改记录','qr-dialog':'智慧监管码'}[kind],state.key,row,dialog);return;}
 if(kind==='brief'){dialog('精简档案',V2Dossier.brief(state.key,row),'brief-dialog'+(['boiler','vessel','elevator','crane','vehicle','amusement','ropeway'].includes(state.key)?' brief-single-scroll':''));return;}
 if(kind==='info'){openDevice(state.key,row);return;}
 if(kind==='detail')return detail(row);
 if(kind==='inspection')return inspection(row);
 if(kind==='regulatory')return info('智慧监管编码（演示）',row.regulatoryCode+'。此编码为虚构标识，未生成或连接真实监管二维码。');
 if(kind==='history'){
 const box=el('div');box.append(el('p','notice','以下为预置虚构修改记录，仅用于记录查看演示；不是实际系统审计日志。'));
 const list=el('div');
 for(const h of row.history||[]){const item=el('p');item.textContent=h.date+' · '+h.actor+' · '+h.field+'：'+h.before+' → '+h.after;list.append(item);}
 if(!row.history?.length)list.append(el('p','','暂无虚构修改记录'));
 box.append(list);return dialog('修改记录 · '+row.equipmentCode,box);
 }
}
function relatedPipelines(installations,activeOnly=false){
 const ids=new Set(installations.map(r=>r.id));
 return V2.fixtures.pipeline.filter(r=>ids.has(r.installationId)&&(!activeOnly||r.status==='在用'));
}
function pipelineSummary(){
 const p=pageState(),rows=filtered().filter(r=>p.selected.has(r.id));
 if(!rows.length)return info('管道汇总表 · 请选择装置','请勾选相同使用单位、相同设备类别的装置；汇总仅展示相关在用虚构管线。');
 if(new Set(rows.map(r=>r.unit)).size!==1||new Set(rows.map(r=>r.category)).size!==1)return info('管道汇总表 · 选择条件不符','请勾选相同使用单位、相同设备类别的装置。未生成任何业务提交。');
 const pipes=relatedPipelines(rows,true),box=el('div');box.append(el('p','notice','管道汇总表（演示）：按勾选装置汇总在用虚构管线。当前为只读预览，不生成正式打印报告；不具有法定效力。'));
 const total=V2InstallationSchema.lengthTotal(pipes);
 box.append(el('p','','装置数量：'+rows.length+'；在用管线数量：'+pipes.length+'；管线总长度：'+total+' m'));
 for(const r of pipes)box.append(el('p','',r.installationName+' / '+r.pipeName+' / '+r.pipelineNumber+' / '+r.length+' m'));
 if(!pipes.length)box.append(el('p','','所选装置暂无在用虚构管线'));
 dialog('管道汇总表 · 虚构管线预览',box,'wide-table-dialog');
}


function info(title,text){const box=el('div');box.append(el('p','notice',text));dialog(title,box,'compact-dialog');}
function detail(row){
 const t=V2.types[state.key],box=el('div');box.append(el('p','notice',row.source+'。本弹窗为只读档案展示；检验与许可状态均不具有法定效力。'));
 const dl=el('dl','detail-grid'),seen=new Set();
 for(const c of t.detailFields){if(seen.has(c.key))continue;seen.add(c.key);const f=el('div','detail-field');f.append(el('dt','',c.label),el('dd','',String(c.key==='sequence'?filtered().findIndex(r=>r.id===row.id)+1:row[c.key]??'—')));dl.append(f);}
 box.append(dl);dialog(t.title+'设备详情 · '+row.equipmentCode,box,'detail-dialog');
}
function inspection(row){const box=el('div');box.append(el('p','notice','模拟信息：本批不实施检测、检验或验收流程，以下日期为虚构样本，不代表法定检验结论。'));
 const dl=el('dl','detail-grid'),fields=V2.types[state.key].columns.filter(c=>c.key==='equipmentCode'||/检验|检测|下检/.test(c.label));
 for(const c of fields){const d=el('div','detail-field');d.append(el('dt','',c.label),el('dd','',String(row[c.key]??'—')));dl.append(d);}box.append(dl);dialog('检验信息 · 模拟展示',box);}
function settings(kind){
 if(kind!=='query'){V2TableSettings.open('main/'+state.key,V2.types[state.key].columns,renderTable,{show:dialog,close:closeDialog});return;}
 if(pipeSchema()&&kind==='query'){pipeQuerySettings();return;}
 const p=pageState(),t=V2.types[state.key],isQuery=kind==='query',hidden=isQuery?p.hiddenQueries:p.hidden,fields=activeQuerySchema()?.advanced||t.queries;
 const box=el('div'),notice=el('p','notice',isQuery?'选择本页可见的查询条件；隐藏条件会清空其已应用的筛选值，排列顺序保持参考图顺序。':'选择本页显示的表格列；序号和操作列保留。设置仅保存在本次浏览器页面会话，不写入数据库。');
 const grid=el('div','settings-grid');
 for(const f of fields){const label=el('label'),cb=el('input');cb.type='checkbox';cb.checked=!hidden.has(f.key);cb.onchange=()=>{
 if(cb.checked)hidden.delete(f.key);else{if(!isQuery&&hidden.size===fields.length-1){cb.checked=true;announce('至少保留一列数据');return;}hidden.add(f.key);if(isQuery&&!(pipeSchema()&&pipeSchema().base.some(base=>base.key===f.key))){delete p.filters[f.key];delete p.filters[f.key+'_min'];delete p.filters[f.key+'_max'];if(f.type==='problemPair')delete p.filters.managementProblems;p.page=1;p.selected.clear();}}
 isQuery?render():renderTable();};label.append(cb,document.createTextNode(f.label));grid.append(label);}
 box.append(notice,grid);
 const title='查询条件设置';
 if(['installation','pipeline'].includes(state.key))V2Help.showSettings(dialog,title,box,'',notice.textContent);
 else dialog(title,box);
}
function newInstallation(){
 const key='new:installation';
 state.details[key]??={type:'installation',creating:true,draft:{status:'在用',registration:'未注册'},editing:false};
 labels[key]='新增压力管道设备信息';open(key);
}
function advanced(){
 if(activeQuerySchema()){
  const p=pageState();p.filters=Object.fromEntries(new FormData(document.querySelector('#query-form')));p.advanced=!p.advanced;
  if(!p.advanced)for(const f of activeQuerySchema().advanced)if(!activeQuerySchema().base.some(b=>b.key===f.key)){for(const suffix of ['','_min','_max'])delete p.filters[f.key+suffix];if(f.type==='problemPair')delete p.filters.managementProblems;}
  render();return;
 }
 const p=pageState(),box=el('div'),form=el('form');box.append(el('p','notice','补充筛选条件与普通查询条件按“且”组合，针对当前虚构样本生效。'));
 for(const [key,label] of (V2.types[state.key].advancedFields||(V2.types[state.key].entity==='product'?[['productNumber','产品编号'],['model','产品型号']]:V2.types[state.key].entity==='person'?[['identity','证件号码'],['unitName','单位名称']]:V2.types[state.key].entity==='organization'?[['level','单位级别'],['enabled','是否启用']]:[['equipmentCode','设备代码'],['contact','联系人'],['registrationCode','设备注册代码']])))form.append(fieldControl({key,label,type:'text',placeholder:'请输入'},p.filters));
 const submit=el('button','primary','应用高级查询');submit.type='submit';submit.style.marginTop='18px';form.append(submit);
 form.onsubmit=e=>{e.preventDefault();const normal=Object.fromEntries(new FormData($('#query-form')));if(!validate(normal,V2.types[state.key],$('#form-error')))return;Object.assign(p.filters,normal,Object.fromEntries(new FormData(form)));p.hasSearched=true;p.page=1;p.selected.clear();renderTable();$('#dialog').close();announce('高级查询已应用');};box.append(form);dialog('高级查询',box);
}
function moreActions(){const box=el('div');box.append(el('p','notice','导出当前查询结果为虚构样本 CSV；本批未接通业务批量修改。'),button('导出演示数据 CSV','secondary',()=>{$('#dialog').close();exportRows();}));dialog('更多操作',box,'compact-dialog');}
function exportRows(){
 if(!pageState().hasSearched){info('请先进行查询','尚未执行查询，请先点击查询后再导出。');return;}
 const p=pageState(),t=V2.types[state.key],rows=filtered().filter(r=>t.entity==='organization'||t.entity==='person'||t.entity==='product'||t.entity==='safety-valve'||!p.selected.size||p.selected.has(r.id)),cols=t.exportAllColumns?t.columns:t.columns.filter(c=>!p.hidden.has(c.key));
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const exported=[['序号','操作',...cols.map(c=>c.label)],...rows.map((r,i)=>[i+1,'只读演示：虚构演示样本，无法定效力',...cols.map(c=>r[c.key])])];
 const csv='\uFEFF'+exported.map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=url;a.download=t.title+'-虚构演示数据.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已导出 '+rows.length+' 条虚构样本');
}
window.addEventListener('hashchange',()=>{const key=decodeURIComponent(location.hash.slice(1))||'boiler';if(key!==state.key)open(key);});
open(decodeURIComponent(location.hash.slice(1))||'boiler');
})();







