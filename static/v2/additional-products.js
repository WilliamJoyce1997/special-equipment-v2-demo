/* Elevator/crane product configuration: shared product UI with type-specific parameters. */
(()=>{
'use strict';
const identity=[
 ['equipmentCode','设备代码','text',true],['name','产品名称'],['category','设备类别','category',false,true],
 ['productNumber','产品编号','text',true],['model','产品型号'],['contractNumber','合同号'],['productionNumber','生产编号'],['customer','用户名称'],['isExport','是否出口','select',false,false,['是','否']]
];
const manufacturing=[
 ['manufacturer','制造单位名称','manufacturer',true],['manufacturerCreditCode','统一社会信用代码'],['manufacturingLicense','制造许可证号'],
 ['country','制造国家（地区）名称'],['manufacturedDate','制造日期','date'],['manufacturingAddress','制造详细地址'],['manufacturingStandard','制造规范'],
 ['licenseScope','许可范围'],['licenseLevel','许可证级别'],['specification','产品规格'],['remarks','备注','textarea',false,true]
];
for(const [type,asset,prefix,title,parameters,values] of [
 ['elevator-product','elevator','DT','电梯',[
 ['ratedCapacity','额定载重量（kg）','number'],['ratedSpeed','额定速度（m/s）','number'],
 ['floorCount','层数','number'],['stopCount','站数','number'],['driveMode','驱动方式']
 ],i=>({ratedCapacity:630+i*170,ratedSpeed:1+i*0.5,floorCount:10+i*5,stopCount:10+i*5,driveMode:'演示驱动配置'})],
 ['crane-product','crane','QZ','起重机械',[
 ['ratedLoad','额定起重量（t）','number'],['span','跨度（m）','number'],['liftingHeight','起升高度（m）','number'],['dutyClass','工作级别']
 ],i=>({ratedLoad:5+i*5,span:10+i*2,liftingHeight:8+i*2,dutyClass:'演示工作级别'})]
]){
 const tree=V2ProductCategories.trees[type],manufacturer=V2.fixtures[asset].find(r=>r.manufacturer)?.manufacturer||V2BoilerProducts.rows[0].manufacturer;
 const rows=Array.from({length:3},(_,i)=>({id:'DEMO-'+prefix+'-PRODUCT-00'+(i+1),equipmentCode:'DEMO-PRODUCT-'+prefix+'-00'+(i+1),
 name:'DEMO-'+title+'产品-'+(i+1),manufacturer,model:'DEMO-'+prefix+'-MODEL-'+(i+1),productNumber:'DEMO-'+prefix+'-PRODUCT-NO-'+(i+1),
 category:tree[i][1][0],categoryGroup:tree[i][0],createdAt:'2026-10-0'+(i+1)+' 09:00:00',isExport:'否',manufacturedDate:'2026-09-0'+(i+1),
 specification:'DEMO-'+prefix+'-SPEC-'+(i+1),remarks:'DEMO虚构'+title+'产品，非在用设备台账，无真实许可效力',...values(i)}));
 V2BoilerProducts.register(type,{title:title+'产品编辑',pageTitle:title+'产品管理',rows,fields:[...identity,...parameters,...manufacturing],readonly:false});
}
})();

