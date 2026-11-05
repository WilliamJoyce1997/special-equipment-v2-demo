/* Read-only dossier views; all data comes from the selected local fictional row. */
window.V2Dossier=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const btn=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const fields=text=>text.split(';').filter(Boolean).map(s=>{const [key,label,kind]=s.split('|');return {key,label,kind};});
const group=(title,text)=>({title,fields:Array.isArray(text)?text:fields(text)});
const subtabs=['设备主题信息','设备相关信息','参数信息','设备检验信息','隐患治理记录','设备附件','全部'];
const changeHeaders=['变更方式','变更原因','变更日期','申请单位名称','受理机构','受理机构地区代码','回退原因','车辆Ukey'];
const inspectionHeaders=['检验类别','检验结论','检验日期','下检日期','检验机构','检验部门','检验性质','报告编号','业务流水号','来源','添加人','添加时间'];
const inspectionKinds=['内部检验','外部检验','水质检验','安装监检','驻厂监检','进口监检'];
const hazardHeaders=['隐患来源','现场检查时间','检验检测时间','问题隐患描述','是否重大事故隐患','整改治理完成时间'];
const attachmentHeaders=['名称','型号','规格','结构（型式）','数量','制造单位'];
let serial=0;

// Type-specific definitions approved against the six supplied references.
const safetyValveTypes=new Set(['boiler','vessel','elevator','installation','pipeline']);
const F=(key,label,kind='text',required=false,wide=false,action=null)=>({key,label,kind,required,wide,action});
function latestTestingDefs(){return [
 group('检测信息',[
 F('installationInspectionDate','安装监检日期','date'),F('alterationInspectionDate','改造监检日期','date'),
 F('majorRepairInspectionDate','大修监检日期','date'),F('lastSupervisionInspectionType','最后一次监督检验类型','select'),
 F('baseYear','基准年'),F('baseMonth','基准月'),F('age','梯龄'),F('testingOrg','检测机构名称'),
 F('testingReportNumber','检测报告编号'),F('noInsuranceExplanation','无保险说明'),
 F('insurer','承保单位'),{...F('policyValidFrom','保单有效期','date'),rangeEnd:'policyValidUntil'},
 F('insured','电梯保险','select'),F('inspectionTestingNature','检验检测性质','select'),
 F('testingDate','检测日期','date'),F('nextTestingDate','下次检测日期','date',false,false,'生成'),
 F('testingConclusion','检测结论'),F('testingInspector','检测人员'),F('testingProblems','检测的主要问题','textarea')
 ]),
 group('当前业务状态',[F('acceptedTestingOrg','受理检测机构名称'),F('testingAcceptance','受理状态','select'),F('testingAcceptedAt','受理时间')])
];}
function pipelineSubjectDefs(){return [
 group('管道基本情况',[
 F('pipeLevel','管道级别','select',true),F('specification','管道规格','text',true),
 F('length','管道长度（m）','text',true),F('pipeMaterial','管道材料','select',true),
 F('designPressure','设计压力','text',true),F('designTemperature','设计温度（℃）','text',true),
 F('medium','工作介质','text',true),F('status','使用状态','select',true),
 F('region','管道装置所在地区','select',true),F('commissionedDate','投用日期','date',true),
 F('usageLocation','管道装置详细地址','text',false,true),
 F('installationCompleted','安装竣工日期','date',true),F('fixedAssetValue','固定资产产值（万）'),
 F('pipeName','管道名称'),F('importantPipeline','是否为重要压力管道','select'),
 F('pipelineNumber','管道编号'),F('installationName','装置名称'),
 F('regulatoryCode','智慧监管编码'),F('safetyDirector','安全总监'),F('safetyOfficer','安全员'),F('category','管道类别','select'),
 F('registrationOrg','注册登记机构'),F('registeredDate','注册登记日期','date'),
 F('registrationCode','管道注册代码','text',false,false,'生成'),F('identificationCode','设备识别码'),
 F('updatedDate','更新日期','date'),F('statusChangedDate','使用状态变更日期','date'),
 F('internalCode','单位内部编号（序号）'),F('registrationStaff','注册登记人员'),
 F('unit','使用单位'),F('creditCode','使用单位代码'),F('ownerOrg','产权单位'),F('ownerCredit','产权单位统一社会信用代码'),
 F('safetyDepartment','安全管理部门'),F('safetyManager','安全管理人员'),F('phone','联系电话'),F('postcode','邮政编码'),
 F('designOrg','设计单位'),F('installOrg','安装单位'),F('designCredit','设计单位代码'),F('installationCredit','安装单位统一社会信用代码'),
 F('designDate','设计日期','date'),F('acceptanceDate','验收日期','date'),
 F('manufacturingInspectionOrg','监检单位'),F('manufacturingInspectionCredit','监检单位统一社会信用代码'),
 F('constructionOrg','建设单位'),F('constructionCredit','建设单位统一社会信用代码'),
 F('supervisionOrg','监理单位'),F('supervisionCredit','监理单位统一社会信用代码'),
 F('testingOrg','检测单位'),F('testingCredit','检测单位统一社会信用代码'),
 F('manufacturer','制造单位名称'),F('manufacturingPermit','制造单位许可证编号'),
 F('barrierOrg','防障单位'),F('barrierCredit','防障单位统一社会信用代码'),
 F('startPoint','管道起点'),F('endPoint','管道止点'),F('longitude','经度'),F('latitude','纬度'),F('altitude','海拔'),
 F('layingMethod','敷设方式','select'),F('weldCount','焊缝数'),F('buried','是否埋地','select'),
 F('testingRatio','探伤比例'),F('insulationMethod','保温绝热方式','select'),
 F('maxPressure','最高工作压力'),F('maxTemperature','最高工作温度（℃）'),
 F('corrosionProtection','防腐方式'),F('marking','标识'),F('corrosionAllowance','腐蚀裕量'),F('insulationMaterial','绝热层材料'),
 F('insulationThickness','绝热层厚度'),F('coatingMaterial','防腐层材料'),
 F('designCode','设计规范'),F('constructionAcceptanceCode','施工与验收规范'),
 F('safetyGrade','安全状况等级','select'),F('singleLineDrawing','单线图号'),F('accidentCategory','事故类别','select'),
 F('pipeMaterialGrade','管子材料牌号'),F('fittingCount','管件数'),F('repairOrg','返修单位'),F('repairCredit','返修单位代码'),
 F('toxicityLevel','毒性危害程度','select'),F('explosiveMedium','是否爆炸危险介质','select'),
 F('created','设备创建时间','metadata'),F('createdBy','创建人','metadata'),
 F('modifiedDate','最后修改时间','metadata'),F('modifiedBy','最后修改人','metadata'),F('hazardousChemicalPipeline','涉危化品管道','select')
 ]),
 group('检验机构情况',[
 F('pipelineNodeCount','管道节点数（节）'),F('pipeSectionCount','管子节数（节）'),
 F('inspectionOrg','检验责任主体机构名称','text',true),F('inspectionCredit','检验机构代码'),
 F('firstInspectionDate','首次检验日期','date'),F('organizationUnit','组织单元','select'),
 F('previousInspectionDate','上次检验日期','date'),F('safetyValveInspection','安全阀校验情况','select'),
 F('inspectionKind','检验类别','select'),F('handlingStatus','办理状态','select'),F('handled','办理日期','date')
 ]),
 group('设备资料与管理制度',[F('remarks','备注','textarea')])
];}
function pipelineInspectionDefs(){return [
 group('检验机构情况',[F('inspectionOrg','检验责任主体机构名称','text',true),F('organizationUnit','组织单元','select'),F('inspectionCredit','社会信用代码'),F('inspectionNature','检验性质','select'),F('firstInspectionDate','首次检验日期','date')]),
 ...[['full','全面检验'],['online','在线检验']].map(([prefix,title])=>group(title,[
 F('_'+prefix+'Department','检验部门','select'),F('_'+prefix+'Inspector','检验员'),
 F('_'+prefix+'Report','报告书编号'),F('_'+prefix+'PreviousDate','上次检验日期','date'),
 F('_'+prefix+'Date','检验日期','date'),F('_'+prefix+'NextDate','下次检验日期','date'),
 F('_'+prefix+'Conclusion','检验结论','select'),F('_'+prefix+'Problems','主要问题')
 ])),
 group('当前业务状态',[F('inspectionKind','检验类别','select'),F('handlingStatus','办理状态','select'),F('handled','办理日期','date'),F('safetyValveInspection','安全阀校验情况','select'),F('safetyValveInspectionDate','安全阀校验日期','date')])
];}

function installationDefs(){return [
 group('设备使用单位情况',[
 F('_installationCategory','设备类别','select',true),F('unit','使用单位名称','text',true,false,'详细'),
 F('region','管道装置所在地区','select',true),F('unitAddress','使用单位地址'),
 F('usageLocation','管道装置详细地址','text',false,true),
 F('status','使用状态','select',true),F('registration','注册状态','select',true),
 F('installationName','工程装置名称'),F('installationCertificate','使用登记证编号'),
 F('summaryNumber','汇总表编号'),F('petrochemicalInstallation','是否石化与化工装置','select'),
 F('regulatoryCode','智慧监管编码'),F('safetyDirector','安全总监'),F('safetyOfficer','安全员'),F('longitude','经度'),
 F('latitude','纬度'),F('pipelineCount','管道单元数（条）'),F('altitude','海拔'),F('pipelineTotalLength','管道总长度（m）'),
 F('industry','单位所属行业','select'),F('identificationCode','设备识别码'),
 F('safetyDepartment','安全管理部门'),F('departmentHead','部门负责人'),
 F('safetyManager','安全管理人员'),F('phone','联系电话'),F('agentName','经办人'),F('issuingKind','发证类型','select'),
 F('registrationOrg','注册登记机构'),F('issuingOrg','发证机构'),F('registrationStaff','注册登记人员'),F('registeredDate','注册登记日期','date'),
 F('statusChangedDate','使用状态变更日期','date'),F('reviewDate','审核日期','date'),F('issuedDate','发证日期','date'),F('validUntil','有效期限','date'),
 F('importantMonitoring','是否重点监控','select'),F('updatedDate','更新日期','date'),F('operatorName','作业人员名称','metadata')
 ]),
 group('检验机构情况',[
 F('inspectionOrg','检验责任主体机构名称','text',true),F('firstInspectionDate','首次检验日期','date'),
 F('organizationUnit','组织单元','select'),F('previousInspectionDate','上次检验日期','date'),
 F('safetyValveInspection','安全阀校验情况','select'),F('inspectionKind','检验类别','select'),
 F('handlingStatus','办理状态','select'),F('handled','办理日期','date')
 ]),
 group('设备资料与管理制度',[
 F('remarks','备注','textarea'),F('monitoringConnected','智能化监测装置入网情况','select'),
 F('monitoringConnectedDate','智能化监测装置入网时间','date'),F('monitoringStatus','智能化监测装置运行状态','select'),
 F('monitoringSupplier','智能化监测装置供应商'),F('liabilityInsurance','是否购买责任保险','select')
 ]),
 group('安装单位情况',[
 F('installOrg','安装单位'),F('installationPermit','安装许可证'),
 F('installationStarted','安装施工开始日期','date'),F('installationNoticeNumber','安装告知受理编号'),
 F('installationNoticeDate','安装告知日期','date'),F('installationPhone','安装联系电话')
 ])
];}
const installationPipelineColumns=[
 ['identificationCode','设备识别码'],['pipeName','管道名称'],['installationName','装置名称'],['pipelineNumber','管道编号'],
 ['pipeLevel','管道级别'],['length','管道长度（m）','number'],['designOrg','设计单位'],['installOrg','安装单位'],
 ['medium','介质'],['category','管道类别'],['safetyGrade','安全级别'],['status','使用状态'],
 ['registrationCode','注册代码'],['inspectionOrg','检验责任主体机构名称'],['inspectionNature','检验性质'],
 ['fullInspectionDate','全面检验日期'],['_fullNextDate','全面检验下检日期']
].map(([key,label,type])=>({key,label,type,width:label.length>8?250:190}));
function linkedPipelines(row){return V2.fixtures.pipeline.filter(p=>p.installationId===row.id);}
function installationTable(entry,mode,api){
 const U=V2QueryResults,isPipes=mode==='pipelines',title=isPipes?'压力管道管线':'变更登记记录',
 columns=isPipes?installationPipelineColumns:changeHeaders.map(label=>({key:label,label,width:label.length>7?240:190})),
 st=entry.tables['installation-'+mode]??=U.state(),root=el('div',isPipes?'installation-pipelines':'installation-changes'),
 holder=el('div');
 let filters=entry.changeFilters??={method:'',from:'',to:''};
 const rows=()=>isPipes?linkedPipelines(entry.row).map(r=>({...r,_fullNextDate:pipelineTypedRecord(r,'全面检验')?.['下检日期']??''})):
 (entry.row.registrationChanges||[]).filter(r=>r.installationId===entry.row.id&&
 (!filters.method||r['变更方式']===filters.method)&&(!filters.from||r['变更日期']>=filters.from)&&(!filters.to||r['变更日期']<=filters.to));
 const actions=r=>isPipes?[
 btn('详情','row-action',()=>api.openDevice?.('pipeline',r)),
 ...['检验信息','修改记录','智慧监管码'].map(name=>btn(name,'row-action',()=>V2MoreDialogs.open(name,'pipeline',r,api.show)))
 ]:[btn('只读','row-action',()=>{const box=el('div');for(const c of columns)box.append(el('p','',c.label+'：'+String(r[c.key]??'—')));api.show('变更登记记录',box);})];
 function redraw(){holder.replaceChildren(U.table({title,columns,rows:rows(),st,actions,actionWidth:isPipes?(innerWidth<=650?220:470):120,emptyText:'暂无数据'}));}
 if(!isPipes){
 const form=el('form','dossier-table-query'),label=el('label','','变更方式：'),method=el('select','control');method.setAttribute('aria-label','变更方式');
 for(const name of ['',...new Set((entry.row.registrationChanges||[]).filter(r=>r.installationId===entry.row.id).map(r=>r['变更方式']).filter(Boolean))]){const o=el('option','',name||'请选择');o.value=name;method.append(o);}method.value=filters.method;label.append(method);
 const dates=el('label','','变更日期：'),from=el('input','control'),to=el('input','control');from.type=to.type='date';from.value=filters.from;to.value=filters.to;from.setAttribute('aria-label','变更日期开始');to.setAttribute('aria-label','变更日期结束');dates.append(from,document.createTextNode('—'),to);
 const submit=el('button','primary','查询'),error=el('p','form-error');submit.type='submit';error.setAttribute('role','alert');
 form.append(label,dates,submit,btn('重置','secondary',()=>{method.value=from.value=to.value='';filters=entry.changeFilters={method:'',from:'',to:''};st.page=1;st.selected.clear();error.textContent='';redraw();}));
 form.onsubmit=e=>{e.preventDefault();if(from.value&&to.value&&from.value>to.value){error.textContent='变更日期范围无效：开始日期不能晚于结束日期';return;}filters=entry.changeFilters={method:method.value,from:from.value,to:to.value};st.page=1;st.selected.clear();error.textContent='';redraw();};
 root.append(form,error);
 }
 const toolbar=el('div','table-toolbar');toolbar.append(btn('设置','link',()=>U.settings(columns,st,redraw,api)));root.append(toolbar,holder);redraw();return root;
}

function tabsFor(type){
 if(type==='installation')return [{title:'压力管道装置',part:0},{title:'压力管道管线',part:9}];
 if(type==='pipeline')return [{title:'设备主题信息',part:0},{title:'检验信息',part:3},{title:'元件信息',part:8},{title:'全部',part:6}];
 if(type==='elevator')return [{title:'设备主题信息',part:0},{title:'设备相关信息',part:1},{title:'设备检验信息',part:3},{title:'最新检测信息',part:7},{title:'参数信息',part:2},{title:'隐患治理记录',part:4},{title:'设备附件',part:5},{title:'全部',part:6}];
 return subtabs.map((title,part)=>({title,part}));
}
const componentHeaders=['元部件名称','图纸编号','元部件编号','材质','壁厚（mm）','操作'];
function componentsFor(row){return (row.components||[]).filter(c=>c.pipelineId===row.id).map(c=>({...c}));}
function componentTable(entry){
 const card=el('section','dossier-table-card pipeline-components');card.dataset.table='components';
 const wrap=el('div','table-scroll dossier-table-scroll');wrap.tabIndex=0;wrap.setAttribute('aria-label','元件信息横向滚动');
 const table=el('table');table.setAttribute('aria-label','元件信息');const head=el('thead'),tr=el('tr');for(const label of componentHeaders)tr.append(el('th','',label));head.append(tr);
 const body=el('tbody'),records=componentsFor(entry.row);
 for(const r of records){const line=el('tr');line.dataset.id=r.id;for(const label of componentHeaders)line.append(el('td','',label==='操作'?'只读':String(r[label]??'—')));body.append(line);}
 if(!records.length){const line=el('tr'),cell=el('td','pipeline-component-empty','暂无数据');cell.colSpan=6;line.append(cell);body.append(line);}
 table.append(head,body);wrap.append(table);card.append(wrap);return card;
}
function datedRecord(record){const date=String(record?.['检验日期']||'');return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
function recentInspection(type,row){return histories(type,row).filter(datedRecord).sort((a,b)=>b['检验日期'].localeCompare(a['检验日期'])||String(a.id).localeCompare(String(b.id)))[0]||null;}
function pipelineTypedRecord(row,kind){
 const prefix=kind==='全面检验'?'full':'online',date=row[prefix+'InspectionDate'];if(!date)return null;
 return {id:row.id+'-'+prefix+'-inspection','检验类别':kind,'检验日期':date,'下检日期':row[prefix==='full'?'nextFullInspectionDate':'nextOnlineInspectionDate']??(prefix==='full'?row.nextInspection:'')??'',
 '检验部门':row[prefix+'InspectionDepartment']??'','检验员':row[prefix+'Inspector']??'','报告编号':row[prefix+'InspectionReport']??'',
 '上次检验日期':row[prefix+'PreviousInspectionDate']??'','检验结论':row[prefix+'InspectionConclusion']??'','主要问题':row[prefix+'InspectionProblems']??'',
 '检验机构':row.inspectionOrg??'','检验性质':row[prefix+'InspectionNature']??'','业务流水号':row[prefix+'InspectionFlow']??'','来源':'前端已有字段映射（演示）','添加人':'','添加时间':''};
}

function model(type,row){
 const data={...row,_deviceType:type,_categoryPath:V2.types[type].title+' / '+(row.category||''),_inspectionDate:row.internalInspectionDate||row.fullInspectionDate||row.inspected||'',_nextInspectionDate:row.nextInternalInspectionDate||row.nextFullInspectionDate||row.nextInspection||'',_reportNumber:row.reportNumber||row.fullInspectionReport||'',_conclusion:'演示记录（无法定效力）',_readOnly:'只读',_source:'前端虚构样本'};
 if(type==='boiler')data._conclusion='模拟记录（无法定效力）';
 if(type==='vessel'){const r=recentInspection(type,row);Object.assign(data,{_inspectionDate:r?.['检验日期']??'',_nextInspectionDate:r?.['下检日期']??'',_reportNumber:r?.['报告编号']??'',_conclusion:r?.['检验结论']??'',inspectionDepartment:r?.['检验部门']??'',inspector:r?.['检验员']??'',inspectionProblems:r?.['主要问题']??'',previousInspectionDate:r?.['上次检验日期']??''});}
 if(type==='installation'){data._installationCategory=Array.isArray(row.categoryPath)?row.categoryPath.join(' / '):row.categoryPath||(row.category||'');data._deviceCount=row.equipmentCount??V2.fixtures.pipeline.filter(p=>p.installationId===row.id).length;}
 if(type==='pipeline')for(const [prefix,kind]of [['full','全面检验'],['online','在线检验']]){const r=pipelineTypedRecord(row,kind);for(const [suffix,label]of Object.entries({Department:'检验部门',Inspector:'检验员',Report:'报告编号',PreviousDate:'上次检验日期',Date:'检验日期',NextDate:'下检日期',Conclusion:'检验结论',Problems:'主要问题'}))data['_'+prefix+suffix]=r?.[label]??'';}
 return data;
}
function control(field,data){
 const box=el('div','dossier-field'+(field.wide?' dossier-wide':'')),label=el('label'),id='dossier-field-'+(++serial);label.htmlFor=id;box.dataset.fieldKey=field.key;
 if(field.required)label.append(el('span','required-mark','*'));label.append(document.createTextNode(field.label));
 const wrap=el('div','dossier-control-wrap');
 function inputFor(key,name){const allowed=V2EquipmentSchema.optionsFor(data._deviceType,field),value=key==='_categoryPath'&&V2EquipmentSchema.supported.includes(data._deviceType)?String(data[key]||'').replace(V2.types[data._deviceType].title+' / ',''):data[key]??'',select=!!allowed||field.kind==='select',input=el(select?'select':field.kind==='textarea'?'textarea':'input','dossier-input');input.id=key===field.key?id:id+'-end';input.setAttribute('aria-label',name);
 if(select){if(allowed){for(const v of ['',...allowed]){const o=el('option','',v||'请选择');o.value=v;input.append(o);}input.value=String(value);if(value!==''&&!allowed.includes(String(value))){input.title='现有演示值未归类：'+value;const note=el('small','dossier-unmapped-value','现有演示值（未归类）：'+value);wrap.append(note);}}else{const o=el('option','',String(value||'请选择'));o.value=String(value);input.append(o);}input.disabled=true;}
 else{if(field.kind!=='textarea')input.type='text';else input.rows=2;input.readOnly=true;input.value=field.key==='pipelineTotalLength'?Number(value||0).toFixed(3):String(value);input.setAttribute('aria-readonly','true');}
 if(field.kind==='metadata')input.classList.add('dossier-metadata');return input;}
 if(V2EquipmentSchema.supported.includes(data._deviceType)&&((field.key==='region')||(field.key==='_categoryPath'&&data._deviceType!=='boiler'&&V2EquipmentSchema.get(data._deviceType).category))){
 const choose=(name,options,value)=>{const input=el('select','dossier-input');input.disabled=true;input.setAttribute('aria-label',name);for(const [v,text]of [['','请选择'],...options]){const o=el('option','',text);o.value=v;input.append(o);}input.value=value||'';return input;};
 wrap.classList.add('boiler-cascade');
 if(field.key==='region'){const regions=V2BoilerSchema.regions,p=regions.find(p=>p.code===data.province);wrap.append(choose('所在地区省级',regions.map(p=>[p.code,p.name]),data.province),choose('所在地区市区县',(p?.children||[]).flatMap(c=>[[c.code,c.name],...(c.children||[]).map(a=>[a.code,a.name])]),data.area));}
 else{const tree=V2EquipmentSchema.get(data._deviceType).category,[parent,child]=String(data.category||'').split(' / ');wrap.append(choose('设备类别一级',Object.keys(tree).map(x=>[x,x]),parent));if(tree[parent]?.length)wrap.append(choose('设备类别二级',tree[parent].map(x=>[x,x]),child));}
 }else if(field.label==='单位所属行业'){
 wrap.append(V2CommonFields.cascade(V2CommonFields.industry,field.label,String(data[field.key]||'')));
 }else if(data._deviceType==='installation'&&field.key==='_installationCategory'){
 wrap.append(V2CommonFields.cascade(V2InstallationSchema.category,'设备类别',String(data.category||'')));
 }else wrap.append(inputFor(field.key,field.rangeEnd?field.label+'（开始）':field.label));
 if(field.rangeEnd){wrap.classList.add('dossier-range');wrap.append(el('span','','—'),inputFor(field.rangeEnd,field.label+'（结束）'));}
 if(field.kind==='date')wrap.append(el('span','dossier-calendar','▦'));
 if(field.action){const action=btn(field.action,'secondary',()=>{});action.disabled=true;action.title=field.action==='详细'?'演示模式，仅供查看；本轮不展开单位资料':'只读演示：不自动生成监管编码或法定检测期限';wrap.append(action);wrap.classList.add('dossier-control-action');}
 box.append(label,wrap);return box;
}
function section(def,data){
 const d=el('details','dossier-group');d.open=true;d.dataset.group=def.title;
 const s=el('summary','',def.title),grid=el('div','dossier-fields');
 for(const f of def.fields)grid.append(control(f,data));d.append(s,grid);return d;
}
function certificateField(type){const t=V2.types[type];return t.columns.find(c=>['registrationCertificate','certificate','vehicleRegistrationCertificate','installationCertificate'].includes(c.key))||{key:'registrationCertificate',label:'使用登记证编号'};}
function subjectDefs(type){
 return [
 group('设备基本情况','equipmentCode|设备代码;_categoryPath|设备类别|select;usageLocation|设备所在地址;region|设备所在地区|select;model|设备型号;name|设备名称;totalValue|总价值（万元）;identificationCode|设备识别码;regulatoryCode|智慧监管编码;safetyDirector|安全总监;safetyOfficer|安全员;longitude|经度;latitude|纬度;altitude|海拔高度'),
 group('使用登记与监管管理',[
 ...fields('status|使用状态|select;registration|注册状态|select;registrationKind|登记类别|select;registrationOrg|注册登记机构;registeredDate|注册登记日期|date;registrationStaff|注册登记人员;updatedDate|更新日期|date'),
 certificateField(type),...fields('registrationCode|设备注册代码;registrationFormNumber|登记表编号;supervisionOrg|设备监管机构|select;issuingOrg|发证机构;managementKind|管理类型|select;issuingKind|发证类型|select;issuedDate|发证日期|date;firstIssuedDate|首次发证日期|date;validUntil|有效期至|date;statusChangedDate|使用状态变更日期|date;important|是否在重要场所|select;populationDense|是否人口密集区|select;hazardKind|事故隐患类别|select;riskLevel|安全风险等级|select;latestSupervision|最新监察业务状态|select')
 ]),
 group('设备使用单位情况','unit|使用单位;contact|联系人;creditCode|统一社会信用代码;phone|联系电话;internalLocation|设备使用（内部）地点;internalCode|设备单位内部编号;department|部门名称;legalRepresentative|法定代表人;legalPhone|法定代表人联系电话;unitAddress|单位地址;postcode|邮政编码;fax|传真;email|邮箱;industry|单位所属行业|select;authority|主管部门|select;estateName|小区（商务楼）名称;safetyDepartment|安全管理部门;safetyManager|安全管理联系人;safetyPhone|安全管理人员联系电话;agentName|经办人;agentPhone|经办人电话;agentMobile|经办人手机;siteAddress|设备单位内地点;commissionedDate|设备投用日期|date;operatorName|作业人员名称'),
 group('产权单位情况','ownerOrg|产权单位;ownerCredit|统一社会信用代码;ownerAddress|产权单位地址;ownerPostcode|产权单位邮政编码;ownerContact|产权单位联系人;ownerPhone|产权单位联系电话;ownerLegalRepresentative|产权单位法定代表人'),
 group('使用状态说明','statusDescription|使用状态说明'),
 group('其他信息','created|设备创建时间|date;createdBy|创建人;modifiedDate|最后修改时间|date;modifiedBy|最后修改人')
 ];
}
function relatedDefs(){return [
 group('设备设计信息','designOrg|设计单位;designCredit|设计单位统一社会信用代码;designPermit|设计许可证编号;designDate|设计日期|date;drawingNumber|总图图号;designLife|设计使用年限;designReviewOrg|设计文件鉴定单位;designReviewDate|设计文件鉴定日期|date;typeTestOrg|型式试验机构;typeTestCredit|型式试验机构统一社会信用代码;typeTestPermit|型式试验核准证编号;typeTestDate|型式试验日期|date;typeTestReport|型式试验报告书编号;qualityCertificate|产品质量证明书编号'),
 group('设备制造信息','manufacturer|制造单位;manufacturerCredit|统一社会信用代码;manufacturerPhone|单位联系电话;manufacturingPermit|制造许可证号;factoryNumber|出厂编号;manufactured|制造日期|date;imported|是否进口|select;manufacturingCountry|制造国家（地区）|select'),
 group('设备制造监检情况','manufacturingInspectionOrg|产品监检单位;manufacturingInspectionCredit|统一社会信用代码;manufacturingInspectionPermit|制造监检单位核准证编号;manufacturingInspectionCertificate|产品监检证书编号'),
 group('设备安装信息','installOrg|安装单位;installationCredit|统一社会信用代码;installationPermit|安装许可证号;installationStarted|安装开始日期|date;installationCompleted|安装竣工日期|date;installationAcceptanceNumber|告知受理编号;installationNoticeDate|安装告知日期|date;installationQualityNumber|设备安装质量证明书编号;installationContact|安装联系人;installationPhone|安装联系电话'),
 group('设备安装监检情况','installationInspectionOrg|安装监检单位;installationInspectionCredit|统一社会信用代码;installationInspectionPermit|检验核准证编号（安装单位）;installationInspectionCertificate|安装监检证书编号'),
 group('设备重大修理信息','majorRepairOrg|重大修理单位;majorRepairCredit|重大修理单位组织机构代码;majorRepairPermit|重大修理许可证号;majorRepairStarted|重大修理开始日期|date;majorRepairCompleted|重大修理竣工日期|date;majorRepairAcceptance|重大修理告知受理编号;majorRepairNotice|重大修理告知日期|date;majorRepairQuality|设备重大修理质量证明书编号;majorRepairContact|重大修理项目负责人;majorRepairPhone|重大修理负责人联系电话'),
 group('设备改造信息','alterationOrg|改造单位;alterationCredit|统一社会信用代码;alterationPermit|改造许可证号;alterationNotice|改造告知日期|date;alterationStarted|改造开始日期|date;alterationCompleted|改造竣工日期|date;alterationAcceptance|改造受理编号;alterationQuality|设备改造质量证明书编号;alterationContact|改造项目联系人;alterationPhone|改造负责人联系电话;alterationKind|改造类型;alterationDate|改造日期|date')
];}
function parameterDefs(type){
 if(type==='boiler')return [
 group('设备参数','evaporation|额定蒸发量（t/h）;power|额定热功率（MW）;ratedTemperature|额定工作温度（℃）;thermalEfficiency|设计热效率（%）;powerStationBoiler|是否电站锅炉|select;drumPressure|锅筒工作压力（MPa）;ratedPressure|额定压力（MPa）;superheaterOutletPressure|过热器出口压力（MPa）;superheaterOutletTemperature|过热器出口温度（℃）;designPressure|设计压力（MPa）;reheatFlow|再热蒸汽流量（t/h）;reheaterInletPressure|再热器入口压力（MPa）;reheaterInletTemperature|再热器入口温度（℃）;reheaterOutletPressure|再热器出口压力（MPa）;reheaterOutletTemperature|再热器出口温度（℃）;feedPressure|给水压力（MPa）;feedTemperature|给水温度（℃）;startupPressure|直流锅炉启动压力（MPa）;startupFlow|直流锅炉启动流量（t/h）;ratedOutput|额定出水（油）;boilerWaterVolume|锅炉本体水（油）容积L;hydroTestMedium|整装锅炉本体液压试验介质;hydroTestPressure|整装锅炉本体液压试验压力MPa;operatingAltitude|作业高度'),
 group('设备运行方式','fuel|使用燃料种类|select;designFuel|设计燃料种类|select;combustionMethod|燃烧方式|select;heatingMethod|加热方式|select;waterTreatmentMethod|水处理方式|select;deoxygenationMethod|除氧方式|select;slagMethod|出渣方式|select;dustMethod|除尘方式|select;waterCirculation|水循环方式|select;burnerLayout|燃烧器布置方式|select;fuelComposition|设计燃料可燃基挥发份;fuelCalorificValue|设计应用基低位发热值;makeupWaterMethod|补给水处理方式|select;superheatAdjustment|过热蒸汽调温方式|select;reheatAdjustment|再热蒸汽调温方式|select;steamWaterSeparation|汽水分离方式|select'),
 group('设备结构形式','boilerStructure|锅炉结构形式|select;economizerStructure|省煤器结构形式;airPreheaterStructure|空气预热器结构形式;boilerRoomKind|锅炉房类型|select'),
 group('其他参数','workingPressure|工作压力（MPa）;workingTemperature|工作温度（℃）;allowedPressure|允许工作压力（MPa）;allowedTemperature|允许工作温度（℃）;outletWaterTemperature|出水温度（℃）;returnWaterTemperature|回水温度（℃）;testPressure|耐压试验压力（MPa）;combustionEquipment|燃烧设备;heatCarrier|有机热载体牌号;waterSource|水源种类;designCode|设计规范;designStandard|设计标准;equipmentOldStatus|设备新旧状况|select;hotelCatering|是否酒店餐饮|select;manufacturingCode|制造规范;heatTransferForm|传热系统形式|select;returnSystemTemperature|系统回流温度;superheaterCooling|过热器减温方式|select;steamWaterForm|汽机型式|select;waterTreatmentEquipment|水处理设备;chemicalAgent|锅内处理药剂;samplingCooler|取样冷却器|select;condensate|蒸汽冷凝水|select;makeupSystem|补给水处理系统;feedWaterTreatment|给水处理|select;externalTreatment|炉水处理|select;condensateTreatment|凝结水处理|select;feedWaterSystem|给水系统;waterVolume|水容积（L）;filterKind|过滤器|select;lowNitrogenProject|是否低氮燃烧改造项目|select;safetyValveCount|安全阀数量;urbanArea|是否城镇建成区|select')
 ];
 const special={
 vessel:'vesselVolume|容器容积M3;purpose|设备用途|select;quickDoor|是否快开门|select;designPressure|设计压力（MPa）;workingPressure|工作压力（MPa）;designTemperature|设计温度（℃）;medium|工作介质;material|主要材料',
 elevator:'age|梯龄;baseMonth|基准月|select;residentialElevator|住宅电梯|select;carDecoration|轿廂装璜;onDemand|按需维保|select;ratedLoad|额定载重量（kg）;ratedSpeed|额定速度（m/s）;stops|层站数',
 crane:'capacity|额定起重量（t）;span|跨度（m）;liftingHeight|起升高度（m）;workingClass|工作级别;model|设备型号',
 vehicle:'plate|厂牌编号;load|额定载荷（kg）;powerSource|动力方式|select;model|车辆型号;vehicleLength|车身长度（mm）',
 amusement:'identificationCode|设备识别码;passengers|额定乘员（人）;height|运行高度（m）;operatingSpeed|运行速度（m/s）;model|设备型号',
 ropeway:'lineLength|线路长度（m）;speed|运行速度（m/s）;hourlyCapacity|每小时运量（人）;elevationDifference|高差（m）;model|设备型号',
 installation:'installationName|工程装置名称;pipelineCount|管道管线数;pipelineTotalLength|管道总长度（m）;category|设备类别|select;noticeNumber|告知单编号',
 pipeline:'pipeName|管道名称;pipelineNumber|管道编号;pipeLevel|管道级别|select;specification|管道规格;maxPressure|最高工作压力;maxTemperature|最高工作温度;length|管道长度（m）;medium|工作介质;category|管道类别|select;safetyGrade|安全等级|select;startPoint|管道起点;endPoint|管道止点'
 };
 return [group('设备参数',special[type]),group('设备运行方式','place|设备使用场所|select;status|使用状态|select;commissionedDate|设备投用日期|date;important|是否在重要场所|select'),group('其他参数','designLife|设计使用年限;designStandard|设计标准;manufacturingCode|制造规范;remarks|参数说明')];
}
function inspectionDefs(type){
 const latest=group(type==='boiler'?'安装监检/内部检验':'最近检验记录','inspectionDepartment|检验部门;inspector|检验员;_reportNumber|报告书编号;_inspectionDate|检验日期|date;previousInspectionDate|上次检验日期|date;_nextInspectionDate|下次检验日期|date;_conclusion|检验结论|select;inspectionProblems|主要问题');
 const defs=[group('检验机构情况','inspectionOrg|检验机构名称;organizationUnit|组织单元|select;inspectionCredit|社会信用代码;inspectionNature|检验性质|select;firstInspectionDate|首次检验日期|date'),latest];
 if(type==='boiler')defs[0].fields.push(...fields('waterInspectionStatus|锅炉水质检验情况|select'));
 if(type==='boiler')defs.push(group('外部检验','externalInspectionDepartment|检验部门;externalInspector|检验员;externalReportNumber|报告书编号;externalInspectionDate|检验日期|date;previousExternalInspectionDate|上次检验日期|date;nextExternalInspectionDate|下次检验日期|date;externalConclusion|检验结论|select;externalProblems|主要问题'),group('水（耐）压试验','waterTestDepartment|检验部门;waterTestInspector|检验员;waterTestReport|报告书编号;waterTestDate|检验日期|date;previousWaterTestDate|上次检验日期|date;nextWaterTestDate|下次检验日期|date;waterTestConclusion|检验结论|select;waterTestProblems|主要问题'));
 if(type==='vessel')defs.push(group('全面与年度检验信息','fullInspectionDate|全面检验日期|date;nextFullInspectionDate|全面检验下检日期|date;annualInspectionDate|年度检验日期|date;nextAnnualInspectionDate|年度检验下检日期|date'));
 if(type==='elevator')defs.push(group('检测与检验分别记录','testingOrg|检测机构;currentReportingOrg|当前报检机构;acceptedTestingOrg|受理检测机构名称;inspectionOrg|检验机构名称;testingDate|检测日期|date;inspected|检验日期|date;nextTestingDate|下次检测日期|date;nextInspection|下检日期|date;testingHandledDate|检测办理日期|date;inspectionTestingNature|检验检测性质'));
 defs.push(group('当前业务状态','inspectionKind|检验类别|select;handlingStatus|办理状态|select;handled|办理日期|date'));
 if(safetyValveTypes.has(type))defs.at(-1).fields.push(...fields('safetyValveInspection|安全阀校验情况|select;safetyValveInspectionDate|安全阀校验日期|date'));
 return defs;
}
function brief(type,row){
 const data=model(type,row),box=el('div','brief-archive');box.dataset.record=row.id;
 box.append(el('p','dossier-disclaimer','虚构演示档案 · '+row.equipmentCode+' · 默认只读，检验内容无法定效力'));
 if(type==='installation'){
 const defs=[group('设备基本情况',[F('_installationCategory','设备分类代码','select'),F('name','设备名称'),F('_deviceCount','设备数量')]),group('设备使用情况',fields('unit|使用单位名称;creditCode|使用单位统一社会信用代码;unitAddress|使用单位地址;usageLocation|设备使用（所在）地点;postcode|使用单位邮政编码;safetyManager|安全管理人员;safetyPhone|安全管理人员手机'))];
 for(const def of defs)box.append(section(def,data));return box;
 }
 const cert=certificateField(type);
 const defs=[
 group('设备基本情况','_categoryPath|设备类别|select;name|设备名称;equipmentCode|设备代码;model|设备型号;designLife|设计使用年限;designOrg|设计单位名称;manufacturer|制造单位;installOrg|安装单位名称;inspectionOrg|检验机构名称;typeTestOrg|型式试验机构名称;factoryNumber|出厂编号'),
 group('设备使用情况','unit|使用单位名称;creditCode|使用单位统一社会信用代码;unitAddress|使用单位地址;postcode|使用单位邮政编码;internalCode|设备单位内部编号;usageLocation|设备使用（所在）地点;commissionedDate|设备投用日期|date;phone|使用单位联系电话;safetyManager|安全管理人员;safetyPhone|安全管理人员手机;ownerOrg|产权单位名称;ownerCredit|产权单位统一社会信用代码;ownerPhone|产权单位负责联系电话'),
 group('设备检验情况','inspectionOrg|检验机构名称;inspectionKind|检验类别|select;_conclusion|检验结论|select;_inspectionDate|检验日期|date;_reportNumber|检验报告编号;_nextInspectionDate|下次检验日期|date')
 ];
 if(type!=='boiler')defs.splice(1,0,group('本类设备信息',[...V2.types[type].columns.filter(c=>['pipeName','installationName','pipelineNumber','length','pipelineCount','pipelineTotalLength','vesselVolume','age','plate','identificationCode','category'].includes(c.key)),cert]));
 for(const d of defs)box.append(section(d,data));return box;
}
function stateFor(entry,id){return entry.tables[id]??=( {page:1,size:10,selected:new Set(),category:'',latest:false,changeMethod:'',from:'',to:''} );}
function recordTable(entry,id,title,labels,rows,mode=null,options={}){
 const st=stateFor(entry,id),card=el('section','dossier-table-card');card.dataset.table=id;
 const heading=el('h3','dossier-table-title',title);if(!options.queryFirst)card.append(heading);
 let all=rows;
 if(mode==='history'&&st.category)all=all.filter(r=>r['检验类别']===st.category);
 if(mode==='history'&&st.latest)all=latestHistories(all);
 if(options.sortable&&st.sortKey)all=all.slice().sort((a,b)=>String(a[st.sortKey]??'').localeCompare(String(b[st.sortKey]??''),'zh-CN',{numeric:true})*(st.descending?-1:1)||String(a.id).localeCompare(String(b.id)));
 const valid=new Set(all.map(r=>r.id));for(const key of st.selected)if(!valid.has(key))st.selected.delete(key);
 if(mode){
 const form=el('form','dossier-table-query');
 if(mode==='history'){
 const label=el('label','','检验类别：'),select=el('select','control');select.setAttribute('aria-label','历史检验类别');const choices=['',...new Set([...(options.inspectionKinds||inspectionKinds),...(options.strictInspectionKinds?[]:rows.map(r=>r['检验类别']))])];
 for(const v of choices){const o=el('option','',v||'请选择');o.value=v;select.append(o);}select.value=st.category;
 label.append(select);const latest=el('label','latest-label'),cb=el('input');cb.type='checkbox';cb.checked=st.latest;latest.append(cb,document.createTextNode('只看各类型最新'));
 const search=el('button','primary','查询');search.type='submit';form.append(label,latest,search);form.onsubmit=e=>{e.preventDefault();st.category=select.value;st.latest=cb.checked;st.page=1;st.selected.clear();replace();};
 }else{
 const method=el('label','','变更方式：'),select=el('select','control');select.setAttribute('aria-label','变更方式');for(const v of ['','使用变更（演示）','登记变更（演示）']){const o=el('option','',v||'请选择');o.value=v;select.append(o);}select.value=st.changeMethod;method.append(select);
 const dates=el('label','','变更日期：'),start=el('input','control'),end=el('input','control');start.type=end.type='date';start.setAttribute('aria-label','变更日期开始');end.setAttribute('aria-label','变更日期结束');start.value=st.from;end.value=st.to;dates.append(start,document.createTextNode(' - '),end);
 const search=el('button','primary','查询');search.type='submit';form.append(method,dates,search,btn('重置','secondary',()=>{st.changeMethod=st.from=st.to='';st.selected.clear();replace();}));form.onsubmit=e=>{e.preventDefault();st.changeMethod=select.value;st.from=start.value;st.to=end.value;st.selected.clear();replace();};
 }
 card.append(form);
 }
 if(options.toolbar)card.append(options.toolbar());
 if(options.queryFirst)card.append(heading);
 const scroll=el('div','table-scroll dossier-table-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',title+'横向滚动');
 const table=el('table');table.setAttribute('aria-label',title);const cg=el('colgroup');
 for(const width of [42,64,...(options.omitOperation?[]:[options.operationWidth||110]),...labels.map(l=>l.length>8?230:180)]){const c=el('col');c.style.width=width+'px';cg.append(c);}
 const thead=el('thead'),tr=el('tr'),selectHead=el('th','fixed check'),selectAll=el('input');selectAll.type='checkbox';selectAll.setAttribute('aria-label',title+'选择本页全部');
 st.page=Math.min(st.page,Math.ceil(all.length/st.size)||1);const visible=all.slice((st.page-1)*st.size,st.page*st.size);
 selectAll.disabled=!visible.length;selectAll.checked=visible.length>0&&visible.every(r=>st.selected.has(r.id));selectAll.indeterminate=!selectAll.checked&&visible.some(r=>st.selected.has(r.id));
 selectAll.onchange=()=>{for(const r of visible)selectAll.checked?st.selected.add(r.id):st.selected.delete(r.id);replace();};
 selectHead.append(selectAll);tr.append(selectHead,el('th','fixed sequence','序号'));if(!options.omitOperation)tr.append(el('th','fixed actions','操作'));
 for(const l of labels){const th=el('th');th.scope='col';
 if(options.sortable){const b=btn(l+(st.sortKey===l?(st.descending?' ▼':' ▲'):''),'',()=>{st.descending=st.sortKey===l?!st.descending:false;st.sortKey=l;st.page=1;replace();});b.setAttribute('aria-label','按'+l+'排序');th.setAttribute('aria-sort',st.sortKey===l?(st.descending?'descending':'ascending'):'none');th.append(b);}else th.textContent=l;tr.append(th);}thead.append(tr);const tbody=el('tbody');
 if(!visible.length){const tr=el('tr'),td=el('td','empty');td.colSpan=labels.length+(options.omitOperation?2:3);td.append(el('div','empty-message',options.emptyText||'没有找到符合条件的数据'));tr.append(td);tbody.append(tr);}
 for(const [i,row] of visible.entries()){
 const tr=el('tr'),cell=el('td','fixed check'),check=el('input');check.type='checkbox';check.checked=st.selected.has(row.id);check.setAttribute('aria-label',title+'选择第'+(i+1)+'条');check.onchange=()=>{check.checked?st.selected.add(row.id):st.selected.delete(row.id);replace();};cell.append(check);
 const actions=el('td','fixed actions');if(options.renderActions)actions.append(options.renderActions(row));else actions.textContent='只读';tr.append(cell,el('td','fixed sequence',String((st.page-1)*st.size+i+1)));if(!options.omitOperation)tr.append(actions);
 for(const l of labels)tr.append(el('td','',String(row[l]??'—')));tbody.append(tr);
 }
 table.append(cg,thead,tbody);scroll.append(table);
 const footer=el('div','table-footer'),pagination=el('div','pagination'),prev=btn('‹','',()=>{st.page--;replace();});prev.disabled=st.page<=1;prev.setAttribute('aria-label',title+'上一页');
 const size=el('select');size.setAttribute('aria-label',title+'每页条数');for(const n of options.pageSizes||[5,10,20]){const o=el('option','',n+' 条/页');o.value=n;size.append(o);}size.value=st.size;size.onchange=()=>{st.size=Number(size.value);st.page=1;replace();};
 const pages=Math.ceil(all.length/st.size)||1;const next=btn('›','',()=>{st.page++;replace();});next.disabled=st.page>=pages;next.setAttribute('aria-label',title+'下一页');
 pagination.append(prev,el('span','current-page',String(st.page)),next,size,el('span','','第 '+st.page+' / '+pages+' 页'));
 const count=el('div','result-count');count.append(document.createTextNode('当前共有 '),el('span','count-total',String(all.length)),document.createTextNode(' 条数据，已选 '),el('span','count-selected',String(st.selected.size)),document.createTextNode(' 条'));count.setAttribute('role','status');
 footer.append(pagination,count);card.append(scroll,footer);
 function replace(){card.replaceWith(recordTable(entry,id,title,labels,rows,mode,options));}
 return card;
}
function latestHistories(rows){
 const sorted=rows.slice().sort((a,b)=>String(b['检验日期']||'').localeCompare(String(a['检验日期']||''))||String(a.id).localeCompare(String(b.id),'en',{numeric:true}));
 const seen=new Set();return sorted.filter(row=>{if(seen.has(row['检验类别']))return false;seen.add(row['检验类别']);return true;});
}
function histories(type,row){
 const specs=type==='boiler'?[['内部检验',row.internalInspectionDate,row.nextInternalInspectionDate],['外部检验',row.externalInspectionDate,row.nextExternalInspectionDate]]:
 type==='vessel'?[['全面检验',row.fullInspectionDate,row.nextFullInspectionDate],['年度检验',row.annualInspectionDate,row.nextAnnualInspectionDate]]:
 [[ (type==='installation'?row.inspectionQueryKind:row.inspectionKind)||'演示检验记录',row.inspected||'',row.nextInspection||'']];
 const records=specs.filter(s=>s[1]).map(([kind,date,next],i)=>({id:row.id+'-inspection-'+i,'检验类别':kind,'检验结论':'模拟记录（无法定效力）','检验日期':date,'下检日期':next,'检验机构':(row._historicalInspectionOrg??row.inspectionOrg)||'未提供（演示）','检验部门':'演示检验部','检验性质':row.inspectionNature||(type==='boiler'?'':'演示记录'),'报告编号':row.reportNumber||row.fullInspectionReport||'','业务流水号':'DEMO-FLOW-'+row.id+'-'+i,'来源':'前端虚构样本','添加人':'演示资料员','添加时间':'2026-10-30 09:00:00'}));
 if(type==='pipeline')for(const kind of ['全面检验','在线检验']){const record=pipelineTypedRecord(row,kind);if(record&&!records.some(r=>r['检验类别']===kind&&r['检验日期']===record['检验日期']))records.push(record);}
 return records;
}
// Read-only query accessors share the exact definitions rendered by the All tab.
function definitions(type){return type==='installation'?[installationDefs()]:legacyDefinitions(type);}
function legacyDefinitions(type){
 if(type==='pipeline')return [pipelineSubjectDefs(),[],[],pipelineInspectionDefs()];
 const defs=[subjectDefs(type),relatedDefs(),parameterDefs(type),inspectionDefs(type)];
 if(type==='elevator'){defs[7]=latestTestingDefs();defs[1].push(group('电梯维保信息','maintenanceOrg|维保单位名称;maintenanceCode|维保单位代码;maintenanceLicense|许可证编号;maintenanceContact|维保负责人;maintenancePhone|维保联系电话;maintenanceContractUntil|维保合同有效期|date;rescuePhone|驻点救援值守电话'));}
 const used=new Set(defs.flatMap(ds=>ds.flatMap(d=>d.fields.flatMap(f=>[f.key,f.rangeEnd].filter(Boolean)))));
 const extra=V2.types[type].columns.filter(c=>!used.has(c.key));
 if(extra.length)defs[0].push(group('本类设备档案补充信息',extra));
 return defs;
}
function queryFields(type,legacy=false){
 if(!['boiler','vessel','elevator','crane','vehicle','amusement','ropeway','installation','pipeline'].includes(type))throw Error('未知设备详情类型');
 const rows=V2.fixtures[type],out=[],seen=new Set();
 (legacy?legacyDefinitions(type):definitions(type)).forEach((groups,part)=>groups.forEach(def=>def.fields.flatMap(f=>f.rangeEnd?[{...f,label:f.label+'（开始）'},{...f,key:f.rangeEnd,label:f.label+'（结束）',rangeEnd:undefined}]:[f]).forEach(f=>{
  const id='asset.'+type+'.'+part+'.'+encodeURIComponent(def.title)+'.'+encodeURIComponent(f.key);if(seen.has(id))return;seen.add(id);
  const boilerOptions=V2EquipmentSchema.optionsFor(type,f);
  const meta=V2.types[type].detailFields.find(c=>c.key===f.key),kind=boilerOptions?'select':f.kind||f.type||meta?.type;
  const values=rows.map(r=>model(type,r)[f.key]).filter(v=>v!==null&&v!==undefined&&v!=='');
  const t=kind==='date'||kind==='dateRange'?'date':kind==='number'||kind==='numberRange'||values.some(v=>typeof v==='number')||/[（(](MPa|MW|℃|kg|t\/h|m|L|%|万元)/i.test(f.label)?'number':/^是否/.test(f.label)?'boolean':kind==='select'?'enum':'text';
  out.push(Object.freeze({id,key:f.key,label:f.label,type:t,scope:'asset',group:def.title,sourcePart:part,options:boilerOptions||[],sensitive:/电话|手机|邮箱/.test(f.label)}));
 })));
 for(const [table,title,labels]of (type==='pipeline'?[['components','元件信息',componentHeaders.slice(0,-1)]]:[['changes','更变信息查询表',changeHeaders],['history','历史检验信息',inspectionHeaders],['hazards','隐患治理记录',hazardHeaders],['attachments','设备附件',attachmentHeaders]]))for(const label of labels){
  out.push(Object.freeze({id:'asset.'+type+'.table.'+table+'.'+encodeURIComponent(label),key:label,label:title+' · '+label,type:/日期|时间/.test(label)?'date':label==='数量'?'number':label.startsWith('是否')?'boolean':'text',scope:table,group:title,options:[],sensitive:false}));
 }
 if(type==='installation'&&!legacy){const old=queryFields(type,true);return Object.freeze(out.map(f=>Object.freeze({...f,aliases:old.filter(o=>o.scope===f.scope&&(o.key===f.key||(o.key==='_categoryPath'&&f.key==='_installationCategory'))&&o.type===f.type).map(o=>o.id)})));}
 return Object.freeze(out);
}
function queryValue(type,row,record,field){
 if(field.scope==='asset')return model(type,row)[field.key]??null;
 if(field.scope==='components'){const values=componentsFor(row).map(c=>c[field.key]).filter(v=>v!==null&&v!==undefined&&v!=='');return values.length?([...new Set(values)].join('；')):null;}
 if(field.scope==='history'){const value=record?.[field.key];return value??null;}
 // These three tables are empty in the existing dossier, so no inferred records.
 return null;
}
function page(entry,api={}){
 const {type,row}=entry,data=model(type,row),root=el('div','equipment-info');root.dataset.record=row.id;root.dataset.type=type;
 const tabs=tabsFor(type);if(!Number.isInteger(entry.section)||entry.section<0||entry.section>=tabs.length)entry.section=0;const selected=tabs[entry.section],isAll=selected.part===6;
 const bar=el('div','equipment-subtabs');bar.setAttribute('role','tablist');bar.setAttribute('aria-label','设备信息子标签');
 const content=el('div','equipment-info-content');content.setAttribute('role','tabpanel');
 for(const [i,tab]of tabs.entries()){const b=btn(tab.title,'equipment-subtab'+(entry.section===i?' active':''),()=>{entry.section=i;root.replaceWith(page(entry,api));});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(entry.section===i));bar.append(b);}
 const edit=el('label','edit-mode','编辑模式：'),toggle=el('input');toggle.type='checkbox';toggle.disabled=true;toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','编辑模式（本轮只读）');edit.append(toggle);bar.append(edit);
 content.append(el('p','dossier-disclaimer','设备：'+row.equipmentCode+' · 前端虚构样本，只读展示；未提供资料的项目留空，检验信息无法定效力。'));
 const defs=definitions(type);
 function renderPart(index){const part=el('section','dossier-part');part.dataset.part=String(index);if(isAll)part.append(el('h2','dossier-part-title',tabs.find(t=>t.part===index).title));
 if(defs[index])for(const def of defs[index])part.append(section(def,data));
 if(type==='installation'){
 if(index===0){const d=el('details','dossier-group');d.open=true;d.dataset.group='变更登记信息';d.append(el('summary','','变更登记信息'),installationTable(entry,'changes',api));part.append(d);}
 if(index===9)part.append(installationTable(entry,'pipelines',api));
 }else if(type!=='pipeline'){
 if(index===0)part.append(recordTable(entry,'changes','更变信息查询表',changeHeaders,[],'changes'));
 if(index===3)part.append(V2InspectionHistory.create({type,row,entry,scrollHost:content,isDisposed:()=>!root.isConnected}));
 if(index===4)part.append(recordTable(entry,'hazards','隐患治理记录',hazardHeaders,[]));
 if(index===5)part.append(recordTable(entry,'attachments','设备附件',attachmentHeaders,[]));
 }else if(index===8)part.append(componentTable(entry));
 return part;}
 if(isAll)for(const tab of tabs.filter(t=>t.part!==6))content.append(renderPart(tab.part));else content.append(renderPart(selected.part));
 const close=btn('关闭','secondary dossier-page-close',()=>{const active=document.querySelector('#tabs .tab.active .tab-close');active?.click();});content.append(close);
 root.append(bar,content);return root;
}
function more(trigger,onSelect,items=['智慧监管码','检验信息','修改记录']){
 document.getElementById('record-more-menu')?.remove();
 const pop=el('div','record-more-menu');pop.id='record-more-menu';pop.setAttribute('popover','auto');pop.setAttribute('role','menu');pop.setAttribute('aria-label','更多行操作');
 for(const item of items){const name=typeof item==='string'?item:item.label;const b=btn(name,'',()=>{pop.hidePopover();trigger.focus();onSelect(name);});b.disabled=!!item.disabled;b.setAttribute('role','menuitem');pop.append(b);}
 document.body.append(pop);const r=trigger.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(r.right+10,innerWidth-226))+'px';pop.style.top=Math.max(8,Math.min(r.top,innerHeight-(items.length*52+20)))+'px';pop.showPopover();
}
function chooseInspectionUnit(api,onSelect){
 const {el,button}=V2QueryResults,root=el('div','installation-unit-picker'),form=el('form','query-grid'),search=el('input','control'),region=el('select','control');
 search.placeholder='输入单位名称、组织机构代码';search.setAttribute('aria-label','综合查询');
 region.setAttribute('aria-label','所在地区');
 for(const name of ['',...new Set(V2InspectionUnits.rows.map(r=>r.region))]){const o=el('option','',name||'请选择');o.value=name;region.append(o);}
 function field(label,input){const box=el('label','field',label);box.append(input);return box;}
 const submit=button('查询','primary',()=>{});submit.type='submit';form.append(field('综合查询',search),field('所在地区',region),submit);
 const holder=el('div');let rows=[...V2InspectionUnits.rows],page=1,size=10;
 function paint(){
  holder.replaceChildren();const scroll=el('div','table-scroll'),table=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');
  for(const name of ['序号','选择','单位名称','单位地址','统一社会信用代码','地区代码','所在地区','电话','法定代表人','是否启用'])tr.append(el('th','',name));
  head.append(tr);
  page=Math.max(1,Math.min(page,Math.ceil(rows.length/size)||1));
  for(const [i,row] of rows.slice((page-1)*size,page*size).entries()){
   const tr=el('tr');tr.append(el('td','',String((page-1)*size+i+1)));
   const cell=el('td');cell.append(button('选择','secondary',()=>{onSelect(row);api.close();}));tr.append(cell);
   for(const key of ['name','address','creditCode','regionCode','region','phone','legalPerson','enabled'])tr.append(el('td','',row[key]||''));
   body.append(tr);
  }
  if(!rows.length){const td=el('td','empty','暂无数据');td.colSpan=10;const tr=el('tr');tr.append(td);body.append(tr);}
  table.append(head,body);scroll.append(table);
  const footer=el('div','table-footer'),pages=el('div','pagination'),prev=button('‹','secondary',()=>{page--;paint();}),next=button('›','secondary',()=>{page++;paint();}),select=el('select','control'),jump=el('input','control');
  prev.setAttribute('aria-label','上一页');next.setAttribute('aria-label','下一页');prev.disabled=page===1;next.disabled=page*size>=rows.length;
  select.setAttribute('aria-label','每页条数');for(const n of [2,5,10,20]){const o=el('option','',n+' 条/页');o.value=n;select.append(o);}select.value=size;
  select.onchange=()=>{size=Number(select.value);page=1;paint();};
  jump.type='number';jump.min=1;jump.max=Math.ceil(rows.length/size)||1;jump.value=page;jump.setAttribute('aria-label','跳至页');jump.onchange=()=>{page=Math.max(1,Number(jump.value)||1);paint();};
  pages.append(prev,el('span','',String(page)),next,select,el('span','','跳至'),jump,el('span','','页'));
  footer.append(pages,el('div','result-count','当前共有 '+rows.length+' 条数据，已选 0 条'));holder.append(scroll,footer);
 }
 form.onsubmit=e=>{e.preventDefault();const keyword=search.value.trim();rows=V2InspectionUnits.rows.filter(r=>(!keyword||[r.name,r.creditCode,r.organizationCode].some(v=>String(v||'').includes(keyword)))&&(!region.value||r.region===region.value));page=1;paint();};
 root.append(form,holder);paint();api.show('检验单位',root,'installation-unit-dialog');
}
function createInstallation(entry,api){
 const {el,button}=V2QueryResults,data=entry.draft,root=el('div','equipment-info installation-create'),bar=el('div','equipment-subtabs');
 bar.append(el('span','equipment-subtab active','压力管道装置'));
 const label=el('label','edit-mode','编辑模式：'),toggle=el('input');toggle.type='checkbox';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','编辑模式');toggle.checked=entry.editing;label.append(toggle);bar.append(label);
 const content=el('div','equipment-info-content');root.append(bar,content);
 for(const def of installationDefs()){
  const group=section(def,{...data,_deviceType:'installation',category:data._installationCategory||''});
  for(const field of def.fields){
   const cell=group.querySelector('[data-field-key="'+field.key+'"]'),wrap=cell.querySelector('.dossier-control-wrap');
   if(field.key==='region'){
    const holder=V2EquipmentPage.control({key:'region',label:field.label,type:'region'},data);
    wrap.replaceChildren(holder.querySelector('.boiler-cascade'));
   }
   if(field.label==='单位所属行业'||field.key==='_installationCategory'){
    const tree=field.key==='_installationCategory'?V2InstallationSchema.category:V2CommonFields.industry;
    wrap.replaceChildren(V2CommonFields.cascade(tree,field.key==='_installationCategory'?'设备类别':field.label,data[field.key]||'',value=>data[field.key]=value,!entry.editing));
   }
   for(const input of wrap.querySelectorAll('input,select,textarea')){
    if(field.kind==='date')input.type='date';
    if(field.key==='pipelineTotalLength'){
     input.type='number';input.step='0.001';input.min='0';
     input.onblur=()=>{if(input.value!==''&&input.validity.valid){input.value=V2InstallationSchema.lengthTotal([{length:input.value}]);data[field.key]=input.value;}};
    }
    if(field.kind!=='metadata')input.dataset.editable='true';
    input.disabled=field.kind==='metadata'||!entry.editing;
    input.readOnly=field.key==='inspectionOrg';
    input.removeAttribute('aria-readonly');
    if(field.key==='region')input.addEventListener('change',()=>{data[input.name]=input.value;if(input.name==='province')data.area='';});
    else if(!input.closest('.boiler-cascade'))input.oninput=()=>data[field.key]=input.value;
   }
   if(field.key==='inspectionOrg'){
    const input=wrap.querySelector('input');input.onclick=()=>{if(entry.editing)chooseInspectionUnit(api,row=>{data.inspectionOrg=row.name;data.inspectionOrgId=row.id;input.value=row.name;});};
   }
  }
  content.append(group);
 }
 const changes=el('details','dossier-group');changes.open=true;changes.append(el('summary','','变更登记信息'),el('p','notice','暂无变更登记信息'));content.append(changes);
 toggle.onchange=()=>{entry.editing=toggle.checked;for(const input of content.querySelectorAll('[data-editable]'))input.disabled=!entry.editing;};
 content.append(button('关闭','secondary',()=>document.querySelector('#tabs .tab.active .tab-close')?.click()));
 return root;
}
return {createInstallation,linkedPipelines,installationPipelineColumns,brief,page,more,recordTable,tabsFor,componentsFor,recentInspection,queryFields,queryValue,histories,latestHistories,subtabs,changeHeaders,inspectionHeaders,inspectionKinds};
})();








