/* Authoritative demo product dictionary. Equipment asset dictionaries are untouched. */
window.V2ProductCategories=(()=>{
'use strict';
const trees={
 'boiler-product':[
 ['承压蒸汽锅炉',[]],['承压热水锅炉',[]],['有机热载体锅炉',['有机热载体气相炉','有机热载体液相炉']],['旧目录锅炉',[]]],
 'vessel-product':[
 ['固定式压力容器',['超高压容器','第三类压力容器','第二类压力容器','第一类压力容器']],
 ['移动式压力容器',['铁路罐车','汽车罐车','长管拖车','罐式集装箱','管束式集装箱']],
 ['气瓶',['无缝气瓶','焊接气瓶','特种气瓶']],['氧舱',['医用氧舱','高气压舱']],['旧目录压力容器',[]]],
 'elevator-product':[
 ['曳引与强制驱动电梯',['曳引驱动乘客电梯','曳引驱动载货电梯','强制驱动载货电梯']],
 ['液压驱动电梯',['液压乘客电梯','液压载货电梯']],
 ['自动扶梯与自动人行道',['自动扶梯','自动人行道']],
 ['其它类型电梯',['防爆电梯','消防员电梯','杂物电梯']],['旧目录电梯',[]]],
 'crane-product':[
 ['桥式起重机',['通用桥式起重机','防爆桥式起重机','绝缘桥式起重机','冶金桥式起重机','电动单梁起重机','电动葫芦桥式起重机']],
 ['门式起重机',['架桥机','通用门式起重机','防爆门式起重机','轨道式集装箱门式起重机','轮胎式集装箱门式起重机','岸边集装箱起重机','造船门式起重机','电动葫芦门式起重机','装卸桥']],
 ['塔式起重机',['普通塔式起重机','电站塔式起重机']],
 ['流动式起重机',['轮胎起重机','履带起重机','集装箱正面吊运起重机','铁路起重机']],
 ['门座式起重机',['门座起重机','固定式起重机','液压折臂起重机']],
 ['升降机',['施工升降机','简易升降机']],
 ['缆索式起重机',[]],['桅杆式起重机',[]],['机械式停车设备',[]],['旧目录起重机',[]]],
 'pipe-component':[
 ['压力管道管子',['球墨铸铁管','复合管','无缝钢管','焊接钢管','有色金属管','非金属材料管']],
 ['压力管道管件',['非焊接管件（无缝管件）','焊接管件（有缝管件）','锻制管件','铸造管件','复合管件','非金属管件']],
 ['压力管道阀门',['安全阀','金属阀门','非金属阀门','特种阀门']],
 ['压力管道法兰',['钢制锻造法兰','非金属法兰']],
 ['补偿器',['金属波纹膨胀节','旋转补偿器','非金属膨胀节']],
 ['压力管道密封元件',['金属密封元件','非金属密封元件','压力管道特种元件','防腐管道元件','元件组合装置']]]
};
for(const tree of Object.values(trees)){for(const node of tree){Object.freeze(node[1]);Object.freeze(node)}Object.freeze(tree)}Object.freeze(trees);
const roots={'boiler-product':'锅炉','vessel-product':'压力容器','elevator-product':'电梯','crane-product':'起重机械','pipe-component':'压力管道元件'};
function path(type,value){for(const [parent,children] of trees[type]||[]){if(value===parent)return [parent];if(children.includes(value))return [parent,value]}return []}
function labels(type){return (trees[type]||[]).flatMap(([p,c])=>[p,...c])}
function matches(type,value,filter){return !filter||value===filter||(path(type,value)[0]===filter)}
function create(type,value='',{query=false,readonly=false,id='product-field-category'}={}){
 const tree=trees[type];if(!tree)throw Error('未知产品类别字典');
 const root=document.createElement('div');root.className=query?'product-category-query':'product-category';
 const hidden=document.createElement('input');hidden.type='hidden';hidden.name='category';hidden.id=id+'-value';
 const parent=document.createElement('select'),child=document.createElement('select');parent.className=child.className='control product-control';parent.id=id;parent.setAttribute('aria-label','设备类别');child.setAttribute('aria-label','设备子类别');
 if(!query){const top=document.createElement('select');top.className='control product-control';top.setAttribute('aria-label','设备大类');const o=document.createElement('option');o.textContent=roots[type];top.append(o);top.disabled=true;root.append(top)}
 function options(select,values){select.replaceChildren();for(const v of ['',...values]){const o=document.createElement('option');o.value=v;o.textContent=v||'请选择';select.append(o)}}
 options(parent,tree.map(n=>n[0]));
 function updateChild(selected=''){const children=tree.find(n=>n[0]===parent.value)?.[1]||[];options(child,children);child.hidden=!children.length;child.disabled=readonly||!children.length;child.value=children.includes(selected)?selected:'';root.classList.toggle('has-subcategory',children.length>0)}
 const initial=path(type,value);parent.value=initial[0]||'';updateChild(initial[1]);parent.disabled=readonly;hidden.value=initial.length?value:'';
 function update(){hidden.value=child.value||parent.value;hidden.dispatchEvent(new Event('change',{bubbles:true}))}
 parent.onchange=()=>{updateChild();update()};child.onchange=update;
 root.append(parent,child,hidden);return {element:root,input:hidden};
}
return {trees,roots,path,labels,matches,create};
})();

