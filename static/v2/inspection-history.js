/* Shared per-device inspection view for detail tabs and the More dialog. */
window.V2InspectionHistory=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(label,cls,fn)=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;};
const flowFields=['检验类别','申报时间','业务流水号','办理环节','报告书编号','申报单编号'];
const delayFields=['未检原因','检验类别名称','下次检验日期','延期检验至','申请人','申请日期','备注'];
function disabled(label){const b=el('button','more-disabled',label);b.type='button';b.disabled=true;b.title='演示模式暂不支持修改或提交';return b;}
function notice(text){return el('p','more-context-note',text);}
function recordSubview(ctx,listing,record,action,labels){
 if(ctx.isDisposed())return;
 if(action==='详情'||action==='报告附件'){V2InspectionRecordDialogs.open(action,ctx.type,ctx.row,record);return;}
 const body=ctx.scrollHost,scroll=body.scrollTop,view=el('div','more-record-view');
 view.append(button('‹ 返回历史检验信息','secondary',()=>{if(ctx.isDisposed())return;ctx.root.replaceChildren(listing);body.scrollTop=scroll;}));
 if(action!=='详情')view.append(notice('演示数据暂无对应文件（'+action+'）。不生成或提供真实法定检验报告、附件或意见书。'));
 else{
 view.append(notice('当前设备 '+ctx.row.equipmentCode+' 的虚构检验记录，只读展示，无法定效力。'));
 const dl=el('dl','more-record-fields');
 for(const label of labels){const item=el('div');item.append(el('dt','',label),el('dd','',String(record[label]??'—')));dl.append(item);}view.append(dl);
 }
 ctx.root.replaceChildren(view);body.scrollTop+=ctx.root.getBoundingClientRect().top-body.getBoundingClientRect().top;
}
function render(ctx){
 const {type,row,root,entry}=ctx,listing=el('div','more-inspection-list');listing.append(notice('设备：'+row.equipmentCode+' · 复用设备详情中的虚构检验记录，非真实检验证明。'));
 const rows=V2Dossier.histories(type,row),options={
 queryFirst:true,operationWidth:360,pageSizes:[1,5,10,20],
 strictInspectionKinds:['elevator','crane','vehicle','amusement','ropeway','installation'].includes(type),inspectionKinds:type==='installation'?V2InstallationSchema.inspectionKinds:V2EquipmentSchema.optionsFor(type,{key:'inspectionKind',label:'检验类别'})||[...new Set(rows.map(r=>r['检验类别']))],
 toolbar:()=>{const tools=el('div','more-table-toolbar');tools.append(V2ActionIcons.prepend(disabled('新增'),'add'),V2ActionIcons.prepend(disabled('删除'),'delete'),el('span','','演示模式暂不支持修改'));return tools;},
 renderActions:record=>{const actions=el('div','more-inspection-actions');for(const name of ['详情','报告','报告附件','意见书'])actions.append(button(name,'row-action',()=>recordSubview(ctx,listing,record,name,V2Dossier.inspectionHeaders)));return actions;}
 };
 listing.append(V2Dossier.recordTable(entry,'completed','已完成检验信息',V2Dossier.inspectionHeaders,rows,'history',options));
 listing.append(V2Dossier.recordTable(entry,'processing','正在检验流程',flowFields,[],null,{emptyText:'暂无数据'}));
 listing.append(V2Dossier.recordTable(entry,'delay','延期检验申请',delayFields,[],null,{emptyText:'暂无数据',toolbar:()=>{const bar=el('div','more-table-toolbar');bar.append(disabled('登记'),el('span','','演示模式不支持提交；申请不代表延期批准。'));return bar;}}));
 root.append(listing);
}

function create({type,row,entry,scrollHost,isDisposed=()=>false}){
 const root=el('div','inspection-history-view');root.dataset.type=type;root.dataset.record=row.id;
 render({type,row,entry,scrollHost,root,isDisposed});return root;
}
return {create,flowFields,delayFields};
})();
