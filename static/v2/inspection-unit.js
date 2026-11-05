/* Inspection organizations: fictional front-end records only. */
window.V2InspectionUnits=(()=>{
'use strict';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const columns=[['name','单位名称',300],['address','单位地址',300],['creditCode','社会统一信用代码',230],['regionCode','地区代码',180],['level','单位级别',160],['phone','电话',190],['legalPerson','法定代表人',180],['enabled','是否启用',140]].map(([key,label,width])=>({key,label,width,type:'text',sortable:true}));
const q=(key,label,options)=>({key,label,type:options?'select':'text',options:options||[],allLabel:key==='overdue'?'全部':undefined,placeholder:'请输入'});
const rows=['云岚','星河','青禾','远岑'].map((name,i)=>{
 const row={id:'DEMO-ORG-00'+(i+1),name:'DEMO-'+name+'检验示范单位（虚构）',address:'演示省'+name+'示范路'+(i+1)+'号（虚构地址）',creditCode:'DEMO-CREDIT-00'+(i+1),regionCode:'DEMO-REGION-00'+(i+1),level:i%2?'市级（演示）':'省级（演示）',phone:'DEMO-TEL-00'+(i+1),legalPerson:'演示法人'+['甲','乙','丙','丁'][i],enabled:i===1?'否':'是',contact:'演示联系人'+['甲','乙','丙','丁'][i],region:i%2?'演示省 / 星河市':'演示省 / 云岚市',overdue:i<2?'是':'否',qualifications:[]};
 row.auditRecords=[{id:row.id+'-audit-1',entityType:'organization',entityId:row.id,'修改人姓名':'演示单位资料员'+(i+1),'所在部门':'虚构单位档案组','字段名称':'单位名称','修改类型':'预置模拟记录','字段代码':'name','修改前值':'DEMO-'+name+'筹备单位（虚构）','修改后值':row.name,'修改日期':'2026-10-01','账号':'demo_org_'+(i+1),uploadedAt:'2026-10-01 09:00:00'}];
 return row;
});
V2.types['inspection-unit']={title:'检验单位',entity:'organization',implemented:true,columns,queries:[q('name','单位名称'),q('creditCode','统一社会信用代码'),q('region','所在地区',['演示省 / 云岚市','演示省 / 星河市']),q('contact','单位联系人'),q('overdue','是否超期',['是','否'])],actions:['删除','导出'],rowActions:[['编辑','organization-edit'],['更多>>','organization-menu']],operationWidth:240,pageSizes:[2,5,10,20],exportAllColumns:true};
V2.fixtures['inspection-unit']=rows;
let closeMenu=()=>{};
function menu(trigger,row,show){
 const existing=document.getElementById('organization-more-menu'),same=existing?.dataset.unitId===row.id;closeMenu();if(same)return;
 const pop=el('div','record-more-menu');pop.id='organization-more-menu';pop.dataset.unitId=row.id;pop.setAttribute('popover','manual');pop.setAttribute('role','menu');
 const controller=new AbortController(),tr=trigger.closest('tr');tr.classList.add('organization-menu-active');
 function cleanup(){controller.abort();tr.classList.remove('organization-menu-active');if(pop.matches(':popover-open'))pop.hidePopover();pop.remove();closeMenu=()=>{};}
 closeMenu=cleanup;
 for(const name of ['修改记录','资质']){const b=button(name,'',()=>{cleanup();trigger.focus();if(name==='修改记录')V2MoreDialogs.open(name,'inspection-unit',row,show);else qualification(row,show)});b.setAttribute('role','menuitem');pop.append(b);}
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
function edit(row,show){
 const root=el('div','organization-edit');root.dataset.unitId=row.id;
 root.append(el('p','more-context-note','演示模式，仅供查看。未接通编辑保存，不修改当前会话记录或数据库；未提供资料的字段留空。'));
 const grid=el('div','unit-info-grid');
 for(const [key,name,type='text',required=false] of unitInfoFields){
 const item=el('div','unit-info-field'+(type==='textarea'?' full-width':'')+(type==='metadata'?' metadata':'')),label=el('label');
 if(required){const mark=el('span','required-mark','*');mark.setAttribute('aria-hidden','true');label.append(mark)}label.append(document.createTextNode(name));
 const id='unit-info-'+key,value=row[key]??'';label.htmlFor=id;
 const control=el(type==='select'?'select':type==='textarea'?'textarea':type==='metadata'?'span':'input',type==='metadata'?'unit-info-metadata':'control unit-info-control');control.id=id;
 if(type==='metadata')control.textContent=value;
 else{control.setAttribute('aria-label',name);
 if(type==='select'){const option=el('option','',value||'请选择');option.value=value;control.append(option);control.disabled=true;}
 else{if(type!=='textarea')control.type=type;control.readOnly=true;control.value=value;if(type==='textarea')control.rows=2;}
 }
 item.append(label,control);grid.append(item);
 }
 root.append(grid);show('检验单位信息',root,'organization-dialog unit-info-dialog');
}
const qualificationFields=['申请类别','证书编号','发证机构','发证日期','有效期至'];
function qualification(row,show){
 const root=el('div','organization-qualification');root.dataset.unitId=row.id;
 root.append(el('p','more-context-note','当前单位：'+row.name+' · 仅展示当前单位的演示资质，无法定效力。是否超期为独立预设演示状态，不作为真实资质结论。'));
 const form=el('form','qualification-query'),category=el('select','control'),certificate=el('input','control'),date=el('input','control');
 for(const value of ['', '演示首次申请','演示延续申请']){const o=el('option','',value||'请选择');o.value=value;category.append(o)}certificate.type='text';date.type='date';
 for(const [name,input] of [['申请类别',category],['证书编号',certificate],['发证日期',date]]){const label=el('label','',name);input.setAttribute('aria-label',name);label.append(input);form.append(label)}
 const search=el('button','primary','查询');search.type='submit';form.append(search);
 const tools=el('div','more-table-toolbar');for(const [symbol,name] of [['⊕','新增'],['⊖','删除'],['⊕','获取资质']]){const b=button(name,'more-disabled',()=>{});b.prepend(el('span','qualification-icon',symbol+' '));b.setAttribute('aria-label',name);b.disabled=true;b.title='演示模式暂不支持'+name;tools.append(b)}tools.append(el('span','','演示模式不支持新增、删除或获取真实资质'));
 const result=el('div','qualification-result'),entry={type:'inspection-unit',row,tables:{}};
 function draw(){const records=row.qualifications.filter(r=>r.unitId===row.id&&(!category.value||r['申请类别']===category.value)&&(!certificate.value||r['证书编号'].includes(certificate.value.trim()))&&(!date.value||r['发证日期']===date.value));result.replaceChildren(V2Dossier.recordTable(entry,'qualifications','资质记录',qualificationFields,records,null,{sortable:true,emptyText:'暂无数据'}))}
 form.onsubmit=e=>{e.preventDefault();entry.tables={};draw()};root.append(form,tools,result);draw();show('资质管理',root,'more-dialog organization-dialog');
}
return {rows,columns,qualificationFields,menu,edit,closeMenu:()=>closeMenu()};
})();

