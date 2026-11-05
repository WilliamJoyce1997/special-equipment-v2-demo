const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),c={};c.window=c;vm.createContext(c);for(const name of ['config','inspection-history','more-dialogs'])vm.runInContext(fs.readFileSync('static/v2/'+name+'.js','utf8'),c);const E=c.V2ElevatorMore,plain=x=>JSON.parse(JSON.stringify(x));let passed=0;const ok=s=>{passed++;console.log('PASS '+s)};
assert.deepEqual(plain(E.menuItems('elevator')),['智慧监管码','检验信息','检测信息','检验检测更正','修改记录']);for(const t of ['boiler','vessel','crane','vehicle','amusement','ropeway','installation','pipeline'])assert(!E.menuItems(t).includes('检测信息'));ok('five ordered elevator options and no cross-type additions');
assert.equal(E.fields.length,11);assert.deepEqual(plain(E.fields.find(f=>f[0]==='lastSupervisionInspectionType')[4]),['安装监检','改造监检','大修监检']);assert.deepEqual(plain(E.fields.find(f=>f[0]==='inspectionTestingNature')[4]),['检验','检测']);ok('11 correction fields and exact dictionaries');
const row={id:'a',age:12,installationInspectionDate:'',inspectionTestingNature:'原演示性质'},values={installationInspectionDate:'2024-09-29',lastSupervisionInspectionType:'安装监检',baseYear:'2024',baseMonth:'9月',nextInspection:'2027-04-01',nextTestingDate:'2027-09-30',inspectionTestingNature:'检测',informationConfirmation:'未确认',age:'999'};
const changes=E.patch(row,values);assert.equal(changes.baseYear,2024);assert(!('age'in changes));assert.equal(row.installationInspectionDate,'');assert.equal(changes.nextInspection,'2027-04-01');assert.equal(changes.nextTestingDate,'2027-09-30');ok('patch is validated, read-only age ignored, no inferred dates or source mutation');
for(const patch of [{installationInspectionDate:''},{installationInspectionDate:'2026-02-31'},{baseYear:'1.5'},{baseMonth:'13月'},{lastSupervisionInspectionType:'定期检验'},{inspectionTestingNature:'伪造选项'}])assert.throws(()=>E.patch(row,{...values,...patch}));assert.throws(()=>E.patch(row,{...values,inspectionTestingNature:''}));ok('required/date/year/enum checks and legacy nature ambiguity blocked');
assert.equal(E.records({id:'a',testingDate:'2026-01-01'}).length,0);assert.deepEqual(plain(E.records({id:'a',testingRecords:[{id:'own',equipmentId:'a'},{id:'foreign',equipmentId:'b'}]}).map(r=>r.id)),['own']);ok('no inferred completed reports, records strictly tied to elevator');
fs.mkdirSync('docs/special-equipment-v2/elevator-more',{recursive:true});fs.writeFileSync('docs/special-equipment-v2/elevator-more/engine-results.json',JSON.stringify({passed,failed:0,skipped:0},null,2));





