/* Persist query plans independently of table presentation settings and business archives. */
window.V2QueryPlans=(()=>{
'use strict';
const instances=new Map();
function create(domain){
const title={person:'人员综合查询',unit:'单位综合查询',equipment:'设备综合查询'}[domain];if(!title)throw Error('未知查询模块');
const U=V2QueryResults,{el,button}=U,E=V2QueryEngine,KEY='opencmms.v2.query-plans.'+domain+'.v1';
const st=U.state();let searched=false,filters={creator:'',from:'',to:''},plans=[],loadError='';
function localTime(iso){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)),v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return v.year+'-'+v.month+'-'+v.day+' '+v.hour+':'+v.minute+':'+v.second;}
const columns=[{key:'createdBy',label:'创建人',width:230},{key:'createdAt',label:'创建时间',width:240,format:localTime},{key:'name',label:'查询名称',width:340}];
function load(){try{const raw=localStorage.getItem(KEY);if(raw&&raw.length>1000000)throw Error('方案存储超过限制');const data=raw?JSON.parse(raw):[];if(!Array.isArray(data)||data.length>200)throw Error('本机方案集合格式无效');const ids=new Set();for(const p of data){if(p.domain!==domain)throw Error('方案对象类型不匹配');if(typeof p.id!=='string'||ids.has(p.id)||p.createdBy!=='演示查询用户'||!Number.isFinite(Date.parse(p.createdAt)))throw Error('方案元数据无效');ids.add(p.id);
 try{if(p.domain==='equipment'&&p.subtype==='installation'){const d=V2QueryDictionaries.get(p.domain,p.objectType,p.subtype),aliases=Object.fromEntries(d.fields.flatMap(f=>(f.aliases||[]).map(id=>[id,f.id]))),canonical=id=>d.fieldMap[id]?id:aliases[id]||id;const walk=n=>{if(n.kind==='group')n.children.forEach(walk);else n.fieldId=canonical(n.fieldId);};p.conditionFieldIds=p.conditionFieldIds.map(canonical);p.resultColumns=p.resultColumns.map(c=>({...c,fieldId:canonical(c.fieldId)}));walk(p.expression);}E.validatePlan(p);}catch(e){p._compatibilityError='方案“'+String(p.name||p.id)+'”与当前字段配置不兼容（可能引用已移除或不适用字段）：'+e.message+'。该方案未执行；原方案保留，可删除后按新字段重建。';}}
 plans=data;loadError='';}catch(e){plans=[];loadError='读取本机方案失败：'+e.message+'。原存储未覆盖，请检查浏览器存储。';}return plans;}
function persist(next){if(loadError)throw Error(loadError);const safe=next.map(p=>{if(p._compatibilityError){const raw=JSON.parse(localStorage.getItem(KEY)||'[]').find(x=>x.id===p.id&&x.domain===domain);if(!raw)throw Error('旧方案已不存在，请重新查询');return raw;}
const expression=n=>{
 const node=n.kind==='group'?{kind:'group',logic:n.logic,children:n.children.map(expression)}:{kind:'rule',fieldId:n.fieldId,op:n.op,...(n.op==='between'?{values:n.values}:['empty','notEmpty'].includes(n.op)?{}:{value:n.value})};
 if(n.join!==undefined)node.join=n.join;
 return node;
};
E.validatePlan(p);return {version:1,domain,...(p.subtype?{subtype:p.subtype}:{}),id:p.id,name:p.name,objectType:p.objectType,conditionFieldIds:p.conditionFieldIds.slice(),expression:expression(p.expression),resultColumns:p.resultColumns.map(c=>({fieldId:c.fieldId,color:c.color,frozen:c.frozen})),createdBy:'演示查询用户',createdAt:p.createdAt,updatedAt:p.updatedAt};});
const text=JSON.stringify(safe);if(text.length>1000000||safe.length>200)throw Error('最多保存200个方案，总长度不超过1MB');try{localStorage.setItem(KEY,text);}catch(e){throw Error('本机方案保存失败：浏览器存储不可用或空间不足；此次修改未确认保存');}plans=safe;}
function render(api){load();const root=el('div','cq-plans'),queryPanel=el('section','panel query-panel'),form=el('form','cq-plan-query');form.setAttribute('aria-label',title+'方案查询');
const creator=U.control('创建人','text',filters.creator),from=U.control('创建时间开始','date',filters.from),to=U.control('创建时间结束','date',filters.to),grid=el('div','cq-plan-query-grid'),dates=el('div','cq-plan-dates');dates.append(from.wrap,document.createTextNode('—'),to.wrap);grid.append(creator.wrap,dates);const actions=el('div','query-actions'),submit=el('button','primary','查询'),error=el('p','form-error');submit.type='submit';error.setAttribute('role','alert');
actions.append(submit,button('重置','secondary',()=>{filters={creator:'',from:'',to:''};searched=false;st.page=1;st.selected.clear();api.refresh();}));form.append(grid,actions,error);queryPanel.append(form);root.append(queryPanel);
const notice=el('p','notice',loadError||'仅当前浏览器、当前预览地址的本机演示方案。创建人为演示身份，不代表已认证账号。清除浏览器存储会丢失方案；业务档案不写入本机方案存储。');root.append(notice);
const panel=el('section','panel table-panel'),toolbar=el('div','table-toolbar'),holder=el('div');
function matched(){return searched?plans.filter(p=>(!filters.creator||p.createdBy.includes(filters.creator))&&(!filters.from||localTime(p.createdAt).slice(0,10)>=filters.from)&&(!filters.to||localTime(p.createdAt).slice(0,10)<=filters.to)):[];}
function redraw(){holder.replaceChildren(U.table({title:title+'方案',tableId:'query-plans/'+domain,columns,rows:matched(),st,emptyText:searched?'没有找到符合条件的数据':'请点击查询查看已保存方案',actions:p=>[button('编辑','row-action',()=>edit(p)),button('执行','row-action',()=>{try{if(p._compatibilityError){compatibility(p);return;}U.view(p,api);}catch(e){api.announce(e.message);}}),button('删除','row-action',()=>remove([p.id]))]}));}
function compatibility(p){const box=el('div');box.append(el('p','notice',p._compatibilityError));api.show('查询方案需要重新配置',box);}
function edit(p){if(p?._compatibilityError){compatibility(p);return;}V2QueryBuilder.open(p,api,draft=>{load();if(loadError)throw Error(loadError);const now=new Date().toISOString(),saved={...draft,id:p?.id||'DEMO-QUERY-'+crypto.randomUUID(),createdBy:'演示查询用户',createdAt:p?.createdAt||now,updatedAt:now};if(p&&!plans.some(x=>x.id===p.id))throw Error('方案已不存在，请重新查询');persist(p?plans.map(x=>x.id===p.id?saved:x):[...plans,saved]);searched=true;st.selected.clear();api.close();api.refresh();api.announce('方案已保存至当前浏览器演示存储');},domain);}
function remove(ids){if(!ids.length){api.announce('请先选择查询方案');return;}const box=el('div'),problem=el('p','form-error');box.append(el('p','notice','确认删除 '+ids.length+' 个本机演示查询方案？不会删除业务档案。'),problem,button('确认删除','primary',()=>{try{load();if(loadError)throw Error(loadError);persist(plans.filter(p=>!ids.includes(p.id)));st.selected.clear();api.close();api.refresh();api.announce('本机查询方案已删除');}catch(e){problem.textContent=e.message;}}),button('取消','secondary',api.close));api.show('确认删除查询方案',box);}
function toolbarButton(label,action){const control=button('','tool',action);control.append(api.safetyActionIcon(label),el('span','',label));return control;}
toolbar.append(toolbarButton('新增',()=>edit(null)),toolbarButton('删除',()=>remove([...st.selected])),button('设置','link cq-toolbar-settings',()=>U.settings(columns,st,redraw,api)));panel.append(toolbar,holder);root.append(panel);
form.onsubmit=e=>{e.preventDefault();if((from.input.value&&!E.dateValid(from.input.value))||(to.input.value&&!E.dateValid(to.input.value))||(from.input.value&&to.input.value&&from.input.value>to.input.value)){error.textContent='创建时间范围无效：开始日期不能晚于结束日期';return;}filters={creator:creator.input.value.trim(),from:from.input.value,to:to.input.value};searched=true;st.page=1;st.selected.clear();load();notice.textContent=loadError||'仅展示当前浏览器保存的演示查询方案，不是业务档案。';error.textContent='';redraw();};
redraw();return root;}
return {render,key:KEY};
}
function instance(domain){if(!instances.has(domain))instances.set(domain,create(domain));return instances.get(domain);}
return {render:(api,domain='person')=>instance(domain).render(api),key:'opencmms.v2.query-plans.person.v1',keyFor:domain=>instance(domain).key};
})();


