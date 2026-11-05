/* Single source for form fields, import columns and the downloadable template. */
window.V2SafetyValveSchema=(()=>{
const fields=[
 ['unitName','使用单位名称','text',true],['creditCode','统一社会信用代码'],
 ['unitAddress','使用单位地址','text',true,true],['pressureLevel','压力等级','text',true],['flowDiameter','流通直径','number'],
 ['manufacturingLicense','制造许可证编号'],['factoryDate','出厂日期','date'],
 ['installationName','装置名称','text',true],['position','位号'],
 ['valveType','安全阀类型','select',false,false,['弹簧','杠杆','先导式']],
 ['model','安全阀型号'],['nominalPressure','公称压力','number',true],['nominalDiameter','公称通径','number',true],
 ['productNumber','产品编号','text',true],['equipment','所属设备'],['manufacturer','制造厂家','text',false,true],
 ['workingPressure','工作压力','number'],['medium','工作介质'],['requiredSetPressure','要求整定压力','number',true],
 ['requiredReseatPressure','要求回座压力','number'],
 ['calibrationMethod','校验方式','select',false,false,['离线（演示）','在线（演示）']],
 ['calibrationMedium','校验介质'],['setPressure','整定压力（MPa）','number'],['reseatPressure','回座压力（MPa）','number'],
 ['openingHeight','开启高度（mm）','number'],['sealPressure','密封试验压力（MPa）','number'],
 ['outletSealTest','出口密封试验'],['leadSeal','铅封'],
 ['businessTag','最新业务标签','select',false,false,['演示待校验','演示已记录']],
 ['status','状态','select',false,false,['正常','停用']]
].map(([key,label,type='text',required=false,wide=false,options=[]])=>({key,label,type,required,wide,options}));
const importFields=[...fields,{key:'inspectionDate',label:'检验日期',type:'date'},{key:'nextInspectionDate',label:'下检日期',type:'date'}];
return {fields,importFields,sheetName:'安全阀导入',headers:importFields.map(f=>f.label)};
})();

