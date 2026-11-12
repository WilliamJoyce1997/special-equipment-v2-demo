/* Shared read-only child dialogs. No API calls, files, or record mutations. */
window.V2InspectionRecordDialogs=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
const attachmentFields=['附件类别','附件种类','标题','文件名','上传账号','上传时间'];
const detailFields=[
 ['检验机构','检验机构','text',true,true],['检验部门','检验部门','select'],['检验员','检验员'],
 ['检验性质','检验性质','select',true],['检验报告编号','报告编号','text',true],['检验类别','检验类别','select',true],
 ['报告审核人','报告审核人'],['报告审核日期','报告审核日期','date'],['报告审批人','报告审批人','text',true],
 ['报告审批日期','报告审批日期','date'],['设备检验结论','检验结论','select',true],['检验日期','检验日期','date',true],
 ['下次检验日期','下检日期','date',false,true]
];
let active=null;
function shell(title,type,row,record){
 if(active?.open){active.focus();return null;}
 const d=el('dialog','inspection-record-dialog'),header=el('div','dialog-header'),heading=el('h2','',title),body=el('div','inspection-record-body'),footer=el('div','dialog-footer');
 d.dataset.type=type;d.dataset.deviceId=row.id;d.dataset.recordId=record.id;heading.id='inspection-record-title';d.setAttribute('aria-labelledby',heading.id);body.tabIndex=-1;
 const focusBefore=document.activeElement,overflowBefore=document.body.style.overflow;let cleaned=false;
 function finish(){if(cleaned)return;cleaned=true;d.remove();if(active===d)active=null;document.body.style.overflow=overflowBefore;if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});}
 function close(){if(d.open)d.close();finish();}
 const x=button('×','icon-button',close);x.setAttribute('aria-label','关闭子弹窗');header.append(heading,x);
 footer.append(button(title==='详情检验信息'?'取消':'关闭','secondary',close));d.append(header,body,footer);
 d.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();close();});d.addEventListener('close',finish,{once:true});
 return {d,body,show(){document.body.append(d);active=d;document.body.style.overflow='hidden';d.showModal();x.focus();}};
}
function detail(type,row,record){
 const dialog=shell('详情检验信息',type,row,record);if(!dialog)return;
 const {body}=dialog,grid=el('div','inspection-read-grid');
 body.append(el('p','more-context-note','设备：'+row.equipmentCode+' · 检验记录：'+record.id+' · 前端虚构数据，只读展示，无法定检验效力。'));
 for(const [label,key,kind='text',required=false,wide=false] of detailFields){
 const field=el('div','inspection-read-field'+(wide?' wide':'')),caption=el('label');
 if(required){const star=el('span','required-mark','*');star.setAttribute('aria-hidden','true');caption.append(star);}caption.append(document.createTextNode(label));
 const input=el(kind==='select'?'select':'input','control inspection-read-control'),value=record[key]??'';
 input.id='inspection-read-'+key;caption.htmlFor=input.id;input.setAttribute('aria-label',label);
 if(kind==='select'){
  const options=type==='installation'&&label==='检验类别'?V2InstallationSchema.inspectionKinds:V2EquipmentSchema.optionsFor(type,{key,label});
  const displayed=options?['',...options]:[value];
  // Preserve historical values locally in this read-only select.
  if(!displayed.includes(value))displayed.push(value);
  for(const v of displayed){const option=el('option','',v||'请选择');option.value=v;input.append(option);}
  input.value=value;input.disabled=true;
 }
 else{input.type=kind;input.readOnly=true;input.value=value;input.placeholder='—';}
 field.append(caption,input);grid.append(field);
 }
 const problems=el('div','inspection-problems'),caption=el('div','problems-caption','主要问题'),groups=el('div','problem-groups');
 for(const [name,key,labels] of [['设备问题','设备问题',V2BoilerSchema.enums.inspectionProblems],['管理问题','管理问题',type==='pipeline'?V2PipelineSchema.enums.managementProblems:['质量管理体系','人员管理','设计图纸','材料','施工过程']]]){
 const group=el('fieldset'),legend=el('legend','',name+'：');group.append(legend);
 for(const text of labels){const label=el('label'),cb=el('input');cb.type='checkbox';cb.disabled=true;cb.checked=(Array.isArray(record[key])?record[key]:type==='pipeline'?[record[key]]:[]).includes(text);label.append(cb,document.createTextNode(text));group.append(label);}
 groups.append(group);
 }
 problems.append(caption,groups);body.append(grid,problems);dialog.show();
}
// There are no associated demo files or classification relations in the current records.
function attachmentsFor(type,row,record){return [];}
function filterAttachments(rows,context,filters){
 return rows.filter(r=>r.deviceType===context.type&&r.deviceId===context.deviceId&&r.recordId===context.recordId
 &&(!filters.filename||String(r['文件名']??'').toLowerCase().includes(filters.filename.toLowerCase()))
 &&(!filters.from||String(r['上传时间']??'').slice(0,10)>=filters.from)&&(!filters.to||String(r['上传时间']??'').slice(0,10)<=filters.to)
 &&(!filters.category||r['附件类别']===filters.category)&&(!filters.kind||r['附件种类']===filters.kind)&&(!filters.title||r['标题']===filters.title));
}
function attachments(type,row,record){
 const dialog=shell('附件管理',type,row,record);if(!dialog)return;
 const {body}=dialog,form=el('form','attachment-query'),classification=el('div','attachment-classification'),titleLabel=el('span','','附件标题：');
 const controls={},filters={filename:'',from:'',to:'',category:'',kind:'',title:''},entry={type,row,tables:{}},result=el('div','attachment-result'),error=el('p','form-error');
 error.setAttribute('role','alert');classification.append(titleLabel);
 for(const [key,name] of [['category','附件类别'],['kind','附件种类'],['title','附件标题']]){
 const select=el('select','control');select.setAttribute('aria-label',name);const o=el('option','','请选择');o.value='';select.append(o);controls[key]=select;classification.append(select);
 }
 const filenameLabel=el('label','attachment-filename','文件名：'),filename=el('input','control');filename.type='text';filename.placeholder='文件名';filename.setAttribute('aria-label','文件名');filenameLabel.append(filename);
 const dates=el('div','attachment-dates'),from=el('input','control'),to=el('input','control');from.type=to.type='date';from.setAttribute('aria-label','上传时间开始');to.setAttribute('aria-label','上传时间结束');dates.append(el('span','','上传时间：'),from,document.createTextNode('—'),to);
 const actions=el('div','attachment-query-actions'),submit=el('button','primary','查询');submit.type='submit';
 function redraw(){result.replaceChildren(V2Dossier.recordTable(entry,'record-attachments','检验记录附件',attachmentFields,filterAttachments(attachmentsFor(type,row,record),{type,deviceId:row.id,recordId:record.id},filters),null,{sortable:true,emptyText:'暂无数据'}));}
 function reset(){form.reset();Object.assign(filters,{filename:'',from:'',to:'',category:'',kind:'',title:''});entry.tables={};error.textContent='';redraw();}
 actions.append(submit,button('重置','primary',reset));dates.append(actions);form.append(classification,filenameLabel,dates,error);
 form.onsubmit=e=>{e.preventDefault();if(from.value&&to.value&&from.value>to.value){error.textContent='上传时间：开始日期不能晚于结束日期';return;}Object.assign(filters,{filename:filename.value.trim(),from:from.value,to:to.value,category:controls.category.value,kind:controls.kind.value,title:controls.title.value});error.textContent='';entry.tables={};redraw();};
 body.append(form,el('p','more-context-note','设备：'+row.equipmentCode+' · 检验记录：'+record.id+' · 当前未提供关联附件及分类关系；分类选项留空，不提供真实报告下载。'),result);
 redraw();dialog.show();
}
function open(action,type,row,record){
 if(!V2Dossier.histories(type,row).some(r=>r.id===record.id))throw Error('检验记录上下文无效');
 if(action==='详情')detail(type,row,record);else if(action==='报告附件')attachments(type,row,record);
}
return {open,filterAttachments,attachmentFields,detailFields};
})();

