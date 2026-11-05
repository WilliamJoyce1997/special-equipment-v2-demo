/* Person demo: references existing fictional organizations; no persistence or external APIs. */
window.V2Personnel=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
const columns=[['name','姓名',170],['ndt','无损检测人员',170],['identity','证件号码',240],['unitName','单位名称',330],['regionCode','地区代码',220],['postalCode','邮政编码',160],['phone','电话',190],['mobile','手机',190],['source','数据来源',230]].map(([key,label,width])=>({key,label,width,type:'text',sortable:true}));
const q=(key,label,options)=>({key,label,type:options?'select':'text',options:options||[],placeholder:key==='search'?'请输入姓名、身份证号、单位名称':'请输入'});
const sources=['手工演示样本','模拟导入样本'],statuses=['演示未持证','演示资料待核'];
const organization=person=>V2InspectionUnits.rows.find(u=>u.id===person.unitId);
const rows=V2InspectionUnits.rows.slice(0,4).map((unit,i)=>{
 const person={id:'DEMO-PERSON-00'+(i+1),name:'演示人员'+['甲','乙','丙','丁'][i],sex:i%2?'女':'男',identity:'DEMO-ID-PERSON-00'+(i+1),birthDate:'199'+i+'-01-01',archiveNumber:'DEMO-ARCHIVE-00'+(i+1),ndt:i%2?'否':'是',unitId:unit.id,phone:'DEMO-PHONE-00'+(i+1),mobile:'DEMO-MOBILE-00'+(i+1),source:sources[i%2],certificateStatus:statuses[i<2?0:1],position:['演示无损检测岗','演示检验岗','演示试验岗','演示资料岗'][i],education:'演示学历资料',qualifications:[],auditRecords:[]};
 for(const [key,orgKey] of [['unitName','name'],['unitAddress','address'],['unitPhone','phone'],['unitPostalCode','postalCode'],['region','region'],['regionCode','regionCode']])Object.defineProperty(person,key,{enumerable:true,get:()=>organization(person)?.[orgKey]??''});
 person.postalCode='DEMO-POST-00'+(i+1);return person;
});
V2.fixtures.personnel=rows;
V2.types.personnel={title:'人员信息管理',entity:'person',implemented:true,columns,searchKeys:['name','identity','unitName'],queries:[q('search','综合查询'),q('region','所在地区',[...new Set(rows.map(r=>r.region))]),q('certificateStatus','持证状态',statuses),q('source','数据来源',sources)],actions:['导入','导出'],rowActions:[['编辑','person-edit'],['资格','person-qualification'],['修改记录','person-audit']],operationWidth:270,pageSizes:[2,5,10,20],exportAllColumns:true};
const infoFields=[
 ['name','姓名','text',true],['sex','性别','select',true],
 ['identity','身份证','text',true],['birthDate','出生年月','date'],
 ['archiveNumber','档案编号'],['ndt','无损检测人员','radio'],
 ['regionCode','地区代码','select',true,true],
 ['unitName','单位名称','unit',true],['unitAddress','单位地址'],
 ['unitPostalCode','邮政编码（单位）'],['unitPhone','单位联系电话'],
 ['position','职务'],['title','职称','select'],['education','学历','select'],['college','毕业院校'],
 ['major','所学专业'],['homeAddress','联系地址'],['postalCode','邮政编码（住址）'],['phone','个人电话'],
 ['fax','传真'],['mobile','手机号码'],['responsibility','负责工作'],['inspectionStartDate','从事检验工作时间','date'],
 ['email','电子邮箱','text',false,true],['remarks','备注','textarea',false,true]
];
function edit(person,show){
 const root=el('div','person-info');root.dataset.personId=person.id;
 root.append(el('h2','person-heading','检验检测人员信息'),el('p','more-context-note','演示模式，仅供查看。全部为虚构人员资料，未接通保存；单位资料通过单位ID关联，未提供字段留空。'));
 const grid=el('div','unit-info-grid person-info-grid');
 for(const [key,name,kind='text',required=false,wide=false] of infoFields){
 const field=el('div','unit-info-field person-info-field'+(wide?' full-width':'')),label=el('label');
 if(required){const star=el('span','required-mark','*');star.setAttribute('aria-hidden','true');label.append(star)}label.append(document.createTextNode(name));
 const id='person-info-'+key,value=person[key]??'';label.htmlFor=id;
 if(kind==='radio'){
 const group=el('div','person-radio');group.id=id;group.setAttribute('role','group');group.setAttribute('aria-label',name);
 for(const option of ['是','否']){const l=el('label'),input=el('input');input.type='radio';input.name='person-ndt';input.disabled=true;input.checked=value===option;l.append(input,document.createTextNode(option));group.append(l)}field.append(label,group);
 }else{
 const input=el(kind==='select'?'select':kind==='textarea'?'textarea':'input','control unit-info-control');input.id=id;input.setAttribute('aria-label',name);
 if(kind==='select'){const option=el('option','',value||'请选择');option.value=value;input.append(option);input.disabled=true;}
 else{if(kind!=='textarea')input.type=kind==='date'?'date':'text';input.readOnly=true;input.value=value;if(kind==='textarea')input.rows=2;}
 if(kind==='unit'){const wrapper=el('div','person-unit-select'),choose=button('选择','secondary',()=>{});choose.disabled=true;choose.title='只读演示，不支持更换所属单位';wrapper.append(input,choose);field.append(label,wrapper)}else field.append(label,input);
 }
 grid.append(field);
 }root.append(grid);show('编辑人员基本信息',root,'organization-dialog person-dialog');
}
const qualificationFields=['申请类别','资格类别','持证状态','批准项目','证书编号','批准日期','有效日期','考核机构'];
const qualificationQueries=[q('application','申请类别',['演示首次申请','演示延续申请']),q('status','持证状态',statuses),q('project','批准项目',['演示项目A','演示项目B']),q('category','资格类别',['演示检验类别','演示无损检测类别']),q('level','持证级别',['演示一级','演示二级']),q('certificate','证书编号')];
function qualification(person,show){
 const root=el('div','person-qualification');root.dataset.personId=person.id;
 root.append(el('p','more-context-note','当前人员：'+person.name+' · 个人资格演示，无法定执业证明效力；与所属单位资质分开管理。'));
 const form=el('form','person-qualification-query panel'),grid=el('div','query-grid'),controls={};
 for(const f of qualificationQueries){const field=el('div','field'),label=el('label','',f.label),input=el(f.type==='select'?'select':'input','control');input.setAttribute('aria-label',f.label);
 if(f.type==='select'){for(const value of ['',...f.options]){const option=el('option','',value||'请选择');option.value=value;input.append(option)}}else{input.type='text';input.placeholder='请输入'}
 controls[f.key]=input;label.append(input);field.append(label);grid.append(field);
 }
 const actions=el('div','query-actions'),submit=el('button','primary','查询');submit.type='submit';actions.append(submit,button('重置','secondary',()=>{form.reset();entry.tables={};redraw()}));form.append(grid,actions);
 const toolbar=el('div','more-table-toolbar');for(const name of ['新增','删除']){const b=button(name,'more-disabled',()=>{});b.disabled=true;b.title='演示模式暂不支持'+name;toolbar.append(b)}toolbar.append(el('span','','演示模式不支持修改或保存真实资格记录'));
 const entry={type:'personnel',row:person,tables:{}},result=el('div','person-qualification-result');
 function redraw(){
 const mapping={application:'申请类别',status:'持证状态',project:'批准项目',category:'资格类别',level:'持证级别',certificate:'证书编号'};
 const records=person.qualifications.filter(r=>r.personId===person.id&&Object.entries(controls).every(([k,c])=>!c.value||(k==='certificate'?String(r[mapping[k]]??'').includes(c.value.trim()):r[mapping[k]]===c.value)));
 result.replaceChildren(V2Dossier.recordTable(entry,'person-qualifications','个人资格记录',qualificationFields,records,null,{sortable:true,emptyText:'暂无数据'}));
 }
 form.onsubmit=e=>{e.preventDefault();entry.tables={};redraw()};root.append(form,toolbar,result);redraw();show('资格信息',root,'more-dialog organization-dialog person-dialog');
}
function action(kind,person,show){
 if(!rows.some(r=>r.id===person.id))throw Error('人员上下文无效');
 if(kind==='person-edit')edit(person,show);else if(kind==='person-qualification')qualification(person,show);else if(kind==='person-audit')V2MoreDialogs.open('修改记录','personnel',person,show);
}
return {rows,columns,infoFields,qualificationFields,qualificationQueries,action};
})();

