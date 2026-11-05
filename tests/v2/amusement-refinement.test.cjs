const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {};
context.window = context;
vm.createContext(context);
for (const name of ['config', 'fixtures', 'dossier']) {
  vm.runInContext(fs.readFileSync('static/v2/' + name + '.js', 'utf8'), context);
}
const schema = context.V2EquipmentSchema.get('amusement');
const vehicle = context.V2EquipmentSchema.get('vehicle');
const field = (fields, key) => fields.find(item => item.key === key);
assert.equal(field(schema.base, 'category').type, 'cascade');
assert.deepEqual(Object.keys(schema.category), '观览车类 旧目录游乐设施 滑行车类 架空游览车类 陀螺类 飞行塔类 转马类 自控飞机类 赛车类 小火车类 碰碰车类 滑道类 水上游乐设施 无动力游乐设施'.split(' '));
assert.deepEqual(Array.from(schema.category['水上游乐设施']), ['峡谷漂流系列', '水滑梯系列', '碰碰船系列']);
assert.deepEqual(Array.from(schema.category['无动力游乐设施']), ['蹦极系列', '滑索系列', '空中飞人系列', '系留式观光气球系列']);
assert.deepEqual(Array.from(schema.enums.place), ['公园景区', '其他']);
for (const key of ['latestInspectionKind', 'inspectionKind', 'governorInspection', 'inspectionNature']) {
  assert.equal(schema.enums[key], vehicle.enums[key]);
}
assert.deepEqual(Array.from(schema.advanced, f => f.label),
  '注册登记机构 注册登记日期 设备名称 检验部门 报告书编号 设备型号 下次检验日期 出厂编号 设备单位内编号 制造单位 安装单位 设备使用(所在)地点 设备识别码 设备投用日期 注册更新日期 首次检验日期 检验性质 延期至 检验类别 检验结论 使用状态变更日期 创建日期 现维保单位 制造日期 运行速度 限速器是否检验 限速器校验日期 社会信用代码 检验主体组织单元 检验员 主要问题 上次检验日期 设备代码 使用证编号 安全总监 安全员'.split(' '));
assert.equal(field(schema.advanced, 'inspectionConclusion').disabled, true);
assert.equal(field(schema.advanced, 'governorCalibrationDate').type, 'dateRange');
assert.equal(schema.optionsFor({ label: '检验类别' }), vehicle.enums.inspectionKind);
const fixtures = context.V2.fixtures.amusement;
assert(fixtures.some(row => schema.matches(row, {category: '水上游乐设施 / 水滑梯系列'})));
assert(fixtures.some(row => schema.matches(row, {latestInspectionKind: '安装监检', inspectionKind: '监督检验', governorInspection: '否'})));
