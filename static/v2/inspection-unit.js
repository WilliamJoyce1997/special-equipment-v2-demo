/* Inspection organizations: fictional front-end records only. */
window.V2InspectionUnits=(()=>{
'use strict';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const columns=[['name','单位名称',300],['address','单位地址',300],['creditCode','社会统一信用代码',230],['regionCode','地区代码',180],['level','单位级别',160],['phone','电话',190],['legalPerson','法定代表人',180],['enabled','是否启用',140]].map(([key,label,width])=>({key,label,width,type:'text',sortable:true}));
const enums={
 level:['国家级','省级','地市级','区县级','乡镇级'],
 inspectionInstitutionType:['专管','兼管'],projectKind:['检验人员','无损检验人员'],
 technicalDirectorTitle:['高级','中级','初级','会计员','经济师','未评定'],
 economicType:['内资','港澳台资','国外投资','个体经营','其他'],
 affiliation:['独立','派出'],organizationNature:['企业单位','事业单位','行政机关','社会团体','其他'],
 organizationStatus:['正常','停产/停业','注销','无效'],
 application:['首次','换证','增项','换证及增项'],certificateStatus:['有效','到期','注销','申请'],
 overdue:['是','否']
};
const q=(key,label,type='text',disabled=false)=>({key,label,type,options:enums[key]||[],disabled,placeholder:'请输入'});
function regionText(province,area){
 const p=V2BoilerSchema.regions.find(p=>p.code===province);if(!p)return '';
 for(const city of p.children||[]){
  if(city.code===area)return p.name+' / '+city.name;
  const district=city.children?.find(a=>a.code===area);
  if(district)return [p.name,...(['市辖区','县'].includes(city.name)?[]:[city.name]),district.name].join(' / ');
 }
 return area?'':p.name;
}
const rows=['云岚','星河','青禾','远岑'].map((name,i)=>{
 const province='53',area=i%2?'5303':'5301',region=regionText(province,area);
 const row={id:'DEMO-ORG-00'+(i+1),name:'DEMO-'+name+'检验示范单位（虚构）',address:'演示'+name+'示范路'+(i+1)+'号（虚构地址）',creditCode:'DEMO-CREDIT-00'+(i+1),
 province,area,region,regionCode:region,level:i%2?'地市级':'省级',inspectionInstitutionType:i%2?'兼管':'专管',
 phone:'DEMO-TEL-00'+(i+1),legalPerson:'演示法人'+['甲','乙','丙','丁'][i],enabled:i===1?'否':'是',contact:'演示联系人'+['甲','乙','丙','丁'][i],overdue:i<2?'是':'否',qualifications:[]};
 row.auditRecords=[{id:row.id+'-audit-1',entityType:'organization',entityId:row.id,'修改人姓名':'演示单位资料员'+(i+1),'所在部门':'虚构单位档案组','字段名称':'单位名称','修改类型':'预置模拟记录','字段代码':'name','修改前值':'DEMO-'+name+'筹备单位（虚构）','修改后值':row.name,'修改日期':'2026-10-01','账号':'demo_org_'+(i+1),uploadedAt:'2026-10-01 09:00:00'}];
 return row;
});
const storageKey='v2:inspection-units:v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function readStored(){
 const raw=localStorage.getItem(storageKey);if(!raw)return null;
 const value=JSON.parse(raw);
 if(value.version!==1||!Array.isArray(value.rows)||value.rows.some(r=>typeof r.id!=='string'||!r.id.startsWith('DEMO-ORG-')||typeof r.name!=='string'||!Array.isArray(r.qualifications))||new Set(value.rows.map(r=>r.id)).size!==value.rows.length)throw Error('检验单位本地数据格式无效');
 for(const row of value.rows)if(row.qualifications.some(q=>q.unitId!==row.id)||new Set(row.qualifications.map(q=>q.id)).size!==row.qualifications.length)throw Error('资质关联数据无效');
 return value.rows;
}
try{const saved=readStored();if(saved)rows.splice(0,rows.length,...saved);}catch{}
function mutate(change){
 let next;
 try{next=clone(readStored()||rows);}catch{throw Error('检验单位本地数据无法读取，请检查浏览器存储。');}
 change(next);
 try{localStorage.setItem(storageKey,JSON.stringify({version:1,rows:next}));}
 catch{throw Error('保存失败，请检查浏览器本地存储权限或可用空间。');}
 const current=new Map(rows.map(row=>[row.id,row]));
 rows.splice(0,rows.length,...next.map(row=>Object.assign(current.get(row.id)||{},row)));
}
const base=[q('name','单位名称'),q('creditCode','统一社会信用代码'),q('region','所在地区','region'),q('contact','单位联系人'),q('overdue','是否超期','select')];
const advanced=[
 q('level','单位级别','select'),q('inspectionInstitutionType','检验检测机构类型','select'),q('projectKind','核准项目种类','select'),
 q('projectCategory','核准项目类别','select',true),q('projectLevel','核准项目级别','select',true),q('certificate','证书编号'),
 q('issuedDate','发证日期','dateRange'),q('validUntil','有效期至','dateRange')
];
const qualificationFilterKeys=new Set(['projectKind','certificate','issuedDate_min','issuedDate_max','validUntil_min','validUntil_max']);
const qualificationValue={projectKind:'核准项目种类',certificate:'证书编号',issuedDate:'发证日期',validUntil:'有效期至'};
function matches(row,filters){
 function compare(actual,key,raw){
  const value=String(raw??'').trim();if(!value)return true;
  if(actual==null||actual==='')return false;
  if(key.endsWith('_min'))return String(actual)>=value;
  if(key.endsWith('_max'))return String(actual)<=value;
  return enums[key]?actual===value:String(actual).toLowerCase().includes(value.toLowerCase());
 }
 const active=Object.entries(filters).filter(([,value])=>String(value??'').trim());
 if(!active.filter(([k])=>!qualificationFilterKeys.has(k)).every(([key,value])=>{
  if(key==='province')return row.province===value;
  if(key==='area')return String(row.area||'').startsWith(value);
  return compare(row[key],key,value);
 }))return false;
 const conditions=active.filter(([key])=>qualificationFilterKeys.has(key));
 return !conditions.length||row.qualifications.some(record=>record.unitId===row.id&&conditions.every(([key,value])=>compare(record[qualificationValue[key.replace(/_(min|max)$/,'')]],key,value)));
}
function valid(filters){
 for(const f of [...base,...advanced]){
  if(f.disabled&&filters[f.key])return f.label+'不可操作';
  if(f.type==='select'&&filters[f.key]&&!f.options.includes(filters[f.key]))return f.label+'选项无效';
  if(f.type==='dateRange'&&filters[f.key+'_min']&&filters[f.key+'_max']&&filters[f.key+'_min']>filters[f.key+'_max'])return f.label+'下限不能大于上限';
 }
 return '';
}
const schema={base,advanced,matches,valid};
V2.types['inspection-unit']={title:'检验单位',entity:'organization',implemented:true,columns,queries:base,actions:['删除','导出'],rowActions:[['编辑','organization-edit'],['更多>>','organization-menu']],operationWidth:240,defaultPageSize:10,pageSizes:[2,5,10,20],exportAllColumns:true};
V2.fixtures['inspection-unit']=rows;
function confirmation(title,message,onConfirm,show,api){
 const root=el('div'),error=el('p','form-error'),actions=el('div','boiler-modal-actions');
 root.append(el('p','notice',message),error,actions);
 actions.append(button('确认删除','primary',()=>{try{onConfirm();api.close();api.refresh?.();}catch(e){error.textContent=e.message;}}),button('取消','secondary',api.close));
 show(title,root,'compact-dialog');
}
function removeUnits(ids,api){
 if(!ids.length){api.announce('请先选择需要删除的检验单位');return;}
 confirmation('确认删除检验单位','确认删除选中的 '+ids.length+' 条检验单位及其资质记录？',()=>{
  mutate(records=>{const targets=new Set(ids);for(let i=records.length-1;i>=0;i--)if(targets.has(records[i].id))records.splice(i,1);});
 },api.show,api);
}
let closeMenu=()=>{};
function menu(trigger,row,show,api={}){
 const existing=document.getElementById('organization-more-menu'),same=existing?.dataset.unitId===row.id;closeMenu();if(same)return;
 const pop=el('div','record-more-menu');pop.id='organization-more-menu';pop.dataset.unitId=row.id;pop.setAttribute('popover','manual');pop.setAttribute('role','menu');
 const controller=new AbortController(),tr=trigger.closest('tr');tr.classList.add('organization-menu-active');
 function cleanup(){controller.abort();tr.classList.remove('organization-menu-active');if(pop.matches(':popover-open'))pop.hidePopover();pop.remove();closeMenu=()=>{};}
 closeMenu=cleanup;
 for(const name of ['修改记录','资质']){const b=button(name,'',()=>{cleanup();trigger.focus();if(name==='修改记录')V2MoreDialogs.open(name,'inspection-unit',row,show);else qualification(row,show,api)});b.setAttribute('role','menuitem');pop.append(b);}
 document.body.append(pop);const r=trigger.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(r.right+8,innerWidth-226))+'px';pop.style.top=Math.max(8,Math.min(r.top,innerHeight-150))+'px';pop.showPopover();
 document.addEventListener('pointerdown',e=>{if(!pop.contains(e.target)&&!trigger.contains(e.target))cleanup()},{signal:controller.signal});
 document.addEventListener('scroll',e=>{if(!pop.contains(e.target))cleanup()},{capture:true,signal:controller.signal});window.addEventListener('resize',cleanup,{signal:controller.signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){cleanup();trigger.focus()}},{signal:controller.signal});
}
const unitInfoFields=[
 ['institutionCategory','机构类别','select'],['validUntil','有效日期','date'],
 ['name','单位名称','text',true],['creditCode','社会统一信用代码','text',true],
 ['regionCode','地区代码','select',true],['address','单位地址'],
 ['qualityIndustryCreditCode','质检行业统一社会信用代码'],['legalPerson','法定代表人'],
 ['postalCode','邮政编码'],['phone','单位电话'],['fax','单位传真'],['email','电子信箱'],
 ['website','单位网址'],['businessRegistrationAuthority','营业执照登记机构'],
 ['businessRegistrationNumber','营业执照注册号'],['publicInstitutionAuthority','事业单位法人登记管理机关'],
 ['publicInstitutionCertificate','事业单位法人证书编号'],['establishedDate','单位成立日期','date'],
 ['workStartDate','开始工作日期','date'],['registeredCapital','注册资金（万元）','number'],
 ['fixedAssets','固定资产（万元）','number'],['inspectionEquipmentValue','检验（试验）设备价值（万元）','number'],
 ['staffCount','总人数','number'],['inspectorCount','检验人员数','number'],
 ['ndtStaffCount','无损检测人员数','number'],['testStaffCount','试验人员数','number'],
 ['technicalDirector','技术负责人'],['technicalDirectorTitle','技术负责人职称','select'],
 ['industry','所属行业','select'],['economicType','经济类型','select'],
 ['inspectionInstitutionType','检验检测机构类型','select'],['affiliation','隶属关系','select'],
 ['organizationNature','单位性质','select'],['level','单位级别','select'],
 ['organizationStatus','状态','select'],['statusChangedDate','状态变更日期','date'],
 ['remarks','备注','textarea'],['createdAt','创建时间','metadata'],['createdBy','创建人','metadata'],
 ['updatedAt','最后修改时间','metadata'],['updatedBy','最后更新人','metadata']
];
function edit(row,show,api={}){
 const draft=clone(row),root=el('div','organization-edit');root.dataset.unitId=row.id;
 const grid=el('div','unit-info-grid'),controls={},error=el('p','form-error');
 for(const [key,name,type='text',required=false]of unitInfoFields){
  const item=el('div','unit-info-field'+(type==='textarea'?' full-width':'')+(type==='metadata'?' metadata':'')),label=el('label','',name);
  if(required)label.prepend(el('span','required-mark','*'));
  const id='unit-info-'+key;label.htmlFor=id;
  if(key==='regionCode'){
   const holder=V2EquipmentPage.control({key:'region',label:name,type:'region'},draft),cascade=holder.querySelector('.boiler-cascade');
   controls.province=cascade.querySelector('[name=province]');controls.area=cascade.querySelector('[name=area]');
   item.append(label,cascade);grid.append(item);continue;
  }
  if(name==='所属行业'){
   item.append(label,V2CommonFields.cascade(V2CommonFields.industry,name,draft.industry||'',value=>draft.industry=value,false));grid.append(item);continue;
  }
  const control=el(type==='select'?'select':type==='textarea'?'textarea':type==='metadata'?'span':'input',type==='metadata'?'unit-info-metadata':'control unit-info-control');
  control.id=id;control.setAttribute('aria-label',name);
  if(type==='metadata')control.textContent=draft[key]||'';
  else if(type==='select'){
   const values=enums[key]||[draft[key]].filter(Boolean);
   for(const value of ['',...values]){const option=el('option','',value||'请选择');option.value=value;control.append(option);}
   // Preserve older values that have not yet been classified.
   if(draft[key]&&!values.includes(draft[key])){const option=el('option','',draft[key]);option.value=draft[key];control.append(option);}
   control.value=draft[key]||'';
  }else{if(type!=='textarea')control.type=type;control.value=draft[key]??'';if(type==='textarea')control.rows=2;if(type==='number')control.min='0';}
  if(type!=='metadata')controls[key]=control;
  item.append(label,control);grid.append(item);
 }
 const actions=el('div','boiler-modal-actions');root.append(grid,error,actions);
 actions.append(button('保存','primary',()=>{
  for(const [key,input]of Object.entries(controls))draft[key]=input.value;
  for(const [key,name,,required]of unitInfoFields)if(required&&key!=='regionCode'&&!String(draft[key]||'').trim()){error.textContent='请填写'+name;return;}
  const region=regionText(draft.province,draft.area);
  if(!draft.province||!draft.area||!region){error.textContent='请选择地区代码';return;}
  for(const [key,input]of Object.entries(controls)){
   if(input.type==='number'&&input.value!==''&&(!Number.isFinite(Number(input.value))||Number(input.value)<0)){error.textContent='数值字段应为非负数';return;}
   if(enums[key]&&draft[key]&&!enums[key].includes(draft[key])&&draft[key]!==row[key]){error.textContent='请选择有效选项';return;}
  }
  try{
   draft.region=draft.regionCode=region;
   mutate(records=>{const target=records.find(r=>r.id===row.id);if(!target)throw Error('该单位已删除');Object.assign(target,draft,{qualifications:target.qualifications,updatedAt:new Date().toISOString()});});
   api.close();api.refresh?.();
  }catch(e){error.textContent=e.message;}
 }),button('关闭','secondary',()=>api.close()));
 show('检验单位信息',root,'organization-dialog unit-info-dialog');
}
const qualificationFields=['申请类别','核准项目种类','证书编号','发证机构','发证日期','有效期至','核准证状态'];
function childDialog(title){
 const dialog=el('dialog','organization-dialog qualification-info-dialog'),header=el('div','dialog-header'),body=el('div','qualification-info-body');
 const before=document.activeElement;
 function close(){dialog.close();dialog.remove();if(before?.isConnected)before.focus();}
 const x=button('×','icon-button',close);x.setAttribute('aria-label','关闭子弹窗');header.append(el('h2','',title),x);dialog.append(header,body);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 document.body.append(dialog);dialog.showModal();return {dialog,body,close};
}
function qualificationInfo(row,onSave){
 const shell=childDialog('资质信息'),form=el('div','unit-info-grid'),error=el('p','form-error'),controls={};
 const definitions=[
 ['application','申请类别','select',true],['projectKind','核准项目种类','select',true],['certificate','证书编号','text',true,true],
 ['approvalAuthority','审批机关','text',true],['validUntil','有效期至','date'],['issuingAuthority','发证机关','text',true],['issuedDate','发证日期','date',true],
 ['certificateStatus','核准证状态','select',true,true]
 ];
 for(const [key,label,type,required,wide]of definitions){
  const item=el('label','unit-info-field'+(wide?' full-width':'')),caption=el('span','',label),input=el(type==='select'?'select':'input','control');
  if(required)caption.prepend(el('span','required-mark','*'));input.setAttribute('aria-label',label);
  if(type==='select')for(const value of ['',...enums[key]]){const option=el('option','',value||'请选择');option.value=value;input.append(option);}
  else input.type=type;
  item.append(caption,input);form.append(item);controls[key]=input;
 }
 const details=[],holder=el('div','qualification-detail-table');
 function drawDetails(){
  const table=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');
  for(const name of ['许可项目类别','许可项目级别','许可项目品种','备注','操作'])tr.append(el('th','',name));head.append(tr);
  for(const [i,row]of details.entries()){
   const tr=el('tr');
   for(const key of ['category','level','variety','remarks']){const td=el('td'),input=el('input','control');input.setAttribute('aria-label','许可项目'+(i+1)+' '+key);input.value=row[key]||'';input.oninput=()=>row[key]=input.value;td.append(input);tr.append(td);}
   const td=el('td');td.append(V2ActionIcons.prepend(button('删除','link',()=>{details.splice(i,1);drawDetails();}),'delete'));tr.append(td);body.append(tr);
  }
  if(!details.length){const td=el('td','empty','暂无数据');td.colSpan=5;const tr=el('tr');tr.append(td);body.append(tr);}
  table.append(head,body);const columns=['许可项目类别','许可项目级别','许可项目品种','备注'].map(label=>({key:label,label,width:190}));V2TableSettings.decorate(table,'unit/inspection-unit/qualification-license-details',columns,0,1);const settingsBar=el('div','table-toolbar');settingsBar.append(button('设置','link',()=>V2TableSettings.open('unit/inspection-unit/qualification-license-details',columns,drawDetails)));const add=V2ActionIcons.prepend(button('','qualification-detail-add',()=>{details.push({});drawDetails();}),'add');add.setAttribute('aria-label','新增许可项目明细');holder.replaceChildren(settingsBar,table,add);
 }
 drawDetails();
 const remarks=el('textarea','control');remarks.setAttribute('aria-label','备注');
 const remarkLabel=el('label','unit-info-field full-width','备注');remarkLabel.append(remarks);
 const actions=el('div','boiler-modal-actions');
 actions.append(button('保存','primary',()=>{
  const values=Object.fromEntries(Object.entries(controls).map(([k,input])=>[k,input.value.trim()]));
  for(const [key,label,,required]of definitions)if(required&&!values[key]){error.textContent='请填写'+label;return;}
  if(values.validUntil&&values.validUntil<values.issuedDate){error.textContent='有效期至不能早于发证日期';return;}
  if(details.some(d=>!d.category?.trim()||!d.level?.trim()||!d.variety?.trim())){error.textContent='请填写许可项目类别、级别和品种';return;}
  try{
   mutate(records=>{
    const owner=records.find(r=>r.id===row.id);if(!owner)throw Error('所属单位已删除');
    if(owner.qualifications.some(q=>q['证书编号']===values.certificate))throw Error('当前单位已存在该证书编号');
    owner.qualifications.push({id:'DEMO-QUAL-'+crypto.randomUUID(),unitId:row.id,
     '申请类别':values.application,'核准项目种类':values.projectKind,'证书编号':values.certificate,'审批机关':values.approvalAuthority,
     '有效期至':values.validUntil,'发证机构':values.issuingAuthority,'发证日期':values.issuedDate,'核准证状态':values.certificateStatus,
     details:clone(details),'备注':remarks.value});
   });
   shell.close();onSave();
  }catch(e){error.textContent=e.message;}
 }),button('关闭','secondary',shell.close));
 shell.body.append(form,holder,remarkLabel,error);
 const footer=el('div','dialog-footer');footer.append(actions);shell.dialog.append(footer);
}
function qualification(row,show,api={}){
 const root=el('div','organization-qualification');root.dataset.unitId=row.id;
 root.append(el('p','more-context-note','当前单位：'+row.name+' · 虚构演示资质'));
 const form=el('form','qualification-query'),category=el('select','control'),certificate=el('input','control'),date=el('input','control');
 for(const value of ['',...enums.application]){const option=el('option','',value||'请选择');option.value=value;category.append(option);}
 certificate.type='text';date.type='date';
 for(const [name,input]of [['申请类别',category],['证书编号',certificate],['发证日期',date]]){const label=el('label','',name);input.setAttribute('aria-label',name);label.append(input);form.append(label);}
 const search=el('button','primary','查询');search.type='submit';form.append(search);
 const tools=el('div','more-table-toolbar'),error=el('p','form-error'),result=el('div','qualification-result'),entry={type:'inspection-unit',row,tables:{}};
 function draw(){
  const owner=rows.find(r=>r.id===row.id);
  const records=(owner?.qualifications||[]).filter(r=>r.unitId===row.id&&(!category.value||r['申请类别']===category.value)&&(!certificate.value||r['证书编号'].includes(certificate.value.trim()))&&(!date.value||r['发证日期']===date.value));
  result.replaceChildren(V2Dossier.recordTable(entry,'qualifications','资质记录',qualificationFields,records,null,{sortable:true,omitOperation:true,emptyText:'暂无数据'}));
 }
 tools.append(V2ActionIcons.prepend(button('新增','secondary',()=>qualificationInfo(row,()=>{entry.tables={};draw();})),'add'),V2ActionIcons.prepend(button('删除','secondary',()=>{
  const selected=entry.tables.qualifications?.selected||new Set();
  if(!selected.size){error.textContent='请先选择需要删除的资质';return;}
  const ids=new Set(selected),shell=childDialog('确认删除资质'),message=el('p','notice','确认删除选中的 '+ids.size+' 条资质？'),failure=el('p','form-error');
  shell.body.append(message,failure,button('确认删除','primary',()=>{
   try{mutate(records=>{const owner=records.find(r=>r.id===row.id);if(!owner)throw Error('所属单位已删除');owner.qualifications=owner.qualifications.filter(q=>!ids.has(q.id));});selected.clear();shell.close();draw();}
   catch(e){failure.textContent=e.message;}
  }),button('取消','secondary',shell.close));
 }),'delete'));
 const fetch=button('获取资质','more-disabled',()=>{});fetch.disabled=true;fetch.title='当前演示环境无外部资质数据接口';tools.append(fetch);
 form.onsubmit=e=>{e.preventDefault();entry.tables={};draw();};root.append(form,tools,error,result);draw();show('资质管理',root,'more-dialog organization-dialog');
}
return {rows,columns,enums,schema,regionText,storageKey,qualificationFields,menu,edit,removeUnits,closeMenu:()=>closeMenu()};
})();
