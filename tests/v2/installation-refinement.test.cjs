const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),c={};c.window=c;vm.createContext(c);
for(const n of ['config','fixtures','dossier'])vm.runInContext(fs.readFileSync('static/v2/'+n+'.js','utf8'),c);
const s=c.V2InstallationSchema;
assert.equal(s.base.find(f=>f.key==='category').type,'cascade');
assert.deepEqual(Array.from(s.advanced,f=>f.label),'使用单位名称 注册登记日期 工程名称 使用证编号 报告书编号 设备型号 下次全面检验日期 登记汇总表编号 管道管线数 制造单位 安装单位 管道装置详细地址 设备识别码 设备投用日期 注册更新日期 注册登记机构 社会信用代码 首次检验日期 检验性质 延期至 检验类别 检验结论 定期_检验_检验日期 使用状态变更日期 检验主体组织单元 检验部门 检验员 主要问题 设备代码 上次检验日期 安全总监 安全员'.split(' '));
assert.deepEqual(Array.from(s.inspectionKinds),['年度检查','全面检验','安装监督检验','压力管道委托检验']);
assert.deepEqual(Array.from(s.formEnums.inspectionKind),['年度检验','全面检验','安装监检']);
assert.notEqual(s.latestKinds,s.formEnums.inspectionKind);
assert.equal(s.lengthTotal([{length:0.1},{length:0.2}]),'0.300');
assert.equal(s.lengthTotal([{length:1.2345},{length:0.0005}]),'1.235');
assert.equal(s.lengthTotal([]),'0.000');
assert.equal(Object.keys(c.V2CommonFields.industry).length,20);
assert.equal(c.V2CommonFields.industry['制造业'].length,30);
assert.equal(Object.values(c.V2CommonFields.industry).flat().length,95);
for(const t of c.V2EquipmentSchema.supported){
 assert.equal(c.V2EquipmentSchema.optionsFor(t,{label:'组织单元'}),c.V2CommonFields.organizationUnits);
 assert.equal(c.V2EquipmentSchema.optionsFor(t,{label:'检验主体组织单元'}),c.V2BoilerSchema.enums.inspectionSubjectUnit);
 const fields=c.V2Dossier.queryFields(t).filter(f=>f.label==='单位所属行业');
 for(const field of fields)assert.equal(field.options.length,115);
}
assert(c.V2.fixtures.installation.some(r=>s.matches(r,{category:'工业管道',latestInspectionKind:'年度检验',inspectionQueryKind:'年度检查'})));
console.log('PASS installation categories, context dictionaries, decimal arithmetic and 20 industry groups');
