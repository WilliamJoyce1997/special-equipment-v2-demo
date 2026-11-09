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
const rows=V2InspectionUnits.rows.slice(0,4).map((unit,i)=>{
 const person={id:'DEMO-PERSON-00'+(i+1),name:'演示人员'+['甲','乙','丙','丁'][i],sex:i%2?'女':'男',identity:'DEMO-ID-PERSON-00'+(i+1),birthDate:'199'+i+'-01-01',archiveNumber:'DEMO-ARCHIVE-00'+(i+1),ndt:i%2?'否':'是',unitId:unit.id,phone:'DEMO-PHONE-00'+(i+1),mobile:'DEMO-MOBILE-00'+(i+1),source:sources[i%2],certificateStatus:statuses[i<2?0:1],position:['演示无损检测岗','演示检验岗','演示试验岗','演示资料岗'][i],education:'演示学历资料',qualifications:[],auditRecords:[]};
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

async function parseImport(file){
 const extension=/\.(xls|xlsx)$/i.exec(file?.name??'')?.[1]?.toLowerCase();
 if(!extension)throw Error('请选择 .xls 或 .xlsx 文件');
 if(!file.size||file.size>5*1024*1024)throw Error('文件大小须大于 0 且不超过 5 MB');
 if(typeof XLSX==='undefined')throw Error('本地 Excel 解析库未加载');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const signature=extension==='xls'?[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]:[0x50,0x4b,3,4];
 if(!signature.every((byte,index)=>bytes[index]===byte))throw Error('文件内容与扩展名不一致，或文件已损坏');
 let book;
 try{
  const options={type:'array',sheetRows:1002,cellNF:true,cellFormula:true};
  if(extension==='xls'){
   const compound=XLSX.CFB.read(bytes,{type:'array'});
   const stream=(XLSX.CFB.find(compound,'Workbook')||XLSX.CFB.find(compound,'Book'))?.content;
   if(!stream?.length)throw Error('Workbook stream missing');
   book=XLSX.read(stream,options);
  }else{
   book=XLSX.read(bytes,options);
   if(book.bookType!=='xlsx')throw Error('Unexpected workbook type');
  }
 }catch{throw Error('Excel 文件无法解析，可能已损坏、加密或格式不正确');}
 if(book.SheetNames.length!==1||book.SheetNames[0]!=='Sheet1')throw Error('工作表须与模板一致，仅保留 Sheet1');
 const sheet=book.Sheets.Sheet1;
 const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
 if(range.e.r>1000)throw Error('第 2 行起最多支持 1000 行，请分批导入');
 if(range.e.c>=importFields.length||range.s.r!==0||range.s.c!==0||range.e.c!==importFields.length-1||sheet['!merges']?.length){
  throw Error('工作表结构或表头不一致，请按模板保留 14 列及其顺序，勿合并单元格');
 }
 const cellAt=(r,c)=>sheet[XLSX.utils.encode_cell({r,c})];
 if(importFields.some(([label],c)=>cellAt(0,c)?.v!==label||cellAt(0,c)?.f)){
  throw Error('第 1 行表头名称或顺序与模板不一致');
 }
 const records=[],issues=[],seen=new Set(rows.map(person=>identityKey(person.identity)));
 for(let r=1;r<=range.e.r;r++){
  const record={},problems=[];
  let hasData=false;
  for(const [c,[label,key,required]] of importFields.entries()){
   const cell=cellAt(r,c);
   const value=String(cell?.v??'').trim();
   const formula=cell?.f||cell?.F||cell?.t==='e';
   if(value||formula)hasData=true;
   if(formula)problems.push(label+'不能使用公式或错误值');
   else if(required&&!value)problems.push(label+'必填');
   else if(value&&(cell.t==='d'||(cell.t==='n'&&XLSX.SSF.is_date(cell.z||''))))problems.push(label+'须填写文本，不能使用日期格式');
   else if(value&&cell.t!=='s'&&(!['regionCode','unitPhone','postalCode','phone','mobile'].includes(key)||!Number.isSafeInteger(cell.v)||cell.v<0))problems.push(label+'须按文本填写');
   record[key]=cell?.t==='n'&&/^\d+$/.test(cell.w||'')?cell.w:value;
  }
  if(!hasData)continue;
  const location=record.regionCode&&importRegion(record.regionCode);
  if(record.regionCode&&!location)problems.push('地区代码无法匹配现有地区字典');
  const identity=identityKey(record.identity);
  if(identity&&seen.has(identity))problems.push('身份证号重复（同批或已存在）');
  if(identity)seen.add(identity);
  if(problems.length)issues.push('第 '+(r+1)+' 行：'+problems.join('；'));
  else records.push({...record,...location,rowNumber:r+1});
 }
 return {records,issues};
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
  try{localStorage.setItem(importStorageKey,JSON.stringify({version:1,records:next}));}
  catch{throw Error('保存失败，请检查浏览器本地存储权限或剩余空间');}
  restoreImports(next);
  return true;
 };
 return navigator.locks?navigator.locks.request(importStorageKey,save):save();
}

function importDialog(api){
 const root=el('div','valve-import personnel-import'),label=el('label','','选择附件：'),file=el('input');
 const fileName=el('span','personnel-import-filename','未选择任何文件');fileName.setAttribute('aria-hidden','true');
 file.type='file';file.accept='.xls,.xlsx';file.setAttribute('aria-label','选择附件');label.append(file,fileName);
 const notes=el('div','valve-import-notes'),link=el('a','','下载模板');
 link.href='/static/v2/templates/jyryExp.xls';link.download='jyryExp.xls';
 const first=el('p','','1、上传附件格式需与模板格式完全一致');first.append(link);
 notes.append(el('p','','注意：'),first,el('p','','2、模板中字段名称为红色的，必须填写'),el('p','','3、仅支持 xls 和 xlsx 格式'));
 const summary=el('p','more-context-note'),error=el('p','form-error');
 summary.setAttribute('role','status');error.setAttribute('role','alert');
 let staged=[],selection=0,closed=false;
 const upload=button('上传','primary',async()=>{
  const records=staged;upload.disabled=true;file.disabled=true;error.textContent='';
  try{
   if(!await saveImports(records,()=>closed)||closed)return;
   api.close();api.refresh();api.announce('已导入 '+records.length+' 条人员记录，保存在当前浏览器');
  }catch(problem){
   if(!closed){error.textContent=problem.message;file.disabled=false;upload.disabled=false;}
  }
 });
 upload.disabled=true;
 file.onchange=async()=>{
  const ticket=++selection;staged=[];upload.disabled=true;error.textContent='';summary.textContent='';
  fileName.textContent=file.files[0]?.name||'未选择任何文件';
  if(!file.files.length)return;
  summary.textContent='正在本地解析 Excel…';
  try{
   const {records,issues}=await parseImport(file.files[0]);
   if(closed||ticket!==selection)return;
   summary.textContent='共 '+(records.length+issues.length)+' 行（不含空行），有效 '+records.length+' 行，错误 '+issues.length+' 行';
   if(issues.length){
    error.textContent=issues.slice(0,20).join('\n')+(issues.length>20?'\n仅显示前 20 个错误行。':'')+'\n请修正后重新选择文件。';
   }else if(!records.length)error.textContent='模板中没有可导入的数据行';
   else{staged=records;upload.disabled=false;}
  }catch(problem){
   if(closed||ticket!==selection)return;
   summary.textContent='';error.textContent=problem.message;
  }
 };
 const actions=el('div','valve-import-actions');actions.append(upload,button('取消','secondary',api.close));
 root.append(label,notes,el('p','more-context-note','文件仅在当前浏览器读取，确认后记录保存在当前浏览器。单次最多 1000 行、5 MB。'),summary,error,actions);
 api.show('人员导入',root,'organization-dialog valve-import-dialog personnel-import-dialog',()=>{closed=true;});
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
return {rows,columns,infoFields,qualificationFields,qualificationQueries,action,enums,schema,importDialog};
})();

