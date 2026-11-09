/* Original workbook schemas and browser-local product changes, scoped by product type. */
window.V2ProductImport=(()=>{
'use strict';

const identity=[['设备代码','equipmentCode',true],['产品名称','name'],['设备类别','category',true],
 ['产品编号','productNumber',true],['产品型号','model']];
const order=[['合同号','contractNumber'],['生产编号','productionNumber'],['用户名称','customer'],['是否出口','isExport']];
const maker=[['制造单位名称','manufacturer',true],['组织机构代码','manufacturerCreditCode'],
 ['制造许可证号','manufacturingLicense'],['制造国家（地区）名称','country'],['制造日期','manufacturedDate'],['制造详细地址','manufacturingAddress']];
const license=[['制造规范','manufacturingStandard'],['位号','positionNumber'],['许可范围','licenseScope'],['许可证级别','licenseLevel']];
const remarks=['备注','remarks'];
const templates={
 'boiler-product':{
  name:'锅炉产品.xlsx',url:'/static/v2/templates/product-boiler.xlsx',
  fields:[...identity,...order,['设计压力','designPressure'],['设计温度','designTemperature'],['盛装介质','medium'],['容积','volume'],
   ['额定蒸发量','evaporation'],['额定热功率','thermalPower'],['额定蒸汽（出口）压力','steamPressure'],['额定蒸汽（出口）温度','steamTemperature'],
   ...maker,...license,['规格（t/h）','specification'],['补录设备参数的单位','parameterOrganization'],remarks]
 },
 'vessel-product':{
  name:'压力容器产品.xlsx',url:'/static/v2/templates/product-vessel.xlsx',
  fields:[...identity,...order,['壳程设计压力(MPa)','shellPressure'],['管程设计压力(MPa)','tubePressure'],
   ['壳程设计温度(℃)','shellTemperature'],['管程设计温度(℃)','tubeTemperature'],['盛装介质','medium'],['容积','volume'],...maker,...license,remarks]
 },
 'elevator-product':{
  name:'电梯产品.xlsx',url:'/static/v2/templates/product-elevator.xlsx',
  fields:[...identity,order[0],['购货单位','customer'],order[3],['主要技术参数','technicalParameters'],['项目名称','projectName'],
   ['是否有安装书面材料','hasInstallationDocuments'],['是否需要英文报告和证书','needsEnglishReport'],maker[0],
   ['制造单位组织机构代码','manufacturerCreditCode'],...maker.slice(2),['样梯安装地址','sampleInstallationAddress'],
   ['额定速度（上行）','ratedSpeed'],['额定速度（下行）','ratedSpeedDown'],['额定载重量','ratedCapacity'],
   ['提升高度','liftingHeight'],['使用区段长度','sectionLength'],remarks]
 },
 'crane-product':{
  name:'起重机械产品.xlsx',url:'/static/v2/templates/product-crane.xlsx',
  fields:[...identity,['设备造价(元)','cost'],['制造顺序号','manufacturingSequence'],['产品级别','productLevel'],...order.slice(0,2),
   ['产品特征','characteristics'],['购货单位','customer'],order[3],...maker,remarks]
 },
 'pipe-component':{
  name:'管道元件产品.xlsx',url:'/static/v2/templates/product-pipe-component.xlsx',
  fields:[...identity,['产品级别','productLevel'],...order.slice(0,2),['产品特征','characteristics'],['购货单位','purchaser'],order[3],
   ['制造原材料','rawMaterial'],['信用证号','creditLetter'],['产品描述','description'],['执行标准','executionStandard'],
   ['长度','length'],['重量','weight'],['设备参数等级','parameterGrade'],['总图图号','drawingNumber'],['质证号','qualityCertificate'],
   ['设计使用年限','designLife'],...maker,['管道元件数量','componentCount'],['起始编号','startNumber'],['截止编号','endNumber'],remarks]
 },
 'pipe-project':{
  name:'管道工程产品.xlsx',url:'/static/v2/templates/product-pipe-project.xlsx',
  fields:[['工程项目名称','name',true],['合同编号','contractNumber',true],['执行标准','executionStandard'],['委托方(订货单位)','customer'],
   ['货物描述','cargoDescription'],['车号','carNumber'],['出证日期','issueDate'],['总长度','totalLength'],['总质量','totalWeight'],
   ['规格','specification'],['钢级','steelGrade'],maker[0],['统一社会信用代码','manufacturerCreditCode'],...maker.slice(2),remarks]
 }
};

const numeric=new Set(['designPressure','designTemperature','volume','evaporation','thermalPower','steamPressure','steamTemperature',
 'shellPressure','tubePressure','shellTemperature','tubeTemperature','ratedSpeed','ratedSpeedDown','ratedCapacity','liftingHeight','sectionLength',
 'cost','length','weight','designLife','componentCount','totalLength','totalWeight']);
const yesNo=new Set(['isExport','hasInstallationDocuments','needsEnglishReport']);
const identifiers=new Set(['equipmentCode','productNumber','model','contractNumber','productionNumber','manufacturingSequence',
 'manufacturerCreditCode','manufacturingLicense','positionNumber','drawingNumber','qualityCertificate','creditLetter','startNumber','endNumber','carNumber']);
const keyFor=type=>'v2:products:v1:'+type;
const importedId=id=>typeof id==='string'&&id.startsWith('LOCAL-PRODUCT-');
const categoryPatch=(type,category)=>({category,categoryGroup:V2ProductCategories.path(type,category)[0]||''});

function read(type){
 const raw=localStorage.getItem(keyFor(type));
 if(!raw)return {version:1,records:[],categories:{}};
 const data=JSON.parse(raw);
 if(data?.version!==1||!Array.isArray(data.records)||!data.categories||typeof data.categories!=='object'||
    data.records.some(r=>!importedId(r?.id)||r.productType!==type))throw Error('该模块的本地产品数据格式无效');
 return data;
}

function restore(type,saved){
 const rows=V2.fixtures[type];
 const known=new Map(rows.map(row=>[row.id,row]));
 for(const row of rows){
  if(importedId(row.id)||!Object.hasOwn(saved.categories,row.id))continue;
  const category=saved.categories[row.id];
  if(category===''||V2ProductCategories.path(type,category).length)Object.assign(row,categoryPatch(type,category));
 }
 for(const record of saved.records){
  const existing=known.get(record.id);
  if(existing)Object.assign(existing,record);
  else rows.push({...record,auditRecords:[]});
 }
}

function normalizeDate(value,cell,date1904){
 let parts;
 if(cell.t==='n'){
  const date=Number.isInteger(cell.v)&&XLSX.SSF.parse_date_code(cell.v,{date1904});
  if(date)parts=[date.y,date.m,date.d];
 }else{
  const match=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
  if(match)parts=match.slice(1).map(Number);
 }
 if(parts){
  const [y,m,d]=parts, date=new Date(Date.UTC(y,m-1,d));
  if(y>=1900&&y<=9999&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d){
   return date.toISOString().slice(0,10);
  }
 }
 throw Error('日期无效，请填写有效的 YYYY-MM-DD 或 Excel 日期');
}

function normalize(type,key,value,cell,date1904){
 if(key==='manufacturedDate'||key==='issueDate')return normalizeDate(value,cell,date1904);
 if(V2ExcelImport.isDateCell(cell))throw Error('不能填写日期');
 if(key==='category'){
  const path=value.split(/\s*\/\s*/);
  const leaf=path.at(-1),expected=V2ProductCategories.path(type,leaf);
  if(!expected.length||(path.length>1&&path.join('/')!==expected.join('/')))throw Error('不属于当前模块的设备类别');
  return leaf;
 }
 if(yesNo.has(key)&&!['是','否'].includes(value))throw Error('须填写「是」或「否」');
 if(numeric.has(key)||(key==='specification'&&type==='boiler-product')){
  const number=Number(value);
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)||!Number.isFinite(number)||(!/Temperature/.test(key)&&number<0)||
     (key==='componentCount'&&!Number.isSafeInteger(number)))throw Error(key==='componentCount'?'须填写非负整数':'数值格式无效');
  return number;
 }
 if(cell.t==='s')return value;
 if(identifiers.has(key)&&cell.t==='n'&&Number.isSafeInteger(cell.v)&&cell.v>=0){
  return /^\d+$/.test(cell.w||'')?cell.w:value;
 }
 throw Error('须按文本填写');
}

function duplicateChecker(type,rows){
 const normalized=value=>String(value??'').normalize('NFKC').trim().toUpperCase();
 const projectKey=row=>row.name&&row.contractNumber?JSON.stringify([normalized(row.name),normalized(row.contractNumber)]):'';
 const fields=type==='pipe-project'?[['工程项目名称与合同编号的组合',projectKey]]:[
  ['设备代码',row=>normalized(row.equipmentCode)],['产品编号',row=>normalized(row.productNumber)]
 ];
 const checks=fields.map(([label,key])=>({label,key,seen:new Set(rows.map(key).filter(Boolean))}));
 return (record,problems)=>{
  for(const {label,key,seen} of checks){
   const value=key(record);
   if(!value)continue;
   if(seen.has(value))problems.push(label+'重复（同批或已存在）');
   seen.add(value);
  }
 };
}

function save(type,records,closed){
 return V2ExcelImport.withLock(keyFor(type),()=>{
  if(closed())return false;
  const saved=read(type),sessionRows=V2.fixtures[type].filter(row=>!importedId(row.id));
  const duplicate=duplicateChecker(type,[...sessionRows,...saved.records]);
  const issues=[];
  for(const row of records){
   const problems=[];duplicate(row,problems);
   if(problems.length)issues.push('第 '+row.rowNumber+' 行：'+problems.join('；'));
  }
  if(issues.length)throw Error(issues.slice(0,20).join('\n'));
  const createdAt=new Date().toISOString().slice(0,19).replace('T',' ');
  saved.records.push(...records.map(({rowNumber,...row})=>({...row,...(row.category?categoryPatch(type,row.category):{}),
   id:'LOCAL-PRODUCT-'+crypto.randomUUID(),productType:type,createdAt})));
  V2ExcelImport.store(keyFor(type),saved);
  restore(type,saved);
  return true;
 });
}

function show(type,api){
 const template=templates[type];
 V2ExcelImport.show(api,{title:'产品导入',recordLabel:'产品',templateUrl:template.url,templateName:template.name,
  parse:file=>V2ExcelImport.parse(file,{sheetName:template.name,fields:template.fields,
   normalize:(...args)=>normalize(type,...args),validate:duplicateChecker(type,V2.fixtures[type])}),
  save:(records,closed)=>save(type,records,closed)});
}

function extraFields(type,row,fields){
 if(!importedId(row.id))return [];
 const existing=new Set(fields.map(([key])=>key));
 return templates[type].fields.filter(([,key])=>!existing.has(key)).map(([label,key])=>[key,label]);
}

function saveEdit(type,row,draft,closed){
 // Existing copy records keep their session-only lifetime.
 if(!importedId(row.id)&&(row.id.includes('-COPY-')||draft.category===undefined||row.category===draft.category))return;
 return V2ExcelImport.withLock(keyFor(type),()=>{
  if(closed())return false;
  const saved=read(type);
  if(importedId(row.id)){
   const current=saved.records.find(record=>record.id===row.id);
   if(!current)throw Error('找不到本地导入记录，未保存');
   const duplicate=duplicateChecker(type,[...V2.fixtures[type].filter(r=>!importedId(r.id)),...saved.records.filter(r=>r.id!==row.id)]);
   const problems=[];
   duplicate({...current,...draft},problems);
   if(problems.length)throw Error(problems.join('；'));
   Object.assign(current,draft);
  }else saved.categories[row.id]=draft.category;
  V2ExcelImport.store(keyFor(type),saved);
  restore(type,saved);
 });
}

for(const type of Object.keys(templates)){
 try{restore(type,read(type));}catch{/* Original fixtures remain available if browser storage is unavailable. */}
}
return {show,extraFields,saveEdit};
})();
