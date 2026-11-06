const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),c={};c.window=c;vm.createContext(c);
for(const n of ['config','fixtures','dossier','inspection-unit'])vm.runInContext(fs.readFileSync('static/v2/'+n+'.js','utf8'),c);
const U=c.V2InspectionUnits,S=U.schema;
assert.deepEqual(Array.from(U.enums.level),['国家级','省级','地市级','区县级','乡镇级']);
assert.equal(S.advanced.find(f=>f.key==='level').options,U.enums.level);
assert.equal(S.advanced.find(f=>f.key==='projectKind').options,U.enums.projectKind);
assert(S.advanced.find(f=>f.key==='projectCategory').disabled);
for(const row of U.rows){
 assert.equal(row.region,row.regionCode);
 assert.equal(U.regionText(row.province,row.area),row.regionCode);
 assert(!row.regionCode.includes('DEMO'));
}
const row=JSON.parse(JSON.stringify(U.rows[0]));
row.qualifications=[
 {unitId:row.id,'核准项目种类':'检验人员','证书编号':'DEMO-A','发证日期':'2026-01-01','有效期至':'2027-01-01'},
 {unitId:row.id,'核准项目种类':'无损检验人员','证书编号':'DEMO-B','发证日期':'2025-01-01','有效期至':'2026-01-01'}
];
assert(S.matches(row,{province:'53',area:row.area,level:row.level,projectKind:'检验人员',certificate:'DEMO-A'}));
assert(!S.matches(row,{projectKind:'检验人员',certificate:'DEMO-B'}));
assert(!S.matches(row,{projectKind:'检验人员',issuedDate_max:'2025-01-01'}));
assert(S.valid({issuedDate_min:'2027-01-01',issuedDate_max:'2026-01-01'}));
assert(S.valid({projectCategory:'x'}));
assert.deepEqual(Array.from(c.V2EquipmentSchema.optionsFor('boiler',{label:'所属行业'})),Array.from(c.V2CommonFields.flatten(c.V2CommonFields.industry)));
