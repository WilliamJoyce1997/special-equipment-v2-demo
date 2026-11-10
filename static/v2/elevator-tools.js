/* Elevator toolbar only. All mutations are explicit, selected-row, browser-session Demo operations. */
window.V2ElevatorTools=(()=>{
'use strict';
const U=()=>V2QueryResults;
const maintenanceFields=[['maintenanceOrg','维保单位名称','text',true],['maintenanceCode','维保单位代码'],['maintenanceLicense','许可证编号'],['maintenanceContact','维保负责人'],['maintenancePhone','维保联系电话'],['maintenanceContractUntil','维保合同有效期','date'],['rescuePhone','驻点救援值守电话']];
function validateRows(rows){if(!rows.length||rows.some(r=>!V2.fixtures.elevator.includes(r)))throw Error('请先选择当前电梯记录');}
function patch(kind,values){if(kind==='important'){if(!['是','否'].includes(values.important))throw Error('请选择是否在重要场所');return {important:values.important};}
 if(kind==='risk'){if(!V2EquipmentSchema.elevatorEnums.riskLevel.includes(values.riskLevel))throw Error('请选择风险等级');return {riskLevel:values.riskLevel};}
 if(kind!=='maintenance')throw Error('不支持的操作');
 const next={};for(const [key,label]of maintenanceFields){next[key]=String(values[key]??'').trim();if(next[key].length>200)throw Error(label+'过长');}
 if(!next.maintenanceOrg)throw Error('请选择或填写维保单位名称');
 if(next.maintenanceContractUntil&&!V2ElevatorMore.dateValid(next.maintenanceContractUntil))throw Error('维保合同有效期格式无效');
 return next;
}
function apply(rows,kind,values){validateRows(rows);const changes=patch(kind,values);for(const r of rows)Object.assign(r,changes);return changes;}
function batch(kind,ctx){const rows=ctx.selected().slice();try{validateRows(rows);}catch(e){ctx.api.announce(e.message);return;}
 ctx.remember();const {el,button}=U(),root=el('div','elevator-toolbar-form'),form=el('form'),grid=el('div',kind==='maintenance'?'elevator-maintenance-grid':''),inputs={},error=el('p','form-error');error.setAttribute('role','alert');form.noValidate=true;
 root.append(el('p','notice','已选 '+rows.length+' 条电梯 · 仅修改当前前端演示会话，刷新后不保留；不改变法定检验、许可状态。'));
 if(kind==='maintenance'){for(const [key,label,type='text',required]of maintenanceFields){const wrap=el('label','elevator-maintenance-field');if(required)wrap.append(el('span','required-mark','*'));wrap.append(document.createTextNode(label));
 const input=el('input','control');input.type=type;input.setAttribute('aria-label',label);const vals=[...new Set(rows.map(r=>String(r[key]??'')))];input.value=vals.length===1?vals[0]:'';inputs[key]=input;
 if(key==='maintenanceOrg'){const field=el('div','elevator-maintenance-search'),search=button('⌕','secondary',()=>{choices.hidden=!choices.hidden;}),choices=el('div','elevator-maintenance-choices');search.setAttribute('aria-label','搜索选择维保单位');choices.hidden=true;
 const names=[...new Set(V2.fixtures.elevator.map(r=>r.maintenanceOrg).filter(Boolean))];for(const name of names)choices.append(button(name,'secondary',()=>{input.value=name;for(const k of ['maintenanceCode','maintenanceLicense']){const v=[...new Set(V2.fixtures.elevator.filter(r=>r.maintenanceOrg===name).map(r=>r[k]).filter(Boolean))];if(inputs[k])inputs[k].value=v.length===1?v[0]:'';}choices.hidden=true;}));if(!names.length)choices.append(el('p','','当前演示数据暂无可选维保单位，可手工填写演示名称'));field.append(input,search);wrap.append(field,choices);}else wrap.append(input);grid.append(wrap);}}
 else{const key=kind==='important'?'important':'riskLevel',select=el('select','control'),label=kind==='important'?'是否在重要场所':'风险等级';select.setAttribute('aria-label',label);for(const v of ['',...(kind==='important'?['是','否']:V2EquipmentSchema.elevatorEnums.riskLevel)]){const o=el('option','',v||'请选择');o.value=v;select.append(o);}inputs[key]=select;grid.append(select);}
 const actions=el('div','elevator-dialog-actions'),save=el('button','primary',kind==='maintenance'?'保存':'确认');save.type='submit';actions.append(save,button('取消','secondary',ctx.api.close));
 form.append(grid,error,actions);form.onsubmit=e=>{e.preventDefault();try{apply(rows,kind,Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));ctx.api.close();ctx.refresh();ctx.api.announce('已更新所选电梯的当前演示会话数据，未写入服务器');}catch(e){error.textContent=e.message;}};
 root.append(form);ctx.api.show(kind==='important'?'是否在重要场所批量修改':kind==='risk'?'风险等级批量修改':'更新维保',root,kind==='maintenance'?'elevator-dialog elevator-maintenance-dialog':'elevator-batch-dialog');
}
const printKeys=['id','equipmentCode','name','unit','category','internalCode','registrationOrg','inspectionOrg','testingOrg','nextInspection','nextTestingDate','inspectionTestingNature','certificate','maintenanceOrg','rescuePhone','registrationCode'];
function print(rows,api){try{validateRows(rows);const token=crypto.randomUUID(),payload={version:1,created:Date.now(),rows:rows.map(r=>Object.fromEntries(printKeys.map(k=>[k,r[k]??''])))},key='v2:elevator-print:'+token;
 // The new same-origin window receives a sessionStorage snapshot, then severs its opener.
 for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k?.startsWith('v2:elevator-print:')){try{if(Date.now()-JSON.parse(sessionStorage.getItem(k)).created>3600000)sessionStorage.removeItem(k);}catch{sessionStorage.removeItem(k);}}}
 sessionStorage.setItem(key,JSON.stringify(payload));const win=window.open('/scdrpt/rpt_printCrt.shtml?demo='+encodeURIComponent(token),'_blank');if(!win){sessionStorage.removeItem(key);throw Error('浏览器阻止了打印窗口，请允许本地预览打开新窗口后重试');}
 }catch(e){api.announce(e.message);}}
function toolbar(ctx){const {button}=U(),printButton=button('使用标志','tool',()=>print(ctx.selected(),ctx.api)),more=button('更多>>>','tool',()=>{if(!ctx.selected().length){ctx.api.announce('请先选择电梯记录');return;}V2Dossier.more(more,label=>batch({'重要场所':'important','风险等级':'risk','更新维保':'maintenance'}[label],ctx),['重要场所','风险等级','更新维保']);});
 const icon=document.createElement('img');
 icon.className='v2-action-icon';
 icon.src='/static/v2/elevator-use-mark.svg';
 icon.alt='';
 printButton.prepend(icon);
 printButton.dataset.elevatorTool='print';more.dataset.elevatorTool='more';return [printButton,more];}
function update(root,rows){for(const b of root.querySelectorAll('[data-elevator-tool]')){b.disabled=!rows.length;b.title=rows.length?'':'请至少选择一条电梯记录';}}
return {toolbar,update,patch,apply,maintenanceFields,printKeys};
})();
