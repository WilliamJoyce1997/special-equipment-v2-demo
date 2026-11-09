/* Pipe component/project products: distinct records; shared product actions and dialogs. */
(()=>{
'use strict';
const col=(key,label,width=190)=>({key,label,width,type:'text',sortable:true});
const q=(key,label)=>({key,label,type:'text',options:[],placeholder:'请输入'});
const manufacturing=[
 ['manufacturer','制造单位名称','manufacturer',true],['manufacturerCreditCode','统一社会信用代码'],['manufacturingLicense','制造许可证号'],
 ['country','制造国家（地区）名称'],['manufacturedDate','制造日期','date'],['manufacturingAddress','制造详细地址']
];
const componentFields=[
 ['equipmentCode','设备代码','text',true],['name','产品名称'],['category','设备类别','category',false,true],
 ['productNumber','产品编号','text',true],['model','产品型号'],['productLevel','产品级别'],['contractNumber','合同号'],
 ['productionNumber','生产编号'],['characteristics','产品特征'],['purchaser','购货单位'],['isExport','是否出口','select',false,false,['是','否']],
 ['rawMaterial','制造原材料'],['creditLetter','信用证号'],['description','产品描述'],['executionStandard','执行标准'],
 ['length','长度','number'],['weight','重量','number'],['parameterGrade','设备参数等级'],['drawingNumber','总图图号'],
 ['qualityCertificate','质证号'],['designLife','设计使用年限','number'],...manufacturing,
 ['componentCount','管道元件数量','number'],['startNumber','起始编号'],['endNumber','截止编号'],['remarks','备注','textarea',false,true]
];
const projectFields=[
 ['name','工程项目名称','text',true],['contractNumber','合同编号'],['executionStandard','执行标准','text',true],
 ['customer','委托方（订货单位）'],['cargoDescription','货物描述'],['carNumber','车号'],['issueDate','出证日期','date'],
 ['totalLength','总长度','number'],['totalWeight','总重量','number'],['specification','规格'],['steelGrade','钢级'],
 ...manufacturing,['remarks','备注','textarea',false,true]
];
const manufacturer=V2.fixtures.pipeline.find(r=>r.manufacturer)?.manufacturer||V2BoilerProducts.rows[0].manufacturer;
const componentRows=Array.from({length:3},(_,i)=>({
 id:'DEMO-COMPONENT-PRODUCT-00'+(i+1),equipmentCode:'DEMO-COMPONENT-CODE-00'+(i+1),name:'DEMO-管道元件产品-'+(i+1),
 manufacturer,productNumber:'DEMO-COMPONENT-NO-'+(i+1),model:'DEMO-COMPONENT-MODEL-'+(i+1),
 category:V2ProductCategories.trees['pipe-component'][i][1][0],createdAt:'2026-10-0'+(i+1)+' 09:00:00',
 productLevel:'演示级别',contractNumber:'DEMO-COMPONENT-CONTRACT-'+(i+1),isExport:'否',rawMaterial:'演示原材料',
 executionStandard:'DEMO-COMPONENT-STD-'+(i+1),length:10+i,weight:20+i*2,designLife:10,componentCount:5+i,
 startNumber:'DEMO-START-'+(i+1),endNumber:'DEMO-END-'+(i+1),manufacturedDate:'2026-09-0'+(i+1),
 remarks:'虚构管道元件产品，仅演示，无真实制造许可或质证效力'
}));
const projectRows=Array.from({length:3},(_,i)=>({
 id:'DEMO-PIPE-PROJECT-00'+(i+1),equipmentCode:'DEMO-INTERNAL-PJ-'+(i+1),productNumber:'DEMO-INTERNAL-PJ-NO-'+(i+1),
 manufacturer,name:'DEMO-管道工程项目-'+(i+1),contractNumber:'DEMO-PJ-CONTRACT-'+(i+1),executionStandard:'DEMO-PJ-STD-'+(i+1),
 customer:'DEMO-虚构订货单位-'+(i+1),cargoDescription:'演示管道工程货物',carNumber:'DEMO-CAR-'+(i+1),
 issueDate:'2026-10-0'+(i+1),totalLength:100+i*25,totalWeight:200+i*50,specification:'DEMO-PJ-SPEC-'+(i+1),steelGrade:'演示钢级-'+(i+1),
 manufacturedDate:'2026-09-0'+(i+1),remarks:'虚构工程产品资料，出证日期仅演示字段，无真实证明效力'
}));
V2BoilerProducts.register('pipe-component',{title:'管道元件产品编辑',pageTitle:'管道元件产品管理',fields:componentFields,rows:componentRows,readonly:true,menuLabel:'更多>>',rowStarts:['startNumber'],accessories:{productNumber:{label:'未知',title:'只读演示，不支持设为未知编号'},manufacturer:{label:'⌕',title:'只读演示，未接通外部制造单位搜索'}}});
V2BoilerProducts.register('pipe-project',{
 title:'管道工程产品编辑',pageTitle:'管道工程产品管理',fields:projectFields,rows:projectRows,readonly:true,menuLabel:'更多>>',rowStarts:['manufacturer'],accessories:{manufacturer:{label:'⌕',title:'只读演示，未接通外部制造单位搜索'}},
 columns:[col('manufacturer','制造单位名称',300),col('name','工程项目名称',270),col('contractNumber','合同编号',220),col('executionStandard','执行标准',220),
 col('customer','委托方（订货单位）',270),col('carNumber','车号'),col('issueDate','出证日期'),col('totalLength','总长度',160),col('specification','规格',220),col('steelGrade','钢级',180)],
 queries:[q('search','综合查询'),q('manufacturer','制造单位'),q('executionStandard','执行标准')],
 searchKeys:['name','contractNumber','executionStandard','customer','carNumber','specification','steelGrade']
});
})();

