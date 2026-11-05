/* Three per-device read-only dialogs. No API calls or record mutations. */
window.V2MoreDialogs=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(label,cls,fn)=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;};
const {flowFields,delayFields}=V2InspectionHistory;
const auditFields=['修改人姓名','所在部门','字段名称','修改类型','字段代码','修改前值','修改后值','修改日期','账号'];
function disabled(label){const b=el('button','more-disabled',label);b.type='button';b.disabled=true;b.title='演示模式暂不支持修改或提交';return b;}
function notice(text){return el('p','more-context-note',text);}
function qrPayload(type,row){return JSON.stringify({demo:true,system:'OPENCMMS-V2-DEMO',type,id:row.id,equipmentCode:row.equipmentCode});}
function drawQR(payload){
 if(typeof window.qrcode!=='function')throw Error('本地二维码编码库不可用');
 const qr=window.qrcode(0,'M');qr.addData(payload,'Byte');qr.make();
 const count=qr.getModuleCount(),quiet=4,scale=Math.max(4,Math.floor(400/(count+quiet*2))),canvas=el('canvas','smart-qr');
 canvas.width=canvas.height=(count+quiet*2)*scale;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','模拟智慧监管码二维码');canvas.dataset.payload=payload;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器不支持二维码画布');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
 for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))ctx.fillRect((x+quiet)*scale,(y+quiet)*scale,scale,scale);
 return canvas;
}
function regulator(ctx){
 const {type,row,root}=ctx,columns=el('div','regulator-columns'),facts=el('dl','regulator-facts');
 for(const [label,value,key] of [
 ['智慧监管码',row.regulatoryCode,'regulatoryCode'],['使用单位名称',row.unit,'unit'],['使用单位地址',row.unitAddress,'unitAddress'],
 ['设备类别',row.category,'category'],['设备代码',row.equipmentCode,'equipmentCode'],['设备注册代码',row.registrationCode,'registrationCode'],['产品编号',row.productNumber,'productNumber']
 ]){const item=el('div','regulator-field');item.dataset.field=key;item.append(el('dt','',label+'：'),el('dd','',String(value??'—')));facts.append(item);}
 const image=el('div','regulator-image');
 try{image.append(drawQR(qrPayload(type,row)));}catch(error){const message=el('p','qr-error','二维码生成失败：'+error.message+'。请重新打开或检查本地资源，不提供占位二维码。');message.setAttribute('role','alert');image.append(message);}
 columns.append(facts,image);root.append(columns,notice('模拟智慧监管码 · 仅编码当前设备的DEMO标识，不指向政府系统，不具有真实监管查询效力。'));
}
function inspection(ctx){ctx.root.append(V2InspectionHistory.create({type:ctx.type,row:ctx.row,entry:ctx.entry,scrollHost:document.getElementById('dialog-body'),isDisposed:()=>ctx.disposed}));}
function auditRows(type,row){
 if(type==='safety-valve')return (row.auditRecords||[]).filter(r=>r.entityType==='safety-valve'&&r.entityId===row.id).map(r=>({...r}));
 if(V2.types[type]?.entity==='product')return (row.auditRecords||[]).filter(r=>r.entityType==='product'&&r.entityId===row.id&&r.productType===type).map(r=>({...r}));
 if(type==='personnel')return (row.auditRecords||[]).filter(r=>r.entityType==='person'&&r.entityId===row.id).map(r=>({...r}));
 if(type==='inspection-unit')return (row.auditRecords||[]).filter(r=>r.entityType==='organization'&&r.entityId===row.id).map(r=>({...r}));
 return (row.history||[]).map((h,i)=>({
 id:row.id+'-audit-'+i,deviceId:row.id,deviceType:type,
 '修改人姓名':h.actor,'所在部门':'演示档案组','字段名称':h.field,'修改类型':'预置模拟记录',
 '字段代码':h.field==='设备名称'?'name':'demo_archive_review','修改前值':h.before,'修改后值':h.after,
 '修改日期':h.date,'账号':i%2?'demo_reviewer':'demo_archivist',uploadedAt:h.date+' 09:00:00'
 }));
}
function audit(ctx){
 const {type,row,root,entry}=ctx,rows=auditRows(type,row),form=el('form','audit-query'),grid=el('div','query-grid');
 root.append(notice((ctx.entity==='safety-valve'?'安全阀：'+row.productNumber:ctx.entity==='product'?'产品：'+row.name:ctx.entity==='person'?'人员：'+row.name:ctx.entity==='organization'?'单位：'+row.name:'设备：'+row.equipmentCode)+' · 仅展示预置虚构记录，不是真实用户审计日志。查询、排序、打开窗口均不会创建修改记录。'));
 const controls={};
 for(const [key,label] of [['actor','修改人姓名'],['field','字段名称']]){
 const holder=el('div','field'),l=el('label','',label),input=el('input','control');input.type='text';input.name=key;input.placeholder='请输入';input.id='audit-'+key;l.htmlFor=input.id;holder.append(l,input);grid.append(holder);controls[key]=input;
 }
 const dates=el('div','field'),dateLabel=el('label','','上传时间'),range=el('div','range'),start=el('input','control'),end=el('input','control');
 start.type=end.type='date';start.name='from';end.name='to';start.setAttribute('aria-label','上传时间开始');end.setAttribute('aria-label','上传时间结束');dateLabel.htmlFor='audit-from';start.id='audit-from';range.append(start,document.createTextNode('-'),end);dates.append(dateLabel,range);grid.append(dates);
 const actions=el('div','audit-query-actions'),submit=el('button','primary','⌕ 查询'),error=el('p','form-error');submit.type='submit';error.setAttribute('role','alert');const result=el('div','audit-result');
 const st=entry.tables.audit??={page:1,size:10,selected:new Set()},filters={actor:'',field:'',from:'',to:''};
 function filtered(){return rows.filter(r=>(!filters.actor||String(r['修改人姓名']||'').toLowerCase().includes(filters.actor.toLowerCase()))&&(!filters.field||String(r['字段名称']||'').includes(filters.field))&&(!filters.from||r.uploadedAt.slice(0,10)>=filters.from)&&(!filters.to||r.uploadedAt.slice(0,10)<=filters.to));}
 function redraw(){result.replaceChildren(V2Dossier.recordTable(entry,'audit','修改记录',auditFields,filtered(),null,{sortable:true,omitOperation:ctx.entity==='safety-valve'||ctx.entity==='organization'||ctx.entity==='person'||ctx.entity==='product',pageSizes:[1,5,10,20],renderActions:record=>button('详情','row-action',()=>{
 if(ctx.disposed)return;const table=result.firstChild;const detail=el('div','more-record-view'),dl=el('dl','more-record-fields');for(const label of auditFields){const item=el('div');item.append(el('dt','',label),el('dd','',String(record[label]??'—')));dl.append(item);}detail.append(button('‹ 返回记录列表','secondary',()=>result.replaceChildren(table)),dl);result.replaceChildren(detail);
 })}));}
 const reset=button('⟳ 重置','secondary',()=>{form.reset();Object.assign(filters,{actor:'',field:'',from:'',to:''});st.selected.clear();st.page=1;st.sortKey=null;error.textContent='';redraw();});
 actions.append(submit,reset);form.append(grid,actions,error);form.onsubmit=e=>{e.preventDefault();if(start.value&&end.value&&start.value>end.value){error.textContent='上传时间：开始日期不能晚于结束日期';return;}Object.assign(filters,{actor:controls.actor.value.trim(),field:controls.field.value.trim(),from:start.value,to:end.value});error.textContent='';st.page=1;st.selected.clear();redraw();};
 root.append(form,result);redraw();
}
function open(name,type,row,show){
 if(!V2.types[type]||!row||!V2.fixtures[type].some(r=>r.id===row.id))throw Error('设备弹窗上下文无效');
 const root=el('div','more-dialog-view');root.dataset.type=type;root.dataset.record=row.id;root.dataset.entity=V2.types[type].entity||'equipment';
 const ctx={type,row,root,entity:V2.types[type].entity||'equipment',entry:{type,row,tables:{}},disposed:false};
 const view=name==='智慧监管码'?{title:name,mode:'regulator-dialog',render:regulator}:name==='检验信息'?{title:'历史检验信息',mode:'inspection-dialog',render:inspection}:{title:'历史修改记录',mode:'audit-dialog',render:audit};
 view.render(ctx);show(view.title,root,'more-dialog '+view.mode,()=>{ctx.disposed=true;for(const canvas of root.querySelectorAll('canvas')){canvas.width=0;canvas.height=0;}root.replaceChildren();ctx.entry.tables={};});
}
return {open,qrPayload,auditRows,flowFields,delayFields,auditFields};
})();
/* Elevator-only dialogs. Changes live only in the current page's fictional fixtures. */
window.V2ElevatorMore=(()=>{
'use strict';
const U=()=>V2QueryResults;
const supervision=['安装监检','改造监检','大修监检'],natures=V2EquipmentSchema.elevatorEnums.inspectionTestingNature;
const fields=[
 ['installationInspectionDate','安装监检日期','date',true],['alterationInspectionDate','改造监检日期','date'],['majorRepairInspectionDate','大修监检日期','date'],
 ['lastSupervisionInspectionType','最后一次监督检验类型','select',true,supervision],['baseYear','基准年','year',true],['baseMonth','基准月','select',true,Array.from({length:12},(_,i)=>(i+1)+'月')],
 ['age','梯龄','readonly'],['nextInspection','下次检验日期','date'],['nextTestingDate','下次检测日期','date'],
 ['inspectionTestingNature','当前检验检测性质','select',false,natures],['informationConfirmation','信息确认状态','select',false,['未确认','已确认']]
];
const columns=[['reportNumber','检测报告编号'],['conclusion','检测结论'],['date','检测日期'],['nextDate','下次检测日期'],['organization','检测机构'],['inspector','检测人员']].map(([key,label])=>({key,label,width:210}));
function menuItems(type){return type==='elevator'?['智慧监管码','检验信息','检测信息','检验检测更正','修改记录']:['智慧监管码','检验信息','修改记录'];}
function dateValid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
function records(row){return (row.testingRecords||[]).filter(r=>r.equipmentId===row.id).map(r=>({...r}));}
function initial(row,key){if(key==='informationConfirmation')return row[key]??'未确认';if(key==='baseMonth'){const n=Number.parseInt(row[key],10);return n>=1&&n<=12?n+'月':'';}return row[key]??'';}
function patch(row,values){
 const result={};
 for(const [key,label,type,required,options]of fields){if(type==='readonly')continue;const v=String(values[key]??'').trim();
 if(required&&!v)throw Error('请填写'+label);
 if(type==='date'&&v&&!dateValid(v))throw Error(label+'格式无效');
 if(type==='year'&&v&&(!/^\d{4}$/.test(v)||Number(v)<1000||Number(v)>9999))throw Error('基准年应为四位有效年份');
 if(type==='select'&&v&&!options.includes(v))throw Error(label+'选项无效');
 if(key==='inspectionTestingNature'&&!v&&row[key]&&!natures.includes(row[key]))throw Error('当前档案性质不在本轮字典中，请明确选择当前检验检测性质后保存');
 result[key]=type==='year'&&v?Number(v):v;
 }return result;
}
function open(name,row,api){
 if(!['检测信息','检验检测更正'].includes(name))throw Error('不支持的电梯操作');
 if(!V2.fixtures.elevator.some(r=>r===row))throw Error('电梯上下文无效');
 const {el,button}=U(),root=el('div','elevator-more-view');root.dataset.record=row.id;
 root.append(el('p','notice','设备：'+row.equipmentCode+' · 演示模式：更正仅作用于当前前端会话，刷新后不保留；不生成法定报告或推算检验、检测周期。'));
 const footer=el('div','elevator-dialog-actions');
 if(name==='检测信息'){
 const facts=el('div','elevator-three-grid');
 for(const [key,label]of [['unit','使用单位名称'],['category','设备类别'],['registrationCode','设备注册代码'],['status','使用状态'],['registration','注册状态']]){
 const wrap=el('label','elevator-form-field',label),select=['category','status','registration'].includes(key),input=el(select?'select':'input','control');if(select){const common=V2EquipmentSchema.optionsFor('elevator',{key,label});for(const value of common?['',...common]:[String(row[key]??'')]){const o=el('option','',value||'请选择');o.value=value;input.append(o);}input.value=String(row[key]??'');input.disabled=true;}else{input.value=String(row[key]??'');input.readOnly=true;}input.setAttribute('aria-label',label);wrap.append(input);facts.append(wrap);
 }root.append(facts);
 const group=el('details','dossier-group');group.open=true;group.append(el('summary','','已完成检测信息'));
 group.append(U().table({title:'已完成检测信息',columns,rows:records(row),st:U().state(),actions:r=>[button('只读','row-action',()=>{api.announce('仅展示当前电梯已关联的前端检测记录，不提供真实报告');})],emptyText:'暂无数据'}));root.append(group);
 footer.append(button('确认','primary',api.close),button('取消','secondary',api.close));root.append(footer);api.show('检测信息',root,'elevator-dialog');return;
 }
 const form=el('form'),grid=el('div','elevator-three-grid'),inputs={};
 for(const [key,label,type,required,options]of fields){
 const wrap=el('label','elevator-form-field');if(required)wrap.append(el('span','required-mark','*'));wrap.append(document.createTextNode(label));
 const input=el(type==='select'?'select':'input','control');input.setAttribute('aria-label',label);
 if(type==='select'){for(const v of ['',...options]){const o=el('option','',v||'请选择');o.value=v;input.append(o);}}
 else input.type=type==='date'?'date':type==='year'?'number':'text';
 if(type==='year'){input.min='1000';input.max='9999';input.step='1';}
 if(type==='readonly'){input.readOnly=true;input.setAttribute('aria-readonly','true');}
 input.value=initial(row,key);inputs[key]=input;wrap.append(input);grid.append(wrap);
 }
 const error=el('p','form-error');error.setAttribute('role','alert');form.noValidate=true;
 const save=el('button','primary','保存');save.type='submit';footer.append(save,button('取消','secondary',api.close));
 form.append(grid,error,footer);form.onsubmit=e=>{e.preventDefault();try{const changes=patch(row,Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));Object.assign(row,changes);api.close();api.refresh();api.announce('已更新当前前端演示会话，未写入服务器；不代表法定准用结论');}catch(e){error.textContent=e.message;}};
 root.append(form);api.show('检验检测基础信息',root,'elevator-dialog');
}
return {open,menuItems,fields,columns,records,patch,dateValid};
})();






