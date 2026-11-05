/* All values are fictional, generated locally, never legal inspection evidence. No write API. */
window.V2.fixtures=Object.fromEntries(['boiler','vessel','elevator'].map((type,index)=>{
 const t=V2.types[type];
 return [type,Array.from({length:8},(_,i)=>{
 const n=i+1,code=String(n).padStart(3,'0'),yes=n%2?'是':'否';
 return {id:type+'-'+n,name:['云岚演示蒸汽锅炉','星河演示储气容器','晴川演示乘客电梯'][index]+code,
 regulatoryCode:'DEMO-ZH-'+(index+1)+'-'+code,equipmentCode:'DEMO-'+['GL','RQ','DT'][index]+'-'+code,
 registrationCode:'DEMO-REG-'+(index+1)+'-'+code,certificate:'模拟使用证-'+code,model:['WNS-DEMO','CQ-DEMO','TK-DEMO'][index]+'-'+n,
 category:t.categories[i%t.categories.length],unit:['云岚虚构实业（演示）','星河虚构科技（演示）','晴川虚构园区（演示）'][i%3],
 contact:'演示联系人'+n,phone:'虚构电话 000-0000-'+String(n).padStart(4,'0'),
 region:V2.options.region[i%2],status:i===7?'报废':i%3===0?'停用':'在用',acceptance:i%2?'未受理':'已受理',
 department:i%2?'演示二部':'演示一部',pinyin:['YL','XH','QC'][i%3],internalCode:'DEMO-IN-'+code,
 authority:i%2?'演示监管二处':'演示监管一处',important:yes,registration:i%3?'已登记':'未登记',
 place:['工厂','公共场所','住宅','园区'][i%4],handled:'2026-'+String(i+1).padStart(2,'0')+'-10',
 inspected:'2026-'+String(i+1).padStart(2,'0')+'-20',fuel:V2.options.fuel[i%3],designFuel:V2.options.fuel[i%3],
 evaporation:n*2,power:Number((n*0.7).toFixed(1)),purpose:V2.options.purpose[i%3],quickDoor:yes,
 insured:yes,pilot:yes,onDemand:i%3?'否':'是',age:n+1,baseMonth:n+'月',
 testingOrg:'云岚模拟检测机构（虚构）',inspectionOrg:'星河模拟检验机构（虚构）',
 inspectionStatus:'模拟记录 / 无法定效力',source:'前端虚构样本，仅用于 UI 演示，不写入数据库'};
 })];
}));



/* Second batch: independent fictional records. Dates are authored samples, not calculated inspection cycles. */
V2.demoBase=(type,prefix,index)=>Array.from({length:8},(_,i)=>{
 const n=i+1,code=String(n).padStart(3,'0'),t=V2.types[type];
 return {id:type+'-'+n,sequence:n,actions:'只读演示（虚构数据）',name:t.title+'演示设备'+code,
 regulatoryCode:'DEMO-ZH-'+prefix+'-'+code,equipmentCode:'DEMO-'+prefix+'-'+code,
 registrationCode:'DEMO-REG-'+prefix+'-'+code,certificate:'模拟使用证-'+prefix+'-'+code,
 model:prefix+'-DEMO-'+n,category:t.categories[i%t.categories.length],
 unit:['云岚虚构实业（演示）','星河虚构科技（演示）','晴川虚构园区（演示）'][i%3],
 contact:'演示联系人'+n,phone:'虚构电话 000-0000-'+String(n).padStart(4,'0'),
 region:V2.options.region[i%2],status:i===7?'报废':i%3===0?'停用':'在用',acceptance:i%2?'未受理':'已受理',
 department:i%2?'演示二部':'演示一部',pinyin:['YL','XH','QC'][i%3],internalCode:'DEMO-IN-'+prefix+'-'+code,
 authority:i%2?'演示监管二处':'演示监管一处',important:i%2?'否':'是',registration:i%3?'已登记':'未登记',
 place:['工厂','公共场所','住宅','园区'][i%4],handled:'2026-'+String(n).padStart(2,'0')+'-10',
 inspected:'2026-'+String(n).padStart(2,'0')+'-20',inspectionKind:i%2?'监督检验（模拟）':'定期检验（模拟）',
 testingOrg:'云岚模拟检测机构（虚构）',inspectionOrg:'星河模拟检验机构（虚构）',
 inspectionStatus:'模拟记录 / 无法定效力',source:'前端虚构样本，仅用于 UI 演示，不写入数据库',
 capacity:n*5,span:n+10,plate:'DEMO-PLATE-'+code,load:n*500,powerSource:i%2?'内燃':'电动',
 identificationCode:'DEMO-ID-'+prefix+'-'+code,passengers:n*4,height:n*3,
 lineLength:n*250,speed:Number((n*0.4).toFixed(1)),hourlyCapacity:n*120,
 history:[{date:'2026-01-05',actor:'演示资料员',field:'设备名称',before:'待完善（虚构）',after:t.title+'演示设备'+code},{date:'2026-02-06',actor:'演示核对员',field:'档案校对',before:'待校对',after:'已校对（模拟记录）'}]
 };
});
for(const [type,prefix,index] of [['crane','QZ',4],['vehicle','CC',5],['amusement','YL',6],['ropeway','SD',7]])
 V2.fixtures[type]=V2.demoBase(type,prefix,index);



// Fictional crane records exercise both levels and the two separate inspection filters.
const craneSchema=V2EquipmentSchema.get('crane');
for(const [i,row] of V2.fixtures.crane.entries()){
 const child=craneSchema.category[row.category][0];
 row.category+=' / '+child;
 row.place=craneSchema.enums.place[i%craneSchema.enums.place.length];
 row.latestInspectionKind=i%2?'安装监检':'定期检验';
 row.inspectionKind=i%2?'监督检验':'定期检验';
 row.inspectionNature='正常检验';
}

// Fictional vehicle records keep both inspection categories independently filterable.
const vehicleSchema=V2EquipmentSchema.get('vehicle');
for(const [i,row] of V2.fixtures.vehicle.entries()){
 if(row.category==='叉车')row.category='机动工业车辆 / 叉车';
 row.place=vehicleSchema.enums.place[i%vehicleSchema.enums.place.length];
 row.latestInspectionKind=i%2?'安装监检':'定期检验';
 row.inspectionKind=i%2?'监督检验':'定期检验';
 row.inspectionNature='正常检验';
 row.governorInspection=i%2?'否':'是';
}

V2.fixtures.installation=V2.demoBase('installation','ZZ',8).map((r,i)=>({...r,
 installationName:'云岚虚构工程装置'+String(i+1).padStart(3,'0'),
 creditCode:'DEMO-CREDIT-'+String(i%3+1).padStart(3,'0'),created:'2026-'+String(i+1).padStart(2,'0')+'-02',
 noticeNumber:'DEMO-NOTICE-'+String(i+1).padStart(3,'0'),registeredDate:'2026-'+String(i+1).padStart(2,'0')+'-09'
}));
V2.fixtures.pipeline=V2.demoBase('pipeline','GX',9).map((r,i)=>{
 const a=V2.fixtures.installation[i];
 return {...r,installationId:a.id,installationName:a.installationName,unit:a.unit,region:a.region,creditCode:a.creditCode,created:a.created,
 pipeName:['蒸汽工艺管线','燃气输送管线'][i%2]+'（演示）'+(i+1),street:['演示青岚街道','演示星澜街道'][i%2],
 pipelineNumber:'DEMO-PIPE-'+String(i+1).padStart(3,'0'),pipeLevel:i%2?'GB1':'GC2',importantPipeline:i%2?'否':'是',
 specification:'DN'+[80,100,125,150,200,250,300,350][i]+' / 模拟规格',
 maxPressure:Number((0.2+i*0.1).toFixed(1)),maxTemperature:60+i*10,length:120+i*100,
 designOrg:'云岚虚构设计单位（演示）',installOrg:'星河虚构安装单位（演示）',medium:i%2?'燃气（模拟）':'蒸汽（模拟）',
 safetyGrade:'2级（模拟）',inspectionStatus:i%2?'未报检（模拟）':'已记录（模拟）',
 nextInspection:['2027-01-17','2027-03-12','2027-06-08','2027-02-21','2027-09-03','2027-11-19','2028-02-10','2028-05-16'][i],
 fullInspectionReport:'DEMO-FULL-REPORT-'+String(i+1).padStart(3,'0'),
 fullInspectionDate:['2025-01-05','2025-03-18','2025-04-09','2025-07-12','2025-08-22','2025-10-14','2025-11-06','2025-12-16'][i],
 safetyManager:'演示安管员'+(i+1),safetyPhone:'虚构电话 000-1000-'+String(i+1).padStart(4,'0'),
 startPoint:a.installationName+' / A端',endPoint:a.installationName+' / B端'
 };
});



/* Complete column revision: enrich only applicable fields; all dates are authored fictional values. */
const demoNextDates=['2027-01-17','2027-03-12','2027-06-08','2027-02-21','2027-09-03','2027-11-19','2028-02-10','2028-05-16'];
const demoNextTestingDates=['2027-02-08','2027-04-19','2027-07-03','2027-05-26','2027-10-12','2028-01-09','2028-03-21','2028-06-07'];
const demoNextExternalDates=['2028-02-13','2028-06-05','2028-03-16','2028-09-20','2029-01-08','2029-04-27','2029-06-18','2029-10-02'];
const demoManufacturedDates=['2024-01-08','2023-02-14','2022-03-21','2021-04-12','2020-05-06','2019-06-18','2018-07-25','2017-08-10'];
const demoCommissionedDates=['2024-04-08','2023-05-14','2022-06-21','2021-07-12','2020-08-06','2019-09-18','2018-10-25','2017-11-10'];
for(const [type,t] of Object.entries(V2.types)){
 V2.fixtures[type]=V2.fixtures[type].map((original,i)=>{
  const n=i+1,code=String(n).padStart(3,'0'),tag=type.toUpperCase(),month=String(n).padStart(2,'0');
  const common={
   sequence:n,actions:'只读演示：虚构演示样本，无法定效力',
   factoryNumber:'DEMO-FACTORY-'+tag+'-'+code,
   usageLocation:'演示地点 / '+t.title+'区域'+code,internalLocation:'演示内部位置 / '+t.title+'区段'+code,
   reportNumber:'DEMO-REPORT-'+tag+'-'+code,registrationOrg:'云岚虚构登记机构（演示）',
   registeredDate:'2026-'+month+'-09',registrationCertificate:'DEMO-USE-REG-'+tag+'-'+code,
   manufacturer:'星河虚构制造单位（演示）',manufactured:demoManufacturedDates[i],
   safetyDirector:'演示安全总监'+n,safetyOfficer:'演示安全员'+n,nextInspection:original.nextInspection||demoNextDates[i]
  };
  const extras={
   boiler:{internalInspectionDate:'2026-'+month+'-05',nextInternalInspectionDate:demoNextDates[i],
    externalInspectionDate:'2026-'+month+'-15',nextExternalInspectionDate:demoNextExternalDates[i],
    drumPressure:Number((0.5+n*0.1).toFixed(1)),ratedPressure:Number((1+n*0.1).toFixed(1)),
    heatingMethod:original.fuel==='电'?'电加热（模拟）':'燃烧加热（模拟）',powerStationBoiler:i%2?'是':'否'},
   vessel:{fullInspectionDate:'2025-'+month+'-08',nextFullInspectionDate:demoNextDates[i],
    annualInspectionDate:'2026-'+month+'-18',nextAnnualInspectionDate:demoNextTestingDates[i],
    vesselVolume:Number((1.5+n*0.75).toFixed(2))},
   elevator:{currentReportingOrg:'晴川虚构当前报检机构（演示）',testingDate:'2026-'+month+'-05',
    residentialElevator:original.category==='曳引驱动乘客电梯'&&original.place==='住宅'?'是':'否',carDecoration:i%2?'模拟不锈钢装潢':'模拟涂装轿厢',
    maintenanceOrg:'青岚虚构维保单位（演示）',inspectionTestingNature:'定期检验与自行检测（模拟）',
    nextTestingDate:demoNextTestingDates[i],insuranceMode:original.insured==='是'?'单位投保（模拟）':'未投保（演示）',
    insurer:original.insured==='是'?'星澜虚构承保单位（演示）':null,policyValidUntil:original.insured==='是'?'2027-'+month+'-28':null,
    maintenancePhone:'虚构电话 000-2000-'+code,maintenanceContact:'演示维保负责人'+n,
    commissionedDate:demoCommissionedDates[i],supervisorName:'演示监管人员'+n,supervisorPhone:'虚构电话 000-3000-'+code,
    inspectionNature:'定期检验（模拟）',registrationFormNumber:'DEMO-FORM-DT-'+code,
    acceptedTestingOrg:'星河虚构受理检测机构（演示）',testingHandledDate:'2026-'+month+'-02'},
   vehicle:{vehicleRegistrationCertificate:'DEMO-VEHICLE-REG-'+code},
   installation:{installationCertificate:'DEMO-INSTALLATION-CERT-'+code},
  }[type]||{};
  const merged={...original,...common,...extras};
  const applicable=new Set([...t.detailFields.map(f=>f.key),...t.queries.map(f=>f.key),'id','source','history','equipmentCode','registrationCode','contact','installationId']);
  const inspectionSchema={crane:craneSchema,vehicle:vehicleSchema}[type];
  if(inspectionSchema)for(const field of inspectionSchema.advanced)applicable.add(field.key);
  return Object.fromEntries(Object.entries(merged).filter(([key])=>applicable.has(key)));
 });
}
for(const a of V2.fixtures.installation){
 const pipes=V2.fixtures.pipeline.filter(r=>r.installationId===a.id);
 a.pipelineCount=pipes.length;a.pipelineTotalLength=pipes.reduce((sum,r)=>sum+r.length,0);
}
V2BoilerSchema.prepareRows(V2.fixtures.boiler);

for(const t of V2EquipmentSchema.supported)V2EquipmentSchema.prepareRows(t,V2.fixtures[t]);
