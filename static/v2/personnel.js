/* Personnel fixtures and browser-local Excel imports. */
window.V2Personnel=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
const columns=[['name','姓名',170],['ndt','无损检测人员',170],['identity','证件号码',240],['unitName','单位名称',330],['regionCode','地区代码',220],['postalCode','邮政编码',160],['phone','电话',190],['mobile','手机',190],['source','数据来源',230]].map(([key,label,width])=>({key,label,width,type:'text',sortable:true}));
const q=(key,label,options)=>({key,label,type:options?'select':'text',options:options||[],placeholder:key==='search'?'请输入姓名、身份证号、单位名称':'请输入'});
const sources=['第三方机构上传','MIS系统'],statuses=['已持证','待发证','已吊销','已注销','变更中','换证中','补证中','无效'];
const enums={sources,statuses,project:[],level:[],method:[]};
const organization=person=>V2InspectionUnits.rows.find(u=>u.id===person.unitId);
const roster=[
 ['DEMO-PERSON-001','DEMO-ORG-001','甲','演示无损检测岗'],
 ['DEMO-PERSON-002','DEMO-ORG-002','乙','演示检验岗'],
 ['DEMO-PERSON-003','DEMO-ORG-003','丙','演示试验岗'],
 ['DEMO-PERSON-004','DEMO-ORG-004','丁','演示资料岗']
];
const rows=roster.map(([id,unitId,name,position],i)=>{
 const person={id,name:'演示人员'+name,sex:i%2?'女':'男',identity:'DEMO-ID-PERSON-00'+(i+1),birthDate:'199'+i+'-01-01',archiveNumber:'DEMO-ARCHIVE-00'+(i+1),ndt:i%2?'否':'是',unitId,phone:'DEMO-PHONE-00'+(i+1),mobile:'DEMO-MOBILE-00'+(i+1),source:sources[i%2],certificateStatus:statuses[i<2?0:1],position,education:'演示学历资料',qualifications:[],auditRecords:[]};
 for(const [key,orgKey] of [['unitName','name'],['unitAddress','address'],['unitPhone','phone'],['unitPostalCode','postalCode'],['region','region'],['regionCode','regionCode'],['province','province'],['area','area']])Object.defineProperty(person,key,{enumerable:true,get:()=>organization(person)?.[orgKey]??''});
 person.postalCode='DEMO-POST-00'+(i+1);return person;
});
const fixtureCount=rows.length;
const importStorageKey='v2:personnel-import:v1';
const importFields=[
 ['姓名','name',true],['身份证号','identity',true],['工作单位','unitName',true],
 ['地区代码','regionCode',true],['性别','sex'],['职务','position',true],
 ['电话','unitPhone',true],['学历','education',true],['毕业学校','college',true],
 ['所学专业','major',true],['联系地址','homeAddress',true],['邮政编码','postalCode',true],
 ['个人电话','phone'],['手机号码','mobile']
];

function readImports(){
 const saved=localStorage.getItem(importStorageKey);
 if(!saved)return [];
 const data=JSON.parse(saved);
 if(data.version!==1||!Array.isArray(data.records)||data.records.some(record=>
  typeof record?.id!=='string'||!record.id.startsWith('LOCAL-PERSON-')||
  typeof record.identity!=='string'||typeof record.name!=='string'))throw Error('人员导入存储格式无效');
 return data.records;
}

function restoreImports(records){
 rows.splice(fixtureCount,rows.length-fixtureCount);
 for(const record of records)rows.push({...record,qualifications:[],auditRecords:[]});
}

try{restoreImports(readImports());}catch{/* Fixtures remain usable when storage is unavailable. */}
V2.fixtures.personnel=rows;

const identityKey=value=>String(value).normalize('NFKC').trim().toUpperCase();

function importRegion(code){
 if(!/^\d{2}(?:\d{2}){0,2}$/.test(code))return null;
 const province=code.slice(0,2);
 let area=code.length===2||code.slice(2)==='0000'?'':code;
 if(area.length===6&&area.endsWith('00'))area=area.slice(0,4);
 const region=V2InspectionUnits.regionText(province,area);
 return region?{province,area,region}:null;
}

function parseImport(file){
 const seen=new Set(rows.map(person=>identityKey(person.identity)));
 return V2ExcelImport.parse(file,{
  sheetName:'Sheet1',fields:importFields,
  normalize(key,value,cell){
   if(V2ExcelImport.isDateCell(cell))throw Error('须填写文本，不能使用日期格式');
   if(cell.t!=='s'&&(!['regionCode','unitPhone','postalCode','phone','mobile'].includes(key)||!Number.isSafeInteger(cell.v)||cell.v<0))throw Error('须按文本填写');
   return cell.t==='n'&&/^\d+$/.test(cell.w||'')?cell.w:value;
  },
  validate(record,problems){
   const location=record.regionCode&&importRegion(record.regionCode);
   if(record.regionCode&&!location)problems.push('地区代码无法匹配现有地区字典');
   if(location)Object.assign(record,location);
   const identity=identityKey(record.identity);
   if(identity&&seen.has(identity))problems.push('身份证号重复（同批或已存在）');
   if(identity)seen.add(identity);
  }
 });
}

function saveImports(records,disposed){
 const save=()=>{
  if(disposed())return false;
  let stored;
  try{stored=readImports();}catch{throw Error('无法读取浏览器中的人员导入记录');}
  const seen=new Set([...rows.slice(0,fixtureCount),...stored].map(person=>identityKey(person.identity)));
  const duplicates=records.filter(record=>seen.has(identityKey(record.identity)));
  if(duplicates.length)throw Error(duplicates.map(record=>'第 '+record.rowNumber+' 行：身份证号已存在').join('\n'));
  const next=stored.concat(records.map(({rowNumber,...record})=>({...record,id:'LOCAL-PERSON-'+crypto.randomUUID()})));
  V2ExcelImport.store(importStorageKey,{version:1,records:next});
  restoreImports(next);
  return true;
 };
 return V2ExcelImport.withLock(importStorageKey,save);
}

function importDialog(api){
 V2ExcelImport.show(api,{title:'人员导入',recordLabel:'人员',templateUrl:'/static/v2/templates/jyryExp.xls',
  templateName:'jyryExp.xls',parse:parseImport,save:saveImports});
}
const base=[q('search','综合查询'),{key:'region',label:'所在地区',type:'region'},q('certificateStatus','持证状态',statuses),q('source','数据来源',sources)];
const date=(key,label)=>({key,label,type:'dateRange'});
const advanced=[q('mobile','手机号码'),date('approvedDate','批准日期'),q('certificate','证书编号'),q('project','批准项目',enums.project),date('validDate','有效日期'),q('level','持证级别',enums.level),q('method','无损检测方法',enums.method)];
const qualificationKeys={approvedDate:'批准日期',certificate:'证书编号',project:'批准项目',validDate:'有效日期',level:'持证级别',method:'无损检测方法'};
function matches(person,filters){
 const active=Object.entries(filters).filter(([,v])=>String(v??'').trim()),compare=(value,key,term)=>{term=String(term).trim();if(key.endsWith('_min')||key.endsWith('_max'))return !!value&&(key.endsWith('_min')?value>=term:value<=term);return ['certificateStatus','source','project','level','method'].includes(key)?value===term:String(value??'').toLowerCase().includes(term.toLowerCase());};
 const quals=active.filter(([key])=>qualificationKeys[key.replace(/_(min|max)$/,'')]);
 if(!active.filter(([key])=>!qualificationKeys[key.replace(/_(min|max)$/,'')]).every(([key,value])=>key==='search'?['name','identity','unitName'].some(k=>compare(person[k],key,value)):key==='province'?person.province===value:key==='area'?String(person.area).startsWith(value):compare(person[key],key,value)))return false;
 return !quals.length||person.qualifications.some(record=>record.personId===person.id&&quals.every(([key,value])=>compare(record[qualificationKeys[key.replace(/_(min|max)$/,'')]],key,value)));
}
function valid(filters){for(const f of [...base,...advanced]){if(f.type==='select'&&filters[f.key]&&!f.options.includes(filters[f.key]))return f.label+'选项无效';if(f.type==='dateRange'&&filters[f.key+'_min']&&filters[f.key+'_max']&&filters[f.key+'_min']>filters[f.key+'_max'])return f.label+'下限不能大于上限';}return '';}
const schema={base,advanced,matches,valid};
V2.types.personnel={title:'人员信息管理',entity:'person',implemented:true,columns,searchKeys:['name','identity','unitName'],queries:base,actions:['导入','导出'],rowActions:[['编辑','person-edit'],['资格','person-qualification'],['修改记录','person-audit']],operationWidth:270,defaultPageSize:10,pageSizes:[2,5,10,20],exportAllColumns:true};
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
 root.append(el('h2','person-heading','检验检测人员信息'),el('p','more-context-note',person.unitId?'演示模式，仅供查看。全部为虚构人员资料，未接通保存；单位资料通过单位ID关联，未提供字段留空。':'浏览器本地导入记录，仅供查看。未提供字段留空。'));
 if(person.unitId&&!organization(person))root.append(el('p','more-context-note','关联单位已不存在（原单位 ID：'+person.unitId+'）。'));
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
const qualificationQueries=[q('application','申请类别',['演示首次申请','演示延续申请']),q('status','持证状态',statuses),q('project','批准项目',enums.project),q('category','资格类别',['演示检验类别','演示无损检测类别']),q('level','持证级别',enums.level),q('certificate','证书编号')];
function qualification(person,show){
 const root=el('div','person-qualification');root.dataset.personId=person.id;
 root.append(el('p','more-context-note','当前人员：'+person.name+' · 个人资格演示，无法定执业证明效力；与所属单位资质分开管理。'));
 const form=el('form','person-qualification-query panel'),grid=el('div','query-grid'),controls={};
 for(const f of qualificationQueries){const field=el('div','field'),label=el('label','',f.label),input=el(f.type==='select'?'select':'input','control');input.setAttribute('aria-label',f.label);
 if(f.type==='select'){for(const value of ['',...f.options]){const option=el('option','',value||'请选择');option.value=value;input.append(option)}}else{input.type='text';input.placeholder='请输入'}
 controls[f.key]=input;label.append(input);field.append(label);grid.append(field);
 }
 const actions=el('div','query-actions'),submit=el('button','primary','查询');submit.type='submit';actions.append(submit,button('重置','secondary',()=>{form.reset();entry.tables={};redraw()}));form.append(grid,actions);
 const toolbar=el('div','more-table-toolbar');for(const [name,icon] of [['新增','add'],['删除','delete']]){const b=button(name,'more-disabled',()=>{});b.disabled=true;b.title='演示模式暂不支持'+name;toolbar.append(V2ActionIcons.prepend(b,icon))}toolbar.append(el('span','','演示模式不支持修改或保存真实资格记录'));
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
return {rows,columns,infoFields,qualificationFields,qualificationQueries,action,enums,schema,importDialog};
})();

