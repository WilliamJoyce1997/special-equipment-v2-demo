/* Query metadata only. Never persist person snapshots or manufacture qualification records. */
window.V2QueryDictionaries=(()=>{
'use strict';
const specs=[
['name','姓名','text'],['identity','身份证','text'],['birthDate','出生年月','date'],['sex','性别','enum',['男','女']],
['unitName','单位名称','text'],['unitOrganizationCode','单位组织机构代码','text'],['unitAddress','单位地址','text'],
['homeAddress','联系地址','text'],['unitPostalCode','邮政编码（单位）','text'],['postalCode','邮政编码（住址）','text'],
['region','所在区域名称','enum'],['regionCode','地区代码','enum'],['unitPhone','单位联系电话','text'],
['phone','个人电话','text'],['mobile','手机号码','text'],['fax','传真','text'],['email','电子邮箱','text'],
['position','职务','text'],['responsibility','负责工作','text'],['title','职称','enum'],['education','学历','enum'],
['college','毕业院校','text'],['major','所学专业','text'],['archiveNumber','档案编号','text'],
['application','申请类别','enum',['演示首次申请','演示延续申请'],'申请类别'],
['certificateStatus','持证状态','enum',['演示未持证','演示资料待核'],'持证状态'],
['examNumber','考核号','text',null,'考核号'],['examOrg','考核机构','text',null,'考核机构'],
['issuingOrg','发证机构','text',null,'发证机构'],['certificate','证书编号','text',null,'证书编号'],
['certificateCard','证书底卡编号','text',null,'证书底卡编号'],
['projectLevel','持证项目级别','enum',['演示一级','演示二级'],'持证项目级别'],
['project','批准项目','enum',['演示项目A','演示项目B'],'批准项目'],
['approvalDetails','批准资格明细','text',null,'批准资格明细'],
['approvedDate','批准日期','date',null,'批准日期'],['validUntil','有效日期至','date',null,'有效日期'],
['firstCertificateDate','初次取证日期','date',null,'初次取证日期'],['examConclusion','最终考核结论','enum',[],'最终考核结论']
];
const classification=Object.freeze({'DEMO-PERSON-001':'ndt','DEMO-PERSON-002':'inspector','DEMO-PERSON-003':'ndt','DEMO-PERSON-004':'inspector'});
const unitKeys={unitName:'name',unitAddress:'address',unitPostalCode:'postalCode',unitPhone:'phone',region:'region',regionCode:'regionCode',unitOrganizationCode:'organizationCode'};
function baseValue(p,key){if(unitKeys[key])return V2InspectionUnits.rows.find(u=>u.id===p.unitId)?.[unitKeys[key]]??null;return p[key]??null;}
const fields=specs.map(([key,label,type,options,qualificationKey],i)=>Object.freeze({id:(i<24?'person.':'qualification.')+key,key,label,type,scope:i<24?'person':'qualification',qualificationKey,options:options||[],sensitive:['identity','phone','mobile','unitPhone','fax','email'].includes(key)}));
const fieldMap=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(fields.map(f=>[f.id,f]))));
function value(p,q,f){return f.scope==='person'?baseValue(p,f.key):(q?.[f.qualificationKey]??null);}
function qualifications(p){return (p.qualifications||[]).filter(q=>q.personId===p.id);}
function rows(type){return V2Personnel.rows.filter(p=>classification[p.id]===type);}
function choices(f){return [...new Set([...f.options,...V2Personnel.rows.flatMap(p=>f.scope==='person'?[value(p,null,f)]:qualifications(p).map(q=>value(p,q,f))).filter(v=>v!==null&&v!=='')])];}
function availability(f,type){const ps=rows(type),vs=ps.flatMap(p=>f.scope==='person'?[value(p,null,f)]:qualifications(p).map(q=>value(p,q,f)));return !vs.some(v=>v!==null&&v!=='')?'missing':vs.some(v=>v===null||v==='')?'partial':'available';}
const person={domain:'person',title:'人员综合查询',noun:'人员',fields,fieldMap,types:[{id:'inspector',label:'检验人员'},{id:'ndt',label:'无损检测人员'}],rows,value,qualifications,records:qualifications,choices,availability,classification,expandResults:true,hasSource:true,defaultField:'person.name',note:'演示分类为明确人员ID映射，不从无损检测人员=否反推；两类型共用38项字段。',resultNote:'含资格列时按人员/资格展开，无资格的列留空。'};
const unitTypes=[['supervision','监管机构'],['inspection-unit','检验单位'],['usage','使用单位'],['design','设计单位'],['manufacturer','制造单位'],['maintenance','维保单位'],['installation','安装单位'],['other','其他单位']].map(([id,label])=>({id,label}));
const unitSpecs=[['name','机构名称','text','name'],['parentName','所在单位名称','text','parentUnitName'],['parentCredit','所在单位统一社会信用代码','text','parentUnitCreditCode'],['regionCode','地区代码','enum','regionCode'],['address','机构地址','text','address'],['level','机构级别','enum','level'],['nature','机构地位性质','enum','organizationNature'],['issuingOrg','所代表发证机构名称','text','representedIssuingOrg'],['postalCode','邮政编码','text','postalCode'],['phone','机构电话','text','phone'],['email','电子信箱','text','email'],['website','网址','text','website'],['industryCredit','质检行业统一社会信用代码','text','qualityIndustryCreditCode']];
const unitFields=unitSpecs.map(([key,label,type,path])=>Object.freeze({id:'organization.'+key,key:path,label,type,scope:'unit',options:[],sensitive:['phone','email'].includes(key)}));
const equipmentTypes=[['boiler','锅炉'],['vessel','压力容器'],['elevator','电梯'],['crane','起重机械'],['vehicle','场（厂）内机动车辆'],['amusement','大型游乐设施'],['pressure-pipeline','压力管道'],['ropeway','客运索道']].map(([id,label])=>({id,label}));
function adapter(meta,fs,source,getValue,records=()=>[]){const map=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(fs.map(f=>[f.id,f]))));return {...meta,fields:fs,fieldMap:map,rows:source,value:getValue,records,
 choices:f=>[...new Set([...(f.options||[]),...source().flatMap(r=>f.scope==='history'?records(r).map(q=>getValue(r,q,f)):[getValue(r,null,f)]).filter(v=>v!==null&&v!==undefined&&v!=='')])],
 availability:f=>{const vs=source().flatMap(r=>f.scope==='history'?records(r).map(q=>getValue(r,q,f)):[getValue(r,null,f)]);return !vs.some(v=>v!==null&&v!==undefined&&v!=='')?'missing':vs.some(v=>v===null||v===undefined||v==='')?'partial':'available';}};}
const caches=new Map();
function get(domain,type,subtype){
 if(domain==='person'){if(!person.types.some(t=>t.id===type))throw Error('未知人员类型');return person;}
 if(domain==='unit'){if(!unitTypes.some(t=>t.id===type))throw Error('未知单位类型');const key=domain+':'+type;if(!caches.has(key))caches.set(key,adapter({domain,title:'单位综合查询',noun:'单位',types:unitTypes,hasSource:type==='inspection-unit',defaultField:'organization.name',note:'仅检验单位有独立档案数据源；其他单位类型保留配置，不将名称字符串当作机构档案。',resultNote:'按单位ID展示当前档案；没有关联值的字段留空。'},unitFields,()=>type==='inspection-unit'?V2InspectionUnits.rows:[],(r,q,f)=>r[f.key]??null));return caches.get(key);}
 if(domain==='equipment'){
 if(!equipmentTypes.some(t=>t.id===type))throw Error('未知设备类型');if(type==='pressure-pipeline'&&!['installation','pipeline'].includes(subtype))throw Error('请选择压力管道装置或管线子类型');if(type!=='pressure-pipeline'&&subtype)throw Error('该设备类型没有子类型');
 const assetType=type==='pressure-pipeline'?subtype:type,key=domain+':'+assetType;
 if(!caches.has(key)){const fs=V2Dossier.queryFields(assetType);caches.set(key,adapter({domain,title:'设备综合查询',noun:'设备',types:equipmentTypes,assetType,hasSource:true,aggregateRecords:true,defaultField:(fs.find(f=>f.key==='equipmentCode'&&f.scope==='asset')||fs.find(f=>f.key==='pipelineNumber'&&f.scope==='asset')||fs[0]).id,note:'字段读取设备详情“全部”；压力管道装置与管线分别查询，不合并计数。',resultNote:'每台设备只出现一行；历史检验字段按匹配记录汇总，多值用分号分隔；空关联表不编造记录。'},fs,()=>V2.fixtures[assetType],(r,q,f)=>V2Dossier.queryValue(assetType,r,q,f),r=>V2Dossier.histories(assetType,r)));}return caches.get(key);
 }
 throw Error('查询方案类型或版本无效');
}
return {person,fields,get,unitFields,unitTypes,equipmentTypes};
})();

