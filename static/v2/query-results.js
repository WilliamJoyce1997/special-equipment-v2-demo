/* One presentation configuration per table; business rows and query state are never stored here. */
window.V2TableSettings=(()=>{
 const prefix='v2:table-fields:v1:',help='提示\n1.勾选展示字段，可设置字段是否在页面上展示\n2.上下拖动字段名称，可调整字段在页面上的显示位置\n3.勾选冻结字段，左右拖动视图时，该字段及该字段之前字段将始终显示在页面上';
 const defaults=columns=>columns.map(c=>({...c,shown:c.shown!==false,color:c.color||'#000000',frozen:!!c.frozen}));
 function reconcile(columns,items){const base=defaults(columns),byKey=new Map(base.map(c=>[c.key,c])),seen=new Set(),result=[];
  for(const item of Array.isArray(items)?items:[]){const c=byKey.get(item?.key);if(!c||seen.has(c.key))continue;seen.add(c.key);result.push({...c,shown:item.shown!==false,color:/^#[\da-f]{6}$/i.test(item.color)?item.color:c.color,frozen:!!item.frozen});}
  return [...result,...base.filter(c=>!seen.has(c.key))];
 }
 function read(id,columns){try{const saved=JSON.parse(localStorage.getItem(prefix+id)||'null');return reconcile(columns,saved?.version===1?saved.fields:null);}catch{return defaults(columns);}}
 function save(id,columns,fields){const next=reconcile(columns,fields);try{localStorage.setItem(prefix+id,JSON.stringify({version:1,fields:next.map(({key,shown,color,frozen})=>({key,shown,color,frozen}))}));}catch{throw Error('字段配置保存失败，浏览器存储不可用或空间不足；未应用此次修改');}return next;}
 function childApi(){let modal;return {show(title,body,mode,cleanup){const {el,button}=V2QueryResults;modal=el('dialog',mode+' table-settings-child');modal.setAttribute('aria-label',title);const header=el('div','dialog-header');header.append(el('h2','',title),button('×','icon-button',()=>modal.close()));const content=el('div','table-settings-body');content.append(body);modal.append(header,content);modal.addEventListener('close',()=>{cleanup?.();modal.remove();},{once:true});document.body.append(modal);modal.showModal();},close(){modal?.close();}};}
 function open(id,columns,refresh,api){const a=api?.close?api:childApi();V2FieldSettings.open({items:read(id,columns),defaults:()=>defaults(columns),isQuery:false,show:a.show,close:a.close,refresh,helpText:help,onSave:fields=>save(id,columns,fields)});}
 function position(table){let left=0;for(const h of table.tHead?.rows[0]?.cells||[]){const fixed=h.dataset.freeze==='true';if(fixed){for(const row of table.rows){const cell=row.cells[h.cellIndex];if(cell&&cell.colSpan===1)cell.style.left=left+'px';}left+=h.getBoundingClientRect().width;}}}
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const {target}of entries){if(!target.isConnected)resize.unobserve(target);else if(target.getBoundingClientRect().width)position(target);}}):null;
 // Reorder the existing cell nodes, retaining sort, selection and action handlers.
 function decorate(table,id,columns,functional,trailing=0){
  const fields=read(id,columns),shown=fields.filter(c=>c.shown),lastFrozen=shown.reduce((n,c,i)=>c.frozen?i:n,-1),indices=shown.map(c=>columns.findIndex(x=>x.key===c.key)+functional);
  table.dataset.tableConfig=id;
  const reorder=nodes=>[...nodes.slice(0,functional),...indices.map(i=>nodes[i]),...(trailing?nodes.slice(-trailing):[])];
  let group=table.querySelector('colgroup');if(!group){group=document.createElement('colgroup');for(const width of [...Array(functional).fill(100),...columns.map(c=>c.width||190),...Array(trailing).fill(110)]){const col=document.createElement('col');col.style.width=width+'px';group.append(col);}table.prepend(group);}group.replaceChildren(...reorder([...group.children]));
  for(const row of table.rows){const cells=[...row.cells];if(cells.length===1&&cells[0].colSpan>1){cells[0].colSpan=functional+shown.length+trailing;continue;}
   row.replaceChildren(...reorder(cells));
   for(const [i,cell]of [...row.cells].entries()){const c=shown[i-functional];cell.dataset.freeze=String(i<functional||i-functional<=lastFrozen);cell.classList.toggle('v2-table-fixed',cell.dataset.freeze==='true');if(c){cell.classList.remove('cq-fixed','fixed');cell.dataset.field=c.key;if(cell.tagName==='TD')cell.style.color=c.color;}if(cell.dataset.freeze!=='true')cell.style.left='';}
  }
  const widths=[...(group?.children||[])].map(c=>parseFloat(c.style.width)||190);table.style.minWidth=widths.reduce((a,b)=>a+b,0)+'px';
  resize?.observe(table);requestAnimationFrame(()=>{if(table.isConnected)position(table);});return fields;
 }
 window.addEventListener?.('resize',()=>document.querySelectorAll('table[data-table-config]').forEach(position));
 return {read,save,defaults,reconcile,open,decorate,prefix};
})();

/* Reusable DOM-only table for query schemes and dynamic results. */
window.V2QueryResults=(()=>{
'use strict';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
function control(label,type='text',value=''){const wrap=el('label','cq-control',label),input=el('input','control');input.type=type;input.value=value;input.setAttribute('aria-label',label);wrap.append(input);return {wrap,input};}
function state(){return {page:1,size:10,selected:new Set(),sort:null,desc:false,hidden:new Set()};}
function ordered(columns,rows,st){const data=rows.slice(),col=columns.find(c=>c.key===st.sort);if(col)data.sort((a,b)=>{const av=a[col.key],bv=b[col.key];return (col.type==='number'?Number(av??0)-Number(bv??0):String(av??'').localeCompare(String(bv??''),'zh-CN',{numeric:true}))*(st.desc?-1:1)||String(a.id).localeCompare(String(b.id));});return data;}
function table({title,columns,rows,st,actions,emptyText='没有找到符合条件的数据',check=true,actionWidth=220,tableId='shared/'+title,settingsButton=false}){
const root=el('section','cq-table-card'),scroll=el('div','table-scroll cq-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',title+'横向滚动');const t=el('table');t.setAttribute('aria-label',title);
const valid=new Set(rows.map(r=>r.id));for(const id of st.selected)if(!valid.has(id))st.selected.delete(id);
const data=ordered(columns,rows,st);
st._tableId=tableId;st.page=Math.max(1,Math.min(st.page,Math.ceil(data.length/st.size)||1));const visible=data.slice((st.page-1)*st.size,st.page*st.size),cols=columns,head=el('thead'),tr=el('tr'),cg=el('colgroup');
const defs=[...(check?[{key:'_check',label:'',width:42,frozen:true}]:[]),{key:'_seq',label:'序号',width:64,frozen:true},...(actions?[{key:'_actions',label:'操作',width:actionWidth,frozen:true}]:[]),...cols];let offset=0;
for(const c of defs){const col=el('col');col.style.width=(c.width||190)+'px';cg.append(col);const th=el('th');if(c.frozen){th.className='cq-fixed';th.style.left=offset+'px';offset+=c.width||190;}
if(c.key==='_check'){const cb=el('input');cb.type='checkbox';cb.setAttribute('aria-label',title+'选择本页全部');cb.checked=!!visible.length&&visible.every(r=>st.selected.has(r.id));cb.indeterminate=visible.some(r=>st.selected.has(r.id))&&!cb.checked;cb.disabled=!visible.length;cb.onchange=()=>{for(const r of visible)cb.checked?st.selected.add(r.id):st.selected.delete(r.id);redraw()};th.append(cb);}
else if(c.key.startsWith('_'))th.textContent=c.label;else{const b=button(c.label+' ↕','sort',()=>{st.desc=st.sort===c.key?!st.desc:false;st.sort=c.key;redraw()});b.setAttribute('aria-label','按'+c.label+'排序');th.append(b);}tr.append(th);}
head.append(tr);const body=el('tbody');
for(const [i,r]of visible.entries()){const line=el('tr');line.dataset.id=r.id;let left=0;for(const c of defs){const td=el('td');if(c.frozen){td.className='cq-fixed';td.style.left=left+'px';left+=c.width||190;}if(c.key==='_check'){const cb=el('input');cb.type='checkbox';cb.setAttribute('aria-label','选择 '+r.id);cb.checked=st.selected.has(r.id);cb.onchange=()=>{cb.checked?st.selected.add(r.id):st.selected.delete(r.id);redraw()};td.append(cb);}
else if(c.key==='_seq')td.textContent=(st.page-1)*st.size+i+1;else if(c.key==='_actions'){const group=el('div','record-actions');group.append(...actions(r));td.append(group);}else{td.textContent=r[c.key]===null||r[c.key]===undefined||r[c.key]===''?'—':c.format?c.format(r[c.key]):String(r[c.key]);td.style.color=c.color||'';}line.append(td);}body.append(line);}
if(!visible.length){const line=el('tr'),td=el('td','cq-empty',emptyText);td.colSpan=defs.length;line.append(td);body.append(line);}
t.style.minWidth=defs.reduce((sum,c)=>sum+(c.width||190),0)+'px';t.append(cg,head,body);V2TableSettings.decorate(t,tableId,columns,(check?1:0)+1+(actions?1:0));scroll.append(t);
const footer=el('div','table-footer'),pages=el('div','pagination'),prev=button('‹','secondary',()=>{st.page--;redraw()}),next=button('›','secondary',()=>{st.page++;redraw()});prev.disabled=st.page<=1;next.disabled=st.page>=Math.ceil(data.length/st.size);prev.setAttribute('aria-label',title+'上一页');next.setAttribute('aria-label',title+'下一页');const size=el('select','control');size.setAttribute('aria-label',title+'每页条数');for(const n of [1,2,5,10,20]){const o=el('option','',n+'条/页');o.value=n;size.append(o);}size.value=st.size;size.onchange=()=>{st.size=Number(size.value);st.page=1;redraw()};pages.append(prev,el('span','',st.page+' / '+(Math.ceil(data.length/st.size)||1)),next,size);
const count=el('div','result-count');count.append(document.createTextNode('当前共有 '),el('span','count-total',data.length),document.createTextNode(' 条数据，已选 '),el('span','count-selected',st.selected.size),document.createTextNode(' 条'));footer.append(pages,count);root.append(scroll,footer);
function redraw(){const x=scroll.scrollLeft;root.replaceWith(table({title,columns,rows,st,actions,emptyText,check,actionWidth,tableId,settingsButton}));const nextRoot=document.querySelector('table[aria-label="'+title+'"]')?.parentElement;if(nextRoot)nextRoot.scrollLeft=x;}
if(settingsButton){const bar=el('div','table-toolbar');bar.append(button('设置','link',()=>V2TableSettings.open(tableId,columns,redraw)));root.prepend(bar);}
return root;
}
function settings(columns,st,refresh,api){V2TableSettings.open(st._tableId,columns,refresh,api);}
function csv(columns,rows,title){const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const text='\uFEFF'+[columns.map(c=>c.label),...rows.map(r=>columns.map(c=>r[c.key]))].map(r=>r.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=url;a.download=title+'-虚构样本.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function view(plan,api){const E=V2QueryEngine,D=V2QueryDictionaries.get(plan.domain,plan.objectType,plan.subtype),root=el('div','cq-results'),st=state(),holder=el('div'),columns=plan.resultColumns.map(c=>({key:c.fieldId,label:D.fieldMap[c.fieldId].label,type:D.fieldMap[c.fieldId].type,color:c.color,frozen:c.frozen,width:210})),rows=E.execute(plan);
if(!D.hasSource)root.append(el('p','notice cq-no-source','当前演示环境暂无该类型数据源'));
root.append(el('p','notice','方案：'+plan.name+' · 当前V2虚构样本实际筛选结果；'+D.resultNote+'排序与分页仅作用于本次结果。'));
const toolbar=el('div','table-toolbar');toolbar.append(button('导出','tool',()=>csv(columns,ordered(columns,rows,st),plan.name)));root.append(toolbar,holder);
holder.append(table({title:'组合查询结果',columns,rows,st,tableId:'query-results/'+plan.domain+'/'+plan.objectType+'/'+(plan.subtype||'')+'/'+plan.id,settingsButton:true}));
api.show(D.title+'结果',root,'organization-dialog cq-results-dialog');
return rows;
}
return {el,button,control,state,table,settings,csv,view};
})();


