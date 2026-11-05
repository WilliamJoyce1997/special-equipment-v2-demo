const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {};
context.window = context;
vm.createContext(context);
for (const name of ['config', 'fixtures', 'dossier']) {
  vm.runInContext(fs.readFileSync('static/v2/' + name + '.js', 'utf8'), context);
}
const schema = context.V2EquipmentSchema.get('vehicle');
const field = (fields, key) => fields.find(item => item.key === key);
const options = (fields, key) => Array.from(field(fields, key).options);

assert.equal(field(schema.base, 'category').type, 'cascade');
assert.deepEqual(Object.keys(schema.category), ['机动工业车辆', '非公路用旅游观光车辆', '旧目录厂车']);
assert.deepEqual(Array.from(schema.category['机动工业车辆']), ['叉车']);
assert.deepEqual(options(schema.base, 'place'), ['公园', '车站', '客运码头', '工厂', '其它']);
assert.deepEqual(options(schema.base, 'latestInspectionKind'), [
  '定期检验', '安装监检', '进口监检', '驻厂监检', '新装验收', '普查验收',
  '移梯验收', '停启验收', '改造验收', '大修验收', '重新验收', '型式试验'
]);
assert.deepEqual(options(schema.advanced, 'inspectionKind'), ['定期检验', '监督检验']);
assert.deepEqual(options(schema.advanced, 'governorInspection'), ['是', '否']);
assert.equal(field(schema.advanced, 'inspectionConclusion').disabled, true);
assert.equal(schema.advanced.length, 37);
assert.notEqual(schema.valid({ inspectionKind: '安装监检' }), '');
assert.equal(schema.valid({ inspectionKind: '监督检验', latestInspectionKind: '安装监检' }), '');
assert(context.V2.fixtures.vehicle.some(row => schema.matches(row, { category: '机动工业车辆 / 叉车' })));
assert(context.V2.fixtures.vehicle.some(row => schema.matches(row, { inspectionKind: '监督检验', latestInspectionKind: '安装监检' })));
assert.deepEqual(Array.from(schema.optionsFor({ label: '检验类别' })), ['定期检验', '监督检验']);
assert.deepEqual(Array.from(schema.optionsFor({ label: '检验主体组织单元' })), ['云南省特检']);
assert.equal(schema.optionsFor({ label: '主要问题' }), context.V2BoilerSchema.enums.inspectionProblems);
