/* Safety valve session-only demo; no network mutations or legal calibration rules. */
window.V2SafetyValves=(()=>{
'use strict';
const schema=V2SafetyValveSchema,fields=schema.fields,el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const keyOf=v=>String(v??'').trim().toLowerCase();
let sequence=10,numberSequence=0,clipboard=null;
const units=[...new Set(V2.fixtures.boiler.map(r=>r.unit))],manufacturer=V2.fixtures.boiler[0].manufacturer;
const rows=Array.from({length:10},(_,i)=>({
 id:'DEMO-SAFETY-VALVE-'+(i+1),unitName:units[i%units.length],creditCode:'DEMO-USAGE-CREDIT-'+(i%units.length+1),unitAddress:'DEMO-使用单位地址-'+(i%units.length+1),
 pressureLevel:'演示压力等级',flowDiameter:6+i,manufacturingLicense:'DEMO-MANUFACTURING-'+(i+1),factoryDate:'2026-01-'+String(i+1).padStart(2,'0'),
 installationName:'DEMO-装置-'+(i+1),position:'DEMO-POS-'+(i+1),valveType:'弹簧',model:'DEMO-SV-MODEL-'+(i+1),nominalPressure:1.6,nominalDiameter:8+i,
 productNumber:'DEMO-SV-'+String(i+1).padStart(3,'0'),equipment:'DEMO-所属设备示例-'+(i+1),manufacturer,workingPressure:0.28,medium:'演示水/蒸汽',
 requiredSetPressure:0.3,requiredReseatPressure:'',calibrationMethod:'',calibrationMedium:'',setPressure:'',reseatPressure:'',openingHeight:'',sealPressure:'',
 outletSealTest:'',leadSeal:'',businessTag:'演示待校验',status:'正常',inspectionDate:'2026-02-'+String(i+1).padStart(2,'0'),nextInspectionDate:'2027-04-'+String(i+1).padStart(2,'0')
}));
const col=(key,label,width=190)=>({key,label,width,type:'text',sortable:true}),q=(key,label,type='text')=>({key,label,type,options:[],placeholder:'请输入'});
V2.fixtures['safety-valve']=rows;
V2.types['safety-valve']={title:'安全阀管理',entity:'safety-valve',implemented:true,defaultPageSize:10,
 columns:[col('unitName','使用单位名称',300),col('installationName','装置名称',240),col('valveType','安全阀类型',170),col('model','安全阀型号',210),
 col('manufacturer','制造单位',300),col('productNumber','产品编号',230),col('inspectionDate','检验日期',170),col('nextInspectionDate','下检日期',170),col('status','状态',140)],
 queries:[q('unitName','使用单位'),q('installationName','装置名称'),q('inspectionDate','检验日期','dateRange'),q('nextInspectionDate','下检日期','dateRange'),q('productNumber','产品编号')],
 actions:['新增','导入','删除','导出'],icons:{新增:'⊞',导入:'↧',删除:'▥',导出:'↥'},
 rowActions:[['编辑','valve-edit'],['复制','valve-copy'],['更多>>','valve-more']],operationWidth:270,pageSizes:[5,10,20],exportAllColumns:true,
 advancedFields:[['model','安全阀型号'],['manufacturer','制造单位']]};
function allocateId(){let id;do{id='DEMO-SAFETY-VALVE-'+(++sequence)}while(rows.some(r=>r.id===id));return id;}
function uniqueNumber(base){let number;do{number=String(base||'DEMO-SV')+'-COPY-'+(++numberSequence)}while(rows.some(r=>keyOf(r.productNumber)===keyOf(number)));return number;}
function dateValid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
function validateRecord(input,excludeId=null){
 const record={},errors=[];
 for(const f of schema.importFields){
 let value=input[f.key]??'';if(typeof value==='string')value=value.trim();
 if(f.required&&value===''){errors.push(f.label+'为必填项');continue;}
 if(value===''){record[f.key]='';continue;}
 if(f.type==='number'){
 if(!['number','string'].includes(typeof value)||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1e9){errors.push(f.label+'须为0至1000000000之间的数值');continue;}
 value=Number(value);if(['nominalPressure','nominalDiameter','requiredSetPressure'].includes(f.key)&&value<=0){errors.push(f.label+'必须大于0');continue;}
 }else{
 value=String(value);if(value.length>500){errors.push(f.label+'超过500字符');continue;}
 if(f.type==='date'&&!dateValid(value)){errors.push(f.label+'须为有效日期YYYY-MM-DD');continue;}
 if(f.type==='select'&&!f.options.includes(value)){errors.push(f.label+'不在允许选项内');continue;}
 }
 record[f.key]=value;
 }
 if(record.inspectionDate&&record.nextInspectionDate&&record.nextInspectionDate<record.inspectionDate)errors.push('下检日期不能早于检验日期（仅日期次序校验，不推算期限）');
 if(record.productNumber&&rows.some(r=>r.id!==excludeId&&keyOf(r.productNumber)===keyOf(record.productNumber)))errors.push('产品编号重复：'+record.productNumber);
 return {record,errors};
}
function footerButtons(api,title,body,actions,cleanup=()=>{}){
 const buttons=actions.map(([label,fn])=>button(label,'primary',fn));
 api.show(title,body,'organization-dialog valve-dialog',()=>{for(const b of buttons)b.remove();cleanup();});
 document.querySelector('#dialog .dialog-footer').prepend(...buttons);
}
function edit(existing,api){
 const root=el('form','valve-form');root.noValidate=true;root.dataset.valveId=existing?.id||'new';
 root.append(el('p','notice','演示模式：仅当前前端会话保存，刷新后恢复样本；不写数据库，不生成法定校验证明或自动计算校验期限。'));
 const grid=el('div','unit-info-grid valve-form-grid'),controls={},error=el('p','form-error');error.setAttribute('role','alert');
 let extraDates={inspectionDate:existing?.inspectionDate||'',nextInspectionDate:existing?.nextInspectionDate||''};
 for(const f of fields){
 const holder=el('div','unit-info-field valve-form-field'+(f.wide?' full-width':'')),label=el('label');label.htmlFor='valve-'+f.key;
 if(f.required){const star=el('span','required-mark','*');star.setAttribute('aria-hidden','true');label.append(star)}label.append(document.createTextNode(f.label));
 const input=el(f.type==='select'?'select':'input','control product-control');input.id='valve-'+f.key;input.setAttribute('aria-label',f.label);
 if(f.type==='select'){for(const value of ['',...f.options]){const o=el('option','',value||'请选择');o.value=value;input.append(o)}}
 else{input.type=f.type==='date'?'date':f.type==='number'?'number':'text';if(f.type==='number'){input.step='any';input.min='0';input.max='1000000000'}}
 input.value=existing?.[f.key]??(f.key==='status'?'正常':'');controls[f.key]=input;holder.append(label,input);
 if(['unitName','equipment','manufacturer'].includes(f.key)){const list=el('datalist');list.id='valve-options-'+f.key;input.setAttribute('list',list.id);for(const value of f.key==='unitName'?units:f.key==='manufacturer'?[manufacturer]:V2.fixtures.boiler.map(r=>r.equipmentCode)){const o=el('option');o.value=value;list.append(o)}holder.append(list)}
 grid.append(holder);
 }
 function showError(message){error.textContent=message;error.scrollIntoView({block:'nearest'});}
 root.append(grid,error);
 root.onsubmit=e=>{e.preventDefault();const draft={...extraDates};
 for(const f of fields){const c=controls[f.key];if(c.validity.badInput){showError(f.label+'格式不正确');return;}draft[f.key]=c.value}
 const result=validateRecord(draft,existing?.id);if(result.errors.length){showError(result.errors.join('；'));return;}
 if(existing)Object.assign(existing,result.record);else rows.push({...result.record,id:allocateId()});
 api.close();api.refresh();api.announce('安全阀已保存至当前前端演示会话，未写入服务器');
 };
 footerButtons(api,existing?'安全阀编辑':'安全阀新增',root,[['保存',()=>root.requestSubmit()],['粘贴',()=>{
 if(!clipboard){showError('没有可粘贴的已复制安全阀记录，请先在列表复制。');return;}
 for(const f of fields)controls[f.key].value=clipboard[f.key]??'';
 controls.productNumber.value=uniqueNumber(clipboard.productNumber);extraDates={inspectionDate:clipboard.inspectionDate||'',nextInspectionDate:clipboard.nextInspectionDate||''};
 showError('已粘贴至表单；点击保存后才更新当前演示会话。');
 }]]);
}
function copy(row,api){
 const clone={...structuredClone(row),id:allocateId(),productNumber:uniqueNumber(row.productNumber)};
 rows.push(clone);clipboard=structuredClone(row);api.refresh();api.announce('复制成功 · 仅当前前端演示会话有效');
}
function remove(api){
 const ids=new Set(api.selected);if(!ids.size){api.announce('请先选择需要删除的安全阀记录');return;}
 const body=el('div');body.append(el('p','notice','确认删除选中的 '+ids.size+' 条安全阀？仅删除当前前端演示会话数据，取消不发生变化。'));
 const confirm=button('确认删除','primary',()=>{for(let i=rows.length-1;i>=0;i--)if(ids.has(rows[i].id))rows.splice(i,1);api.selected.clear();api.close();api.refresh();api.announce('已删除当前演示会话中的选中记录');});
 body.append(confirm,button('取消','secondary',api.close));api.show('确认删除安全阀',body,'organization-dialog valve-dialog');
}
async function parseImport(file){
 if(!file||!/\.(xls|xlsx)$/i.test(file.name))throw Error('文件格式不支持：仅支持.xls、.xlsx');
 if(!file.size||file.size>5*1024*1024)throw Error('文件大小须大于0且不超过5MB');
 if(typeof XLSX==='undefined')throw Error('本地Excel解析库未加载，不能导入');
 const bytes=new Uint8Array(await file.arrayBuffer()),isXlsx=/\.xlsx$/i.test(file.name);
 const zip=bytes[0]===0x50&&bytes[1]===0x4b,ole=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i)=>bytes[i]===v);
 if(isXlsx?!zip:!ole)throw Error('文件内容与扩展名不一致或不是有效Excel文件');
 let wb;try{wb=XLSX.read(bytes,{type:'array',sheetRows:1002,cellDates:false,cellFormula:true,cellText:false,bookVBA:false})}catch(e){throw Error('Excel文件无法解析，可能损坏、加密或格式错误')}
 const sheet=wb.Sheets[schema.sheetName];if(!sheet)throw Error('工作表必须为“'+schema.sheetName+'”，请使用下载模板');
 const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
 if(range.e.r>1000||range.e.c>=schema.headers.length)throw Error('超过1000条记录或存在模板以外的列');
 const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''}),head=matrix[0]||[];
 if(head.length!==schema.headers.length||head.some((v,i)=>v!==schema.headers[i]))throw Error('表头或顺序与模板不一致，请使用下载模板');
 for(let c=0;c<schema.headers.length;c++)if(sheet[XLSX.utils.encode_cell({r:0,c})]?.f)throw Error('表头不得含公式');
 const staged=[],seen=new Set(),issues=[];
 for(let r=1;r<matrix.length;r++){
 const values=matrix[r],raw={};let hasFormula=false;
 for(let c=0;c<schema.importFields.length;c++){const f=schema.importFields[c],cell=sheet[XLSX.utils.encode_cell({r,c})];if(cell?.f||cell?.t==='e'){issues.push('第'+(r+1)+'行：不接受公式或错误单元格');hasFormula=true;break;}let value=values[c]??'';
 if(f.type==='date'&&typeof value==='number'){const d=XLSX.SSF.parse_date_code(value,{date1904:!!wb.Workbook?.WBProps?.date1904});value=d?String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0'):'非法日期';}
 if(f.key==='productNumber'&&typeof value==='number'){issues.push('第'+(r+1)+'行：产品编号须按文本填写');hasFormula=true;break;}raw[f.key]=value;}
 if(hasFormula)continue;if(!Object.values(raw).some(v=>v!==''))continue;
 const result=validateRecord(raw),number=keyOf(result.record.productNumber);
 if(number&&seen.has(number))result.errors.push('同批产品编号重复：'+result.record.productNumber);
 if(number)seen.add(number);
 if(result.errors.length)issues.push('第'+(r+1)+'行：'+result.errors.join('；'));else staged.push(result.record);
 if(issues.length>=50){issues.push('错误过多，请修正后重新导入');break;}
 }
 if(issues.length)throw Error(issues.join('\n'));
 if(!staged.length)throw Error('文件中没有可导入记录');
 return staged;
}
function importDialog(api){
 const root=el('div','valve-import'),label=el('label','','选择附件：'),file=el('input');file.type='file';file.accept='.xls,.xlsx';file.setAttribute('aria-label','选择附件');label.append(file);
 const notes=el('div','valve-import-notes'),link=el('a','','下载模板');link.href='/static/v2/templates/safety-valve-import.xlsx';link.download='安全阀导入模板.xlsx';
 const first=el('p','','1、上传文件格式必须与模板一致。');first.append(link);notes.append(el('p','','注意：'),first,el('p','','2、模板中红色字段为必填。'),el('p','','3、仅支持 .xls、.xlsx 格式。'));
 const error=el('p','form-error');error.setAttribute('role','alert');let disposed=false,busy=false;
 const actions=el('div','valve-import-actions'),upload=button('上传','primary',async()=>{
 if(busy)return;busy=true;upload.disabled=true;error.textContent='';
 try{const staged=await parseImport(file.files[0]);if(disposed)return;for(const record of staged)rows.push({...record,id:allocateId()});api.close();api.refresh();api.announce('已本地导入 '+staged.length+' 条至当前前端演示会话，未上传服务器');}
 catch(e){if(!disposed)error.textContent=e.message}
 finally{busy=false;if(!disposed)upload.disabled=false}
 });
 actions.append(upload,button('取消','secondary',api.close));root.append(label,notes,el('p','more-context-note','“上传”仅在本地浏览器解析，不发送文件。整批校验通过才导入；单次最多1000条/5MB，刷新不保留。'),error,actions);
 api.show('安全阀导入',root,'organization-dialog valve-dialog valve-import-dialog',()=>{disposed=true});
}
function toolbar(name,api){if(name==='新增')edit(null,api);else if(name==='导入')importDialog(api);else if(name==='删除')remove(api);}
function action(kind,row,trigger,api){
 if(!rows.some(r=>r.id===row.id))throw Error('安全阀记录上下文无效');
 if(kind==='valve-edit')edit(row,api);else if(kind==='valve-copy')copy(row,api);
 else V2Dossier.more(trigger,name=>V2MoreDialogs.open(name,'safety-valve',row,api.show),['修改记录']);
}
return {rows,fields,validateRecord,parseImport,toolbar,action};
})();

