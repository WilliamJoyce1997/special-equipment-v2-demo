/* One typed query engine shared across person, unit and equipment adapters. */
window.V2QueryEngine=(()=>{
'use strict';
const defaultDictionary=()=>V2QueryDictionaries.person;
const labels={eq:'等于',ne:'不等于',contains:'包含',notContains:'不包含',gt:'大于',lte:'不大于',lt:'小于',gte:'不小于',between:'区间',empty:'为空',notEmpty:'非空'};
const comparisons=['eq','ne','contains','notContains','gt','lte','lt','gte'];
const ordered=['eq','ne','gt','lte','lt','gte','between','empty','notEmpty'];
const operators={text:[...comparisons,'empty','notEmpty'],date:ordered,number:ordered,boolean:['eq','ne','empty','notEmpty'],enum:['eq','ne','empty','notEmpty']};
function dateValid(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function typed(v,f){if(v===null||v===undefined||v==='')return null;if(f.type==='number'){if(typeof v==='boolean'||!Number.isFinite(Number(v)))return null;return Number(v);}if(f.type==='date'){const s=String(v);return dateValid(s)?s:/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)&&dateValid(s.slice(0,10))?s.slice(0,10):null;}if(f.type==='boolean'){if([true,'true','是'].includes(v))return true;if([false,'false','否'].includes(v))return false;return null;}return String(v);}
function validateRule(r,f,D=defaultDictionary()){if(!f||!operators[f.type]?.includes(r.op))throw Error('字段或操作符无效');if(['empty','notEmpty'].includes(r.op))return;
const vs=r.op==='between'?r.values:[r.value];if(!Array.isArray(vs)||vs.length!==(r.op==='between'?2:1)||vs.some(v=>v===null||v===undefined||String(v).trim()===''||String(v).length>200||typed(v,f)===null||(f.type==='date'&&!dateValid(String(v)))))throw Error(f.label+'：请填写有效的'+f.type+'条件');
if(f.type==='enum'&&vs.some(v=>!D.choices(f).includes(v)))throw Error(f.label+'：请选择字典选项');
if(f.sensitive&&vs.some(v=>String(v).replace(/[^\d]/g,'').length>=11))throw Error(f.label+'：仅允许虚构DEMO标识，不保存真实个人号码');
if(r.op==='between'&&typed(vs[0],f)>typed(vs[1],f))throw Error(f.label+'：区间下限不能大于上限');}
function validatePlan(p){
if(!p||p.version!==1)throw Error('查询方案类型或版本无效');const D=V2QueryDictionaries.get(p.domain,p.objectType,p.subtype);
if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80)throw Error('请输入1～80字查询条件名称');
if(!Array.isArray(p.conditionFieldIds)||new Set(p.conditionFieldIds).size!==p.conditionFieldIds.length||p.conditionFieldIds.some(id=>!D.fieldMap[id]))throw Error('查询字段无效');
if(!Array.isArray(p.resultColumns)||!p.resultColumns.length||p.resultColumns.length>D.fields.length)throw Error('至少选择一个结果字段');
if(new Set(p.resultColumns.map(c=>c.fieldId)).size!==p.resultColumns.length)throw Error('结果字段不能重复');
for(const c of p.resultColumns)if(!D.fieldMap[c.fieldId]||!/^#[0-9a-f]{6}$/i.test(c.color)||typeof c.frozen!=='boolean')throw Error('结果字段、颜色或冻结配置无效');
let count=0;function visit(n,depth){if(!n||depth>4||++count>60)throw Error('条件组最多4层、60个节点');if(n.join!==undefined&&!['and','or'].includes(n.join))throw Error('条件逻辑关系无效');if(n.kind==='group'){if(!['and','or'].includes(n.logic)||!Array.isArray(n.children))throw Error('条件组无效');if(depth>0&&!n.children.length)throw Error('请删除空条件分组');n.children.forEach(c=>visit(c,depth+1));}else if(n.kind==='rule'){if(!p.conditionFieldIds.includes(n.fieldId))throw Error('条件引用了未勾选字段');validateRule(n,D.fieldMap[n.fieldId],D);}else throw Error('条件节点无效');}visit(p.expression,0);return p;}
function compare(actual,rule,field){const a=typed(actual,field);if(rule.op==='empty')return a===null;if(rule.op==='notEmpty')return a!==null;if(a===null)return false;const b=typed(rule.value,field);switch(rule.op){case'eq':return a===b;case'ne':return a!==b;case'contains':return String(a).toLocaleLowerCase().includes(String(b).toLocaleLowerCase());case'notContains':return !String(a).toLocaleLowerCase().includes(String(b).toLocaleLowerCase());case'gt':return a>b;case'gte':return a>=b;case'lt':return a<b;case'lte':return a<=b;case'between':return a>=typed(rule.values[0],field)&&a<=typed(rule.values[1],field);default:return false;}}
function evaluate(n,p,q,D=defaultDictionary()){
 if(n.kind==='group'){
  const [first,...rest]=n.children;
  if(!first)return true;
  // Each connector combines its row with the result of the preceding rows.
  return rest.reduce((matched,child)=>(child.join??n.logic)==='and'?
   matched&&evaluate(child,p,q,D):matched||evaluate(child,p,q,D),evaluate(first,p,q,D));
 }
 const f=D.fieldMap[n.fieldId];return compare(D.value(p,q,f),n,f);
}
function execute(plan){validatePlan(plan);const D=V2QueryDictionaries.get(plan.domain,plan.objectType,plan.subtype),expanded=D.expandResults&&plan.resultColumns.some(c=>D.fieldMap[c.fieldId].scope==='qualification'),out=[];
for(const p of D.rows(plan.objectType)){const qs=D.records(p),candidates=qs.length?qs:[null],matches=candidates.filter(q=>evaluate(plan.expression,p,q,D));if(!matches.length)continue;
for(const q of expanded?matches:[matches[0]]){const result={id:p.id+(expanded?'::'+(q?.id??'no-qualification'):''),entityId:p.id,personId:plan.domain==='person'?p.id:undefined,qualificationId:plan.domain==='person'?q?.id??null:undefined};for(const c of plan.resultColumns){const f=D.fieldMap[c.fieldId];if(D.aggregateRecords&&f.scope!=='asset'){const values=[...new Set(matches.map(m=>D.value(p,m,f)).filter(v=>v!==null&&v!==undefined&&v!==''))];result[c.fieldId]=values.length===1?values[0]:values.length?values.join('；'):null;}else result[c.fieldId]=D.value(p,q,f);}out.push(result);}}
return out;}
return {labels,comparisons,operators,dateValid,typed,validateRule,validatePlan,compare,evaluate,execute};
})();

