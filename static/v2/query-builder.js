/* Four-step query builder shared by the person, unit and equipment plan lists. */
window.V2QueryBuilder=(()=>{
'use strict';
const U=V2QueryResults,{el,button}=U,E=V2QueryEngine;
const relations=[['and','并且'],['or','或者']];
const resultColumn=fieldId=>({fieldId,color:'#000000',frozen:false});

function select(options,value,label){
 const control=el('select','control');
 control.setAttribute('aria-label',label);
 for(const [key,text,disabled] of options){
  const option=el('option','',text);
  option.value=key;
  option.disabled=!!disabled;
  control.append(option);
 }
 control.value=value;
 return control;
}

function help(step){
 const content=el('span','cq-help-content');
 content.append(el('strong','cq-help-title','提示'));
 if(step===3){
  content.append(el('span','cq-help-line','例如，要查找使用单位为 A 公司、且使用状态为正常的设备，可设置：'));
  for(const [field,value] of [['使用单位','A 公司'],['使用状态','正常']]){
   const example=el('span','cq-help-example');
   for(const item of ['并且',field,'等于',value])example.append(el('span','',item));
   content.append(example);
  }
  content.append(el('span','cq-help-line','多条条件按行顺序组合，首行的关系不参与计算。'));
 }else{
  for(const line of [
   '1. 勾选展示字段，可设置字段是否在页面上展示。',
   '2. 上下拖动字段名称，可调整显示顺序。',
   '3. 勾选冻结字段后，横向拖动视图时，该字段及其之前字段始终显示在页面上。'
  ])content.append(el('span','cq-help-line',line));
 }
 const wrap=V2Help.create(content,{compact:true,label:step===3?'设置查询条件帮助提示':'设置查询结果表头帮助提示'});
 wrap.classList.add('cq-step-help');
 return wrap;
}

function open(existing,api,onSave,domain='person'){
 const initialType=existing?.objectType||({person:'inspector',unit:'supervision',equipment:'boiler'})[domain];
 let D=V2QueryDictionaries.get(domain,initialType,existing?.subtype);
 const draft=existing?structuredClone(existing):{
  version:1,domain,name:'',objectType:initialType,conditionFieldIds:[],
  expression:{kind:'group',logic:'and',children:[]},resultColumns:[]
 };
 const root=el('div','cq-builder'),header=el('div','cq-builder-heading'),name=U.control('查询条件名称','text',draft.name);
 const error=el('p','form-error');
 error.setAttribute('role','alert');
 name.input.maxLength=80;
 name.input.placeholder='输入查询的名称';
 header.append(name.wrap,el('p','notice','本机演示方案，仅保存查询条件和结果列配置。'));
 root.append(header);

 const nav=el('div','cq-step-nav'),panes=el('div','cq-panes');
 const steps=['选择'+D.noun+'类型','勾选查询条件','设置查询条件','设置查询结果表头'];
 let active=0;
 const sections=steps.map((label,i)=>{
  nav.append(button((i+1)+'. '+label,'secondary',()=>{active=i;showStep();}));
  const section=el('section','cq-pane'),title=el('h3','','第'+['一','二','三','四'][i]+'步：'+label);
  if(i>=2)title.append(help(i+1));
  section.append(title);
  panes.append(section);
  return section;
 });
 root.append(nav,panes);
 function showStep(){sections.forEach((section,i)=>section.classList.toggle('cq-active',i===active));}

 const types=el('div','cq-pane-content'),fieldList=el('div','cq-pane-content cq-field-list');
 const rules=el('div','cq-pane-content cq-rules'),results=el('div','cq-pane-content cq-result-fields');
 [types,fieldList,rules,results].forEach((body,i)=>sections[i].append(body));
 const checkboxes=new Map();

 function selectedFields(){
  const selected=new Set();
  function visit(node){
   if(node.kind==='group')node.children.forEach(visit);
   else selected.add(node.fieldId);
  }
  visit(draft.expression);
  return [...selected];
 }
 function syncFields(){
  draft.conditionFieldIds=selectedFields();
  for(const [id,checkbox] of checkboxes)checkbox.checked=draft.conditionFieldIds.includes(id);
 }
 function prune(group,keep){
  group.children=group.children.filter(node=>{
   if(node.kind==='rule')return keep(node);
   prune(node,keep);
   return node.children.length>0;
  });
 }
 function switchType(type,subtype){
  draft.objectType=type;
  if(subtype)draft.subtype=subtype;else delete draft.subtype;
  D=V2QueryDictionaries.get(domain,type,subtype);
  prune(draft.expression,node=>{
   const f=D.fieldMap[node.fieldId];
   if(!f)return false;
   if(f.type==='enum'&&!['empty','notEmpty'].includes(node.op)&&!D.choices(f).includes(node.value))node.value='';
   return true;
  });
  syncFields();
  if(existing){
   draft.resultColumns=draft.resultColumns.filter(column=>D.fieldMap[column.fieldId]);
   if(!draft.resultColumns.length)draft.resultColumns=[resultColumn(D.defaultField)];
  }else draft.resultColumns=[];
  error.textContent='对象类型已切换，已移除不适用字段和条件，请核对剩余条件。';
  renderTypes();renderFields();renderRules();renderResults();
 }
 function renderTypes(){
  types.replaceChildren();
  for(const type of D.types){
   const label=el('label','cq-type'),radio=el('input');
   radio.type='radio';
   radio.name='query-object-type';
   radio.value=type.id;
   radio.checked=draft.objectType===type.id;
   radio.onchange=()=>switchType(type.id,type.id==='pressure-pipeline'?'installation':undefined);
   label.append(radio,document.createTextNode(type.label));
   types.append(label);
  }
  if(draft.objectType==='pressure-pipeline'){
   const sub=select([['installation','压力管道装置'],['pipeline','压力管道管线']],draft.subtype,'压力管道子类型');
   sub.onchange=()=>switchType('pressure-pipeline',sub.value);
   types.append(sub);
  }
  types.append(el('p','notice',D.note));
  if(!D.hasSource)types.append(el('p','notice','当前演示环境暂无该类型数据源'));
 }
 function addCondition(id,group=draft.expression){
  if(!D.fieldMap[id]||draft.conditionFieldIds.includes(id))return;
  group.children.push({kind:'rule',fieldId:id,join:group.logic,op:'eq',value:''});
  syncFields();
  renderRules();
 }
 function renderFields(){
  fieldList.replaceChildren();
  checkboxes.clear();
  for(const f of D.fields){
   const line=el('div','cq-field-choice'),label=el('label'),checkbox=el('input');
   checkbox.type='checkbox';
   checkbox.setAttribute('aria-label','查询字段 '+f.label);
   checkbox.onchange=()=>{
    if(checkbox.checked)addCondition(f.id);
    else{prune(draft.expression,node=>node.fieldId!==f.id);syncFields();renderRules();}
   };
   checkboxes.set(f.id,checkbox);
   label.append(checkbox,document.createTextNode(f.label));
   const status=D.availability(f,draft.objectType);
   if(status!=='available')label.append(el('small','cq-missing',status==='missing'?'暂无数据':'部分记录缺失'));
   if(f.group)label.append(el('small','cq-field-group',f.group));
   const add=button('⊕','link',()=>addCondition(f.id));
   add.setAttribute('aria-label','添加条件 '+f.label);
   line.dataset.fieldId=f.id;
   line.append(label,add);
   fieldList.append(line);
  }
  syncFields();
 }

 function removeNode(group,node){
  group.children.splice(group.children.indexOf(node),1);
  prune(draft.expression,()=>true);
  syncFields();
  renderRules();
 }
 function connector(node,group){
  const relation=select(relations,node.join??group.logic,'逻辑关系');
  relation.onchange=()=>node.join=relation.value;
  return relation;
 }
 function renderValue(node,f){
  const box=el('div','cq-condition-value');
  if(['empty','notEmpty'].includes(node.op))return box;
  if(f.type==='enum'||f.type==='boolean'){
   const values=f.type==='boolean'?[['true','是'],['false','否']]:D.choices(f).map(value=>[value,value]);
   const control=select([['','请选择'],...values],node.value||'',f.label+'条件值');
   control.onchange=()=>node.value=control.value;
   box.append(control);
   return box;
  }
  const range=node.op==='between';
  for(let index=0;index<(range?2:1);index++){
   const input=el('input','control');
   input.type=f.type==='date'?'date':f.type==='number'?'number':'text';
   if(f.type==='number')input.step='any';
   input.maxLength=200;
   input.setAttribute('aria-label',f.label+(range?(index?'条件上限':'条件下限'):'条件值'));
   input.value=range?(node.values?.[index]??''):(node.value??'');
   input.oninput=()=>{
    if(range){node.values??=['',''];node.values[index]=input.value;}
    else node.value=input.value;
   };
   box.append(input);
  }
  return box;
 }
 function renderRule(node,group){
  const f=D.fieldMap[node.fieldId],line=el('div','cq-condition');
  const allowed=E.operators[f.type],extra=allowed.filter(op=>!E.comparisons.includes(op));
  const options=E.comparisons.map(op=>[op,E.labels[op],!allowed.includes(op)]);
  const operator=select([...options,...extra.map(op=>[op,E.labels[op]])],node.op,'比较操作符');
  const value=renderValue(node,f);
  operator.onchange=()=>{
   if(node.op==='between')node.value=node.values?.[0]??'';
   node.op=operator.value;
   if(node.op==='between')node.values=[node.value??'',node.values?.[1]??''];
   value.replaceChildren(...renderValue(node,f).children);
  };
  const del=button('×','cq-remove-rule',()=>removeNode(group,node));
  del.setAttribute('aria-label','删除条件 '+f.label);
  line.dataset.fieldId=f.id;
  line.append(connector(node,group),el('span','cq-condition-name',f.label),operator,value,del);
  return line;
 }
 function renderGroup(group,depth){
  const block=el('div','cq-condition-group'+(depth?'':' cq-root-group'));
  for(const child of group.children){
   if(child.kind==='rule')block.append(renderRule(child,group));
   else{
    const bar=el('div','cq-group-bar'),del=button('×','cq-remove-rule',()=>removeNode(group,child));
    del.setAttribute('aria-label','删除分组');
    bar.append(connector(child,group),el('span','','条件分组'),del);
    const nested=renderGroup(child,depth+1);
    nested.prepend(bar);
    block.append(nested);
   }
  }
  if(depth){
   const unselected=D.fields.filter(f=>!draft.conditionFieldIds.includes(f.id));
   const picker=select([['','选择字段'],...unselected.map(f=>[f.id,f.label])],'','分组查询字段');
   picker.onchange=()=>addCondition(picker.value,group);
   block.append(picker);
  }
  if(depth<3&&(depth||group.children.length)){
   block.append(button('添加分组','link cq-add-group',()=>{
    group.children.push({kind:'group',logic:'and',children:[]});
    renderRules();
   }));
  }
  return block;
 }
 function renderRules(){
  rules.replaceChildren();
  if(draft.expression.children.length)rules.append(renderGroup(draft.expression,0));
 }

 let draggedField='';
 function moveColumn(id,target){
  const source=draft.resultColumns.findIndex(c=>c.fieldId===id);
  if(source<0||target<0||target>=draft.resultColumns.length||source===target)return;
  draft.resultColumns.splice(target,0,...draft.resultColumns.splice(source,1));
  renderResults();
 }
 function renderResults(){
  results.replaceChildren();
  const heading=el('div','cq-result-field cq-result-heading'),selectAll=el('input'),fieldHeader=el('label');
  selectAll.type='checkbox';
  selectAll.setAttribute('aria-label','选择全部结果字段');
  selectAll.checked=draft.resultColumns.length>0&&draft.resultColumns.length===D.fields.length;
  selectAll.indeterminate=draft.resultColumns.length>0&&!selectAll.checked;
  selectAll.onchange=()=>{
   draft.resultColumns=selectAll.checked?[...draft.resultColumns,...D.fields.filter(f=>!draft.resultColumns.some(c=>c.fieldId===f.id)).map(f=>resultColumn(f.id))]:[];
   renderResults();
  };
  fieldHeader.append(selectAll,document.createTextNode('字段'));
  heading.append(fieldHeader,el('span','','颜色'),el('span','','冻结'));
  results.append(heading);
  const selected=new Map(draft.resultColumns.map(c=>[c.fieldId,c]));
  const ordered=[...draft.resultColumns.map(c=>D.fieldMap[c.fieldId]),...D.fields.filter(f=>!selected.has(f.id))];
  for(const f of ordered){
   const column=selected.get(f.id),index=draft.resultColumns.indexOf(column);
   const line=el('div','cq-result-field'),label=el('label'),checkbox=el('input');
   checkbox.type='checkbox';
   checkbox.checked=!!column;
   checkbox.setAttribute('aria-label','结果字段 '+f.label);
   checkbox.onchange=()=>{
    if(checkbox.checked)draft.resultColumns.push(resultColumn(f.id));
    else draft.resultColumns.splice(index,1);
    renderResults();
   };
   label.append(checkbox,document.createTextNode(f.label));
   if(f.group)label.append(el('small','cq-field-group',f.group));
   const color=el('input'),freeze=el('input');
   color.type='color';
   color.value=column?.color||'#000000';
   color.disabled=!column;
   color.setAttribute('aria-label',f.label+'文字颜色');
   color.oninput=()=>column.color=color.value;
   freeze.type='checkbox';
   freeze.checked=column?.frozen||false;
   freeze.disabled=!column;
   freeze.setAttribute('aria-label',f.label+'冻结');
   freeze.onchange=()=>column.frozen=freeze.checked;
   const up=button('↑','link',()=>moveColumn(f.id,index-1)),down=button('↓','link',()=>moveColumn(f.id,index+1));
   up.setAttribute('aria-label',f.label+'上移');
   down.setAttribute('aria-label',f.label+'下移');
   up.disabled=index<=0;
   down.disabled=index<0||index===draft.resultColumns.length-1;
   line.dataset.fieldId=f.id;
   if(column){
    line.draggable=true;
    line.ondragstart=event=>{draggedField=f.id;event.dataTransfer.setData('text/plain',f.id);};
    line.ondragend=()=>draggedField='';
    line.ondragover=event=>{if(draggedField)event.preventDefault();};
    line.ondrop=event=>{event.preventDefault();if(draggedField)moveColumn(draggedField,index);draggedField='';};
   }
   line.append(label,color,freeze,up,down);
   results.append(line);
  }
 }

 renderTypes();renderFields();renderRules();renderResults();showStep();
 const actions=el('div','cq-builder-actions');
 actions.append(button('保存','primary',()=>{
  try{
   draft.name=name.input.value.trim();
   E.validatePlan(draft);
   onSave(structuredClone(draft));
  }catch(problem){error.textContent=problem.message;error.scrollIntoView({block:'nearest'});}
 }),button('取消','secondary',api.close));
 root.append(error,actions);
 api.show(existing?'编辑组合查询条件':'新建组合查询条件',root,'organization-dialog cq-builder-dialog');
}
return {open};
})();
