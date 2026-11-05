/* Boiler products are separate from equipment assets. Session memory only. */
window.V2BoilerProducts=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const categories=[...V2.types.boiler.categories],manufacturers=[...new Set(V2.fixtures.boiler.map(r=>r.manufacturer).filter(Boolean))];
const columns=[['equipmentCode','设备代码',220],['name','产品名称',230],['manufacturer','制造单位',300],['model','产品型号',190],['productNumber','产品编号',230],['category','设备类别',210],['createdAt','创建日期',210],['remarks','备注',300]].map(([key,label,width])=>({key,label,width,type:'text',sortable:true}));
const rows=Array.from({length:5},(_,i)=>({productType:'boiler-product',auditRecords:[],id:'DEMO-BOILER-PRODUCT-00'+(i+1),equipmentCode:'DEMO-PRODUCT-GL-00'+(i+1),name:'DEMO-锅炉产品-00'+(i+1),productNumber:'DEMO-PRODUCT-NO-00'+(i+1),model:'DEMO-GL-MODEL-'+(i+1),manufacturer:manufacturers[i%manufacturers.length]||'虚构制造单位（演示）',category:categories[i%categories.length],createdAt:'2026-10-0'+(i+1)+' 09:00:00',isExport:'否',designPressure:0.8+i*0.2,designTemperature:170+i*10,medium:'演示水/蒸汽',volume:1+i,evaporation:1+i,thermalPower:0.7*(i+1),steamPressure:0.7+i*0.1,steamTemperature:160+i*10,manufacturedDate:'2026-09-0'+(i+1),specification:String(i+1),remarks:'DEMO虚构产品样本'+(i+1)+'，非在用设备台账、非真实许可资料'}));
const inspections=new Map(),definitions=new Map();let copyCounter=0,closeMenu=()=>{};
const q=(key,label,options)=>({key,label,type:options?'select':'text',options:options||[],placeholder:key==='search'?'输入设备代码、产品名称、产品规格、产品编号':'请输入'});
V2.fixtures['boiler-product']=rows;
V2.types['boiler-product']={title:'锅炉产品管理',entity:'product',implemented:true,columns,queries:[q('search','综合查询'),q('manufacturer','制造单位'),q('category','设备类别',categories)],searchKeys:['equipmentCode','name','specification','productNumber'],actions:['导入','导出'],rowActions:[['编辑','product-edit'],['复制','product-copy'],['更多>>>','product-menu']],operationWidth:270,pageSizes:[2,5,10,20],exportAllColumns:true};
const productFields=[
 ['equipmentCode','设备代码','text',true],['name','产品名称'],
 ['category','设备类别','category',false,true],
 ['productNumber','产品编号','text',true],['model','产品型号'],['contractNumber','合同号'],['productionNumber','生产编号'],
 ['customer','用户名称'],['isExport','是否出口','select',false,false,['是','否']],
 ['designPressure','设计压力','number'],['designTemperature','设计温度','number'],['medium','盛装介质'],['volume','容积（m³）','number'],
 ['evaporation','额定蒸发量','number'],['thermalPower','额定热功率','number'],['steamPressure','额定蒸汽（出口）压力','number'],['steamTemperature','额定蒸汽（出口）温度','number'],
 ['manufacturer','制造单位名称','manufacturer',true],['manufacturerCreditCode','统一社会信用代码'],['manufacturingLicense','制造许可证号'],['country','制造国家（地区）名称'],
 ['manufacturedDate','制造日期','date'],['manufacturingAddress','制造详细地址'],['manufacturingStandard','制造规范'],['positionNumber','位号'],
 ['licenseScope','许可范围'],['licenseLevel','许可证级别'],['specification','规格（t/h）','number'],['parameterOrganization','补录设备参数的单位'],['remarks','备注','textarea',false,true]
];
definitions.set('boiler-product',{productType:'boiler-product',title:'锅炉产品编辑',fields:productFields,categories,categoryRoot:'锅炉',readonly:false});
const inspectionFields=[
 ['agency','检验机构名称','agency',true],['agencyCreditCode','统一社会信用代码','text',true],
 ['responsibilityUnit','检验责任主体单元','select',false,true,['演示检验一组','演示检验二组']],
 ['nature','检验性质','select',false,false,['演示记录']],['inspector','检验人员'],
 ['reportNumber','检验报告书编号','text',false,true],['reviewer','审核人员'],['reviewDate','审核日期','date'],
 ['approver','审批人员'],['approvalDate','审批日期','date'],['startDate','检验开始日期','date'],['endDate','检验结束日期','date'],
 ['conclusion','检验结论','select',false,false,['模拟记录（无法定效力）','演示待复核']],
 ['processingStatus','办理状态','select',false,false,['演示草稿','演示处理中','演示已完成']]
];
function makeForm(fields,values,mode,config=definitions.get('boiler-product')){
 const form=el('form','product-form');form.noValidate=true;
 form.append(el('p','notice',mode==='readonly'?'演示模式，仅供查看。当前未接通本产品编辑保存，不修改前端记录或数据库。':mode==='edit'?'演示模式：修改仅作用于当前前端会话，刷新后不保留；不写入服务器、SQLite或在用设备台账。':'模拟产品检验信息，仅当前前端会话保存，无法定检验效力；不改变设备许可或法定检验状态。'));
 const grid=el('div','unit-info-grid product-form-grid'),controls={};
 for(const [key,label,kind='text',required=false,wide=false,choices=[]] of fields){
 const holder=el('div','unit-info-field product-form-field'+(wide?' full-width':'')+(config.rowStarts?.includes(key)?' product-row-start':'')),caption=el('label');caption.htmlFor='product-field-'+key;
 if(required){const star=el('span','required-mark','*');star.setAttribute('aria-hidden','true');caption.append(star)}caption.append(document.createTextNode(label));
 if(kind==='category'||kind==='category3'){const picker=V2ProductCategories.create(config.productType,values[key]||'',{readonly:mode==='readonly'});controls[key]=picker.input;holder.append(caption,picker.element);grid.append(holder);continue;}
 let control=el(kind==='select'||kind==='category'||kind==='category3'?'select':kind==='textarea'?'textarea':'input','control product-control');
 control.id='product-field-'+key;control.name=key;control.setAttribute('aria-label',label);
 if(kind==='select'||kind==='category'||kind==='category3'){for(const value of ['',...((kind==='category'||kind==='category3')?config.categories:choices)]){const option=el('option','',value||'请选择');option.value=value;control.append(option)}}
 else if(kind!=='textarea'){control.type=kind==='number'?'number':kind==='date'?'date':'text';if(kind==='number'){control.step='any';if(!/Temperature/.test(key))control.min='0';}}
 else control.rows=2;
 control.value=values[key]??'';controls[key]=control;holder.append(caption);
 const accessory=config.accessories?.[key];if(accessory){const wrapper=el('div','product-field-accessory'),extra=button(accessory.label,'secondary product-accessory-button',()=>{});extra.disabled=true;extra.title=accessory.title;wrapper.append(control,extra);holder.append(wrapper);}else holder.append(control);
 if(kind==='manufacturer'||kind==='agency'){const datalist=el('datalist');datalist.id='product-options-'+key;control.setAttribute('list',datalist.id);for(const value of kind==='agency'?V2InspectionUnits.rows.map(r=>r.name):manufacturers){const option=el('option');option.value=value;datalist.append(option)}holder.append(datalist);}
 grid.append(holder);
 }
 const error=el('p','form-error');error.setAttribute('role','alert');form.append(grid,error);
 if(controls.agency)controls.agency.addEventListener('input',()=>{const unit=V2InspectionUnits.rows.find(r=>r.name===controls.agency.value);if(unit)controls.agencyCreditCode.value=unit.creditCode;});
 if(mode==='readonly')for(const control of Object.values(controls)){if(control.tagName==='SELECT')control.disabled=true;else control.readOnly=true;}
 return {form,controls,error};
}
function fail(view,message,input){view.error.textContent=message;view.error.scrollIntoView({block:'nearest'});input?.focus({preventScroll:true});return null;}
function validate(fields,view){
 const draft={};
 for(const [key,label,kind='text',required=false] of fields){
 const input=view.controls[key],value=input.value.trim();
 if(required&&!value){return fail(view,label+'为必填项',input);}
 if(input.validity.badInput){return fail(view,label+'格式不正确',input);}
 if(kind==='number'&&value){const n=Number(value);if(!Number.isFinite(n)||(!/Temperature/.test(key)&&n<0)){return fail(view,label+'须为合理数值',input);}draft[key]=n;}
 else draft[key]=value;
 }
 return draft;
}
function openForm(title,view,api,onSave){
 const save=button('保存','primary',()=>view.form.requestSubmit());save.dataset.productSave='true';
 view.form.onsubmit=e=>{e.preventDefault();onSave()};
 api.show(title,view.form,'organization-dialog product-dialog',()=>save.remove());
 document.querySelector('#dialog .dialog-footer').prepend(save);
}
function edit(row,api){
 const config=definitions.get(row.productType||'boiler-product'),view=makeForm(config.fields,row,config.readonly?'readonly':'edit',config);view.form.dataset.productId=row.id;view.form.dataset.productType=row.productType||'boiler-product';
 if(config.readonly){view.form.onsubmit=e=>e.preventDefault();api.show(config.title,view.form,'organization-dialog product-dialog');return;}
 openForm(config.title,view,api,()=>{
 const draft=validate(config.fields,view);if(!draft)return;
 if(V2.fixtures[row.productType||'boiler-product'].some(r=>r.id!==row.id&&(r.equipmentCode===draft.equipmentCode||r.productNumber===draft.productNumber))){fail(view,'设备代码或产品编号重复，请使用独立演示标识');return;}
 if(draft.category&&!V2ProductCategories.path(row.productType||'boiler-product',draft.category).length){fail(view,'请选择本类产品适用的设备类别');return;}
 Object.assign(row,draft,{categoryGroup:V2ProductCategories.path(row.productType||'boiler-product',draft.category)[0]||''});api.close();api.refresh();api.announce('已更新当前前端演示会话，未写入服务器');
 });
}
function inspectionFor(id,type='boiler-product'){return structuredClone(inspections.get(type+'|'+id)||{});}
function inspection(row,api){
 const view=makeForm(inspectionFields,inspectionFor(row.id,row.productType),'inspection');view.form.dataset.productId=row.id;view.form.dataset.productType=row.productType||'boiler-product';
 openForm('检验信息',view,api,()=>{
 const draft=validate(inspectionFields,view);if(!draft)return;
 for(const [start,end] of [['startDate','endDate'],['endDate','reviewDate'],['reviewDate','approvalDate']])if(draft[start]&&draft[end]&&draft[start]>draft[end]){fail(view,'日期逻辑不正确：检验开始、结束、审核、审批日期须依次排列');return;}
 inspections.set((row.productType||'boiler-product')+'|'+row.id,{...draft,productId:row.id,productType:row.productType||'boiler-product'});api.close();api.announce('模拟检验信息已保存至当前前端会话，无法定效力');
 });
}
function copy(row,api){
 try{
 const target=V2.fixtures[row.productType||'boiler-product'];
 let candidate;
 do{const n=++copyCounter;candidate={...structuredClone(row),auditRecords:[],id:'DEMO-'+(row.productType||'boiler-product').toUpperCase()+'-COPY-'+n,equipmentCode:row.equipmentCode+'-COPY-'+n,productNumber:row.productNumber+'-COPY-'+n,createdAt:new Date().toISOString().slice(0,19).replace('T',' ')};}
 while(target.some(r=>r.id===candidate.id||r.equipmentCode===candidate.equipmentCode||r.productNumber===candidate.productNumber));
 target.push(candidate);api.refresh();api.announce('复制成功 · 仅当前前端演示会话有效，刷新后不保留');
 }catch(error){api.announce('复制失败，未创建产品副本：'+error.message);}
}
function menu(trigger,row,api){
 const existing=document.getElementById('product-more-menu'),same=existing?.dataset.productId===row.id;closeMenu();if(same)return;
 const pop=el('div','record-more-menu');pop.id='product-more-menu';pop.dataset.productId=row.id;pop.setAttribute('popover','manual');pop.setAttribute('role','menu');
 const controller=new AbortController(),tr=trigger.closest('tr');tr.classList.add('product-menu-active');trigger.classList.add('product-menu-button');
 function cleanup(){controller.abort();tr.classList.remove('product-menu-active');trigger.classList.remove('product-menu-button');if(pop.matches(':popover-open'))pop.hidePopover();pop.remove();closeMenu=()=>{};}
 closeMenu=cleanup;
 const unavailable=button('修改记录','',()=>{cleanup();trigger.focus();V2MoreDialogs.open('修改记录',row.productType||'boiler-product',row,api.show)});unavailable.setAttribute('role','menuitem');
 const open=button('检验信息','',()=>{cleanup();trigger.focus();inspection(row,api)});open.setAttribute('role','menuitem');pop.append(unavailable,open);document.body.append(pop);
 const r=trigger.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(r.right+8,innerWidth-226))+'px';pop.style.top=Math.max(8,Math.min(r.top,innerHeight-160))+'px';pop.showPopover();
 document.addEventListener('pointerdown',e=>{if(!pop.contains(e.target)&&!trigger.contains(e.target))cleanup()},{signal:controller.signal});
 document.addEventListener('scroll',e=>{if(!pop.contains(e.target))cleanup()},{capture:true,signal:controller.signal});window.addEventListener('resize',cleanup,{signal:controller.signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){cleanup();trigger.focus()}},{signal:controller.signal});
}
function action(kind,row,trigger,api){
 if(!V2.fixtures[row.productType||'boiler-product']?.some(r=>r.id===row.id))throw Error('产品上下文无效');
 if(kind==='product-edit')edit(row,api);else if(kind==='product-copy')copy(row,api);else if(kind==='product-menu')menu(trigger,row,api);
}
function register(key,config){
 config.productType=key;config.categories=V2ProductCategories.labels(key);definitions.set(key,config);
 for(const row of config.rows){row.productType=key;row.auditRecords??=[];if(row.category&&!V2ProductCategories.path(key,row.category).length)throw Error('产品样本类别不在字典中：'+row.category);}
 V2.fixtures[key]=config.rows;V2.types[key]={...V2.types['boiler-product'],title:config.pageTitle,columns:config.columns||columns,searchKeys:config.searchKeys||V2.types['boiler-product'].searchKeys,advancedFields:config.advancedFields,queries:config.queries||[q('search','综合查询'),q('manufacturer','制造单位'),{...q('category','设备类别',config.categories),productCategory:key}],rowActions:V2.types['boiler-product'].rowActions.map(([label,kind])=>[kind==='product-menu'&&config.menuLabel?config.menuLabel:label,kind])};
}
Object.assign(V2.types['boiler-product'].queries.find(f=>f.key==='category'),{productCategory:'boiler-product',options:V2ProductCategories.labels('boiler-product')});
return {rows,columns,productFields,inspectionFields,inspectionFor,register,action,closeMenu:()=>closeMenu()};
})();

