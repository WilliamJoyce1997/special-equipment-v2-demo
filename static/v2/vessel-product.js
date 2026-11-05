/* Vessel product configuration. Shared product UI, copy, inspection and audit routes. */
(()=>{
'use strict';
const manufacturers=[...new Set(V2.fixtures.vessel.map(r=>r.manufacturer).filter(Boolean))];
const categories=V2ProductCategories.trees['vessel-product'][0][1].slice(1).reverse();
const rows=categories.map((category,i)=>({
 id:'DEMO-VESSEL-PRODUCT-00'+(i+1),equipmentCode:'DEMO-PRODUCT-RQ-00'+(i+1),name:'DEMO-'+category+'产品-'+(i+1),productNumber:'DEMO-RQ-PRODUCT-NO-00'+(i+1),
 manufacturer:manufacturers[i%manufacturers.length]||V2BoilerProducts.rows[0].manufacturer,model:'DEMO-RQ-MODEL-'+(i+1),category,categoryGroup:'固定式压力容器',
 createdAt:'2026-10-0'+(i+1)+' 10:00:00',isExport:'否',shellPressure:0.8+i*0.2,tubePressure:0.5+i*0.15,shellTemperature:160+i*10,tubeTemperature:120+i*10,
 medium:'演示水/蒸汽',volume:2+i,manufacturedDate:'2026-09-0'+(i+1),specification:'DEMO-VOLUME-'+(2+i),remarks:'DEMO虚构压力容器产品，不是在用设备或真实许可资料'
}));
const fields=[
 ['equipmentCode','设备代码'],['name','产品名称'],['category','设备类别','category3',false,true],
 ['productNumber','产品编号','text',true],['model','产品型号'],['contractNumber','合同号'],['productionNumber','生产编号'],
 ['customer','用户名称'],['isExport','是否出口','select',false,false,['是','否']],
 ['shellPressure','壳程设计压力（MPa）','number'],['tubePressure','管程设计压力（MPa）','number'],
 ['shellTemperature','壳程设计温度（℃）','number'],['tubeTemperature','管程设计温度（℃）','number'],
 ['medium','盛装介质'],['volume','容积（M³）','number'],['manufacturer','制造单位名称','manufacturer',true],
 ['manufacturerCreditCode','统一社会信用代码'],['manufacturingLicense','制造许可证号'],['country','制造国家（地区）名称'],
 ['manufacturedDate','制造日期','date'],['manufacturingAddress','制造详细地址'],['manufacturingStandard','制造规范'],['positionNumber','位号'],
 ['licenseScope','许可范围'],['licenseLevel','许可证级别'],['remarks','备注','textarea',false,true]
];
V2BoilerProducts.register('vessel-product',{title:'压力容器产品编辑',pageTitle:'压力容器产品管理',fields,rows,categories,categoryRoot:'压力容器',readonly:true});
})();

