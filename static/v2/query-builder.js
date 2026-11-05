/* Shared four-pane schema-driven query builder for registered query domains. */
window.V2QueryBuilder=(()=>{
'use strict';
const U=V2QueryResults,{el,button}=U,E=V2QueryEngine;
let sequence=0;
function open(existing,api,onSave,domain='person'){
const initialType=existing?.objectType||({person:'inspector',unit:'supervision',equipment:'boiler'})[domain];
let D=V2QueryDictionaries.get(domain,initialType,existing?.subtype);
const draft=existing?structuredClone(existing):{version:1,domain,name:'',objectType:initialType,conditionFieldIds:[],expression:{kind:'group',logic:'and',children:[]},resultColumns:[{fieldId:D.defaultField,color:'#000000',frozen:false}]};
const root=el('div','cq-builder'),header=el('div','cq-builder-heading'),name=U.control('查询条件名称','text',draft.name),error=el('p','form-error');error.setAttribute('role','alert');name.input.maxLength=80;name.input.oninput=()=>draft.name=name.input.value;
header.append(name.wrap,el('p','notice','本机演示方案；仅保存条件和列配置，不保存业务档案数据。缺少样本值的字段标记“暂无数据”。'));root.append(header);
const nav=el('div','cq-step-nav'),panes=el('div','cq-panes');let active=0;const steps=['选择'+D.noun+'类型','勾选查询条件','设置查询条件','设置查询结果表头'];
for(const [i,label]of steps.entries())nav.append(button((i+1)+'. '+label,'secondary',()=>{active=i;showStep()}));root.append(nav,panes);
const sections=steps.map((label,i)=>{const section=el('section','cq-pane');section.append(el('h3','','第'+['一','二','三','四'][i]+'步：'+label));panes.append(section);return section;});
function showStep(){sections.forEach((s,i)=>s.classList.toggle('cq-active',i===active));}
const types=el('div','cq-pane-content');
function switchType(type,subtype){
 const next=V2QueryDictionaries.get(domain,type,subtype);draft.objectType=type;if(subtype)draft.subtype=subtype;else delete draft.subtype;D=next;
 for(const id of draft.conditionFieldIds.slice())if(!D.fieldMap[id]){draft.conditionFieldIds=draft.conditionFieldIds.filter(x=>x!==id);removeField(draft.expression,id);}
 function clearInvalid(n){if(n.kind==='group')n.children.forEach(clearInvalid);else{const f=D.fieldMap[n.fieldId];if(f?.type==='enum'&&!D.choices(f).includes(n.value)&&!['empty','notEmpty'].includes(n.op))n.value='';}}clearInvalid(draft.expression);
 draft.resultColumns=draft.resultColumns.filter(c=>D.fieldMap[c.fieldId]);if(!draft.resultColumns.length)draft.resultColumns=[{fieldId:D.defaultField,color:'#000000',frozen:false}];
 error.textContent='对象类型已切换，已移除不适用字段和条件；请核对剩余条件。';renderTypes();renderFields();renderRules();renderResults();
}
function renderTypes(){types.replaceChildren();for(const type of D.types){const l=el('label','cq-type'),r=el('input');r.type='radio';r.name='query-object-type';r.value=type.id;r.checked=draft.objectType===type.id;r.onchange=()=>switchType(type.id,type.id==='pressure-pipeline'?'installation':undefined);l.append(r,document.createTextNode(type.label));types.append(l);}
 if(draft.objectType==='pressure-pipeline'){const sub=select([['installation','压力管道装置'],['pipeline','压力管道管线']],draft.subtype,'压力管道子类型');sub.onchange=()=>switchType('pressure-pipeline',sub.value);types.append(sub);}
 types.append(el('p','notice',D.note));if(!D.hasSource)types.append(el('p','notice','当前演示环境暂无该类型数据源'));}
renderTypes();sections[0].append(types);
const fieldList=el('div','cq-pane-content cq-field-list');sections[1].append(fieldList);
function ruleFor(id){return {kind:'rule',uid:'rule-'+(++sequence),fieldId:id,op:'eq',value:''};}
function removeField(n,id){if(n.kind==='group')n.children=n.children.filter(c=>c.kind!=='rule'||c.fieldId!==id).map(c=>{removeField(c,id);return c}).filter(c=>c.kind!=='group'||c.children.length);}
function renderFields(){fieldList.replaceChildren();for(const f of D.fields){const line=el('div','cq-field-choice'),l=el('label'),cb=el('input');cb.type='checkbox';cb.setAttribute('aria-label','查询字段 '+f.label);cb.checked=draft.conditionFieldIds.includes(f.id);cb.onchange=()=>{if(cb.checked)draft.conditionFieldIds.push(f.id);else{draft.conditionFieldIds=draft.conditionFieldIds.filter(id=>id!==f.id);removeField(draft.expression,f.id);renderRules();}};l.append(cb,document.createTextNode(f.label));const status=D.availability(f,draft.objectType);if(status!=='available')l.append(el('small','cq-missing',status==='missing'?'暂无数据':'部分记录缺失'));const add=button('⊕','link',()=>{if(!draft.conditionFieldIds.includes(f.id))draft.conditionFieldIds.push(f.id);draft.expression.children.push(ruleFor(f.id));renderFields();renderRules()});add.setAttribute('aria-label','添加条件 '+f.label);line.dataset.fieldId=f.id;if(f.group)l.append(el('small','cq-field-group',f.group));line.append(l,add);fieldList.append(line);}}
const rules=el('div','cq-pane-content cq-rules');sections[2].append(rules);
function select(values,value,label){const s=el('select','control');s.setAttribute('aria-label',label);for(const [v,t]of values){const o=el('option','',t);o.value=v;s.append(o);}s.value=value;return s;}
function renderRules(){rules.replaceChildren();function group(n,depth){const block=el('div','cq-condition-group');block.dataset.depth=depth;const bar=el('div','cq-group-bar'),logic=select([['and','并且（全部满足）'],['or','或者（任一满足）']],n.logic,'条件组逻辑');logic.onchange=()=>n.logic=logic.value;
const add=button('添加条件','secondary',()=>{const id=draft.conditionFieldIds[0];if(!id){error.textContent='请先在第二步勾选查询字段';return;}n.children.push(ruleFor(id));renderRules()});const sub=button('添加分组','secondary',()=>{n.children.push({kind:'group',logic:'and',children:[]});renderRules()});sub.disabled=depth>=3;bar.append(logic,add,sub);block.append(bar);
for(const child of n.children){const line=el('div','cq-condition');const del=button('×','link',()=>{n.children.splice(n.children.indexOf(child),1);renderRules()});del.setAttribute('aria-label','删除'+(child.kind==='group'?'分组':'条件'));
if(child.kind==='group'){line.append(group(child,depth+1),del);block.append(line);continue;}
const f=D.fieldMap[child.fieldId],field=select(draft.conditionFieldIds.map(id=>[id,D.fieldMap[id].label]),child.fieldId,'条件字段');field.onchange=()=>{child.fieldId=field.value;child.op='eq';child.value='';delete child.values;renderRules()};
const op=select(E.operators[f.type].map(o=>[o,E.labels[o]]),child.op,'比较操作符');op.onchange=()=>{child.op=op.value;child.value='';child.values=['',''];renderRules()};line.append(field,op);
if(!['empty','notEmpty'].includes(child.op)){for(let i=0;i<(child.op==='between'?2:1);i++){let input;if(f.type==='enum'||f.type==='boolean'){const values=f.type==='boolean'?['true','false']:D.choices(f);input=select([['','请选择'],...values.map(v=>[v,v])],child.value||'',f.label+'条件值');input.onchange=()=>child.value=input.value;}
else{input=el('input','control');input.type=f.type==='date'?'date':f.type==='number'?'number':'text';input.maxLength=200;input.setAttribute('aria-label',f.label+(child.op==='between'?(i?'条件上限':'条件下限'):'条件值'));input.value=child.op==='between'?(child.values?.[i]||''):(child.value||'');input.oninput=()=>{if(child.op==='between'){child.values??=['',''];child.values[i]=input.value;}else child.value=input.value;};}line.append(input);}}
line.append(del);block.append(line);}
if(!n.children.length)block.append(el('p','notice',depth?'空分组请添加条件或删除':'无条件时返回所选对象类型的全部现有样本。'));return block;}
rules.append(group(draft.expression,0));}
const results=el('div','cq-pane-content cq-result-fields');sections[3].append(results);
function renderResults(){results.replaceChildren();const ordered=[...draft.resultColumns.map(c=>D.fieldMap[c.fieldId]),...D.fields.filter(f=>!draft.resultColumns.some(c=>c.fieldId===f.id))];for(const f of ordered){let c=draft.resultColumns.find(c=>c.fieldId===f.id);const line=el('div','cq-result-field'),l=el('label'),cb=el('input');cb.type='checkbox';cb.checked=!!c;cb.setAttribute('aria-label','结果字段 '+f.label);cb.onchange=()=>{if(cb.checked)draft.resultColumns.push({fieldId:f.id,color:'#000000',frozen:false});else draft.resultColumns=draft.resultColumns.filter(x=>x.fieldId!==f.id);renderResults()};l.append(cb,document.createTextNode(f.label));const color=el('input');color.type='color';color.value=c?.color||'#000000';color.disabled=!c;color.setAttribute('aria-label',f.label+'文字颜色');color.oninput=()=>c.color=color.value;const freeze=el('input');freeze.type='checkbox';freeze.checked=c?.frozen||false;freeze.disabled=!c;freeze.setAttribute('aria-label',f.label+'冻结');freeze.onchange=()=>c.frozen=freeze.checked;
const move=delta=>{const i=draft.resultColumns.indexOf(c),j=i+delta;if(i>=0&&j>=0&&j<draft.resultColumns.length){[draft.resultColumns[i],draft.resultColumns[j]]=[draft.resultColumns[j],draft.resultColumns[i]];renderResults();}};
const up=button('↑','link',()=>move(-1)),down=button('↓','link',()=>move(1));up.setAttribute('aria-label',f.label+'上移');down.setAttribute('aria-label',f.label+'下移');up.disabled=!c||draft.resultColumns.indexOf(c)===0;down.disabled=!c||draft.resultColumns.indexOf(c)===draft.resultColumns.length-1;line.dataset.fieldId=f.id;if(f.group)l.append(el('small','cq-field-group',f.group));line.append(l,color,freeze,up,down);results.append(line);}
results.prepend(el('p','notice','勾选结果字段；↑↓调整顺序；颜色应用于文字；冻结列按显示顺序排列在左侧。'));}
renderFields();renderRules();renderResults();showStep();
const actions=el('div','cq-builder-actions');actions.append(button('保存','primary',()=>{try{draft.name=name.input.value.trim();E.validatePlan(draft);onSave(structuredClone(draft));}catch(e){error.textContent=e.message;error.scrollIntoView({block:'nearest'});}}),button('取消','secondary',api.close));root.append(error,actions);
api.show(existing?'编辑组合查询条件':'新建组合查询条件',root,'organization-dialog cq-builder-dialog');
}
return {open};
})();

