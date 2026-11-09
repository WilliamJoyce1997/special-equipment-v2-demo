/* Single source for form fields, import columns and the downloadable template. */
window.V2SafetyValveSchema=(()=>{
const enums={
 valveType:['弹簧','重锤式','杠杆式'],
 calibrationMethod:['校验台','在线','回座校验台'],
 businessTag:['定期检验','安装监检','进口监检','驻厂监检','新装验收','普查验收','移梯验收','停启验收','改造验收','大修验收','重新验收','型式试验'],
 status:['正常','无效'],
 inspectionConclusion:['合格','不合格','复检合格','复检不合格','监护使用','整改后合格']
};
const fields=[
 ['unitName','使用单位名称','text',true],['creditCode','统一社会信用代码'],
 ['unitAddress','使用单位地址','text',true,true],['pressureLevel','压力等级','text',true],['flowDiameter','流通直径','number'],
 ['manufacturingLicense','制造许可证编号'],['factoryDate','出厂日期','date'],
 ['installationName','装置名称','text',true],['position','位号'],
 ['valveType','安全阀类型','select',false,false,enums.valveType],
 ['model','安全阀型号'],['nominalPressure','公称压力','number',true],['nominalDiameter','公称通径','number',true],
 ['productNumber','产品编号','text',true],['equipment','所属设备'],['manufacturer','制造厂家','text',false,true],
 ['workingPressure','工作压力','number'],['medium','工作介质'],['requiredSetPressure','要求整定压力','number',true],
 ['requiredReseatPressure','要求回座压力','number'],
 ['calibrationMethod','校验方式','select',false,false,enums.calibrationMethod],
 ['calibrationMedium','校验介质'],['setPressure','整定压力（MPa）','number'],['reseatPressure','回座压力（MPa）','number'],
 ['openingHeight','开启高度（mm）','number'],['sealPressure','密封试验压力（MPa）','number'],
 ['outletSealTest','出口密封试验'],['leadSeal','铅封'],
 ['businessTag','最新业务标签','select',false,false,enums.businessTag],
 ['status','状态','select',false,false,enums.status]
].map(([key,label,type='text',required=false,wide=false,options=[]])=>({key,label,type,required,wide,options}));
const importFields=[...fields,{key:'inspectionDate',label:'检验日期',type:'date'},{key:'nextInspectionDate',label:'下检日期',type:'date'}];
const inspectionFields=[
 ['inspectionAgency','检验机构','text',true],
 ['inspectionNature','检验性质','select',false,V2BoilerSchema.enums.inspectionNature],
 ['firstInspectionDate','首次检验日期','date'],
 ['lastInspectionDate','上次检验日期','date'],
 ['nextInspectionDate','下次检验日期','date'],
 ['inspectionDate','检验日期','date'],
 ['inspectionConclusion','检验结论','select',false,enums.inspectionConclusion],
 ['inspectionReportNumber','检验报告书编号'],
 ['inspector','检验人员'],
 ['inspectionProblems','检验主要问题','text',true]
].map(([key,label,type='text',wide=false,options=[]])=>({key,label,type,wide,options}));
return {fields,importFields,inspectionFields,sheetName:'安全阀导入',headers:importFields.map(f=>f.label)};
})();

