const path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
const query=()=>p.locator('#query-form button[type=submit]').click(),total=()=>p.locator('#main .count-total').first().innerText();
await p.goto('http://127.0.0.1:8020/#personnel');await query();assert.equal(await total(),'4');
assert.deepEqual(await p.getByLabel('持证状态',{exact:true}).locator('option').allTextContents(),['请选择','已持证','待发证','已吊销','已注销','变更中','换证中','补证中','无效']);
await p.getByLabel('所在地区省级').selectOption('53');await p.getByLabel('所在地区市区县').selectOption('5301');await p.getByLabel('持证状态',{exact:true}).selectOption('已持证');await p.getByLabel('数据来源',{exact:true}).selectOption('第三方机构上传');await query();assert.equal(await total(),'1');
await p.getByRole('button',{name:/重置/}).first().click();await p.getByRole('button',{name:'⌕高级查询',exact:true}).click();
assert.deepEqual(await p.locator('.boiler-advanced .field>label').allTextContents(),['手机号码','批准日期','证书编号','批准项目','有效日期','持证级别','无损检测方法']);
for(const name of ['批准项目','持证级别','无损检测方法'])assert.deepEqual(await p.getByLabel(name,{exact:true}).locator('option').allTextContents(),['请选择']);
await p.getByLabel('手机号码',{exact:true}).fill('DEMO-MOBILE-001');await query();assert.equal(await total(),'1');await p.getByLabel('批准日期下限').fill('2027-01-01');await p.getByLabel('批准日期上限').fill('2026-01-01');await query();assert.match(await p.locator('#form-error').innerText(),/下限/);await p.getByRole('button',{name:/重置/}).first().click();assert.equal(await total(),'0');
console.log('PASS personnel region, exact enums, inline advanced order, placeholder-only fields, combined query/date/reset');
const keys=await p.evaluate(()=>Object.keys(V2.types).filter(k=>V2.types[k].implemented));console.log('MAIN TABLES',keys);
for(const key of keys){
 await p.goto('http://127.0.0.1:8020/#'+key);if(!await p.locator('#query-form').count())continue;await query();
 const table=()=>p.locator('#main .table-panel table[data-table-config]');const original=await table().locator('thead th[data-field]').evaluateAll(es=>es.map(e=>({key:e.dataset.field,label:e.querySelector('button span')?.textContent||e.querySelector('button')?.textContent.replace(/ ↕$/,'')||e.textContent})));
 assert(original.length>1,key);const open=()=>p.locator('.table-panel .table-toolbar').getByRole('button',{name:/^设\s*置$/}).click();
 await open();assert.equal(await p.locator('#dialog-title').innerText(),'表格自定义展示字段');const d=()=>p.locator('#dialog');const row=k=>d().locator('tbody tr[data-field="'+k+'"]');
 assert.deepEqual(await d().locator('tbody .boiler-setting-name').evaluateAll(es=>es.map(e=>e.childNodes[0].textContent)),original.map(c=>c.label),key+' own fields');
 assert(await row(original[0].key).getByRole('button',{name:original[0].label+'上移',exact:true}).isDisabled());
 await row(original[0].key).getByRole('button',{name:original[0].label+'下移',exact:true}).click();
 await row(original[0].key).getByRole('button',{name:original[0].label+'上移',exact:true}).click();
 await row(original[1].key).dragTo(row(original[0].key));assert.equal(await d().locator('tbody tr').first().getAttribute('data-field'),original[1].key);
 await d().getByLabel('选择全部字段',{exact:true}).uncheck();assert.equal(await d().locator('tbody input[type=checkbox]:checked').count(),0);await d().getByLabel('选择全部字段',{exact:true}).check();
 await row(original.at(-1).key).locator('input[type=checkbox]').first().uncheck();
 await row(original[1].key).locator('input[type=color]').fill('#ff0000');await row(original[0].key).getByLabel('冻结 '+original[0].label,{exact:true}).check();
 await d().getByRole('button',{name:'保存',exact:true}).click();
 const expected=[original[1],original[0],...original.slice(2,-1)].map(c=>c.key);assert.deepEqual(await table().locator('thead th[data-field]').evaluateAll(es=>es.map(e=>e.dataset.field)),expected,key+' reorder/hide');
 const dataRow=table().locator('tbody tr[data-id]').first();if(await dataRow.count()){
 assert.equal(await dataRow.locator('td[data-field="'+original[1].key+'"]').evaluate(e=>getComputedStyle(e).color),'rgb(255, 0, 0)');
 const mapping=await p.evaluate(({key,field})=>String(V2.fixtures[key][0][field]??'—'),{key,field:original[1].key});assert.equal(await dataRow.locator('td[data-field="'+original[1].key+'"]').innerText(),mapping,key+' data mapping');
 }
 await p.waitForTimeout(70);await table().locator('..').evaluate(e=>e.scrollLeft=500);
 const bounds=await table().locator('thead th[data-freeze=true]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,left:parseFloat(e.style.left)})));
 for(let i=1;i<bounds.length;i++)assert(Math.abs(bounds[i].x-bounds[i-1].right)<2,key+' frozen overlap '+JSON.stringify(bounds));
 await p.reload();await query();assert.deepEqual(await table().locator('thead th[data-field]').evaluateAll(es=>es.map(e=>e.dataset.field)),expected,key+' persisted');
 await open();await d().getByRole('button',{name:'还原初始配置',exact:true}).click();await p.locator('#dialog-close').click();assert.deepEqual(await table().locator('thead th[data-field]').evaluateAll(es=>es.map(e=>e.dataset.field)),expected,key+' cancel');
 await open();await d().getByRole('button',{name:'还原初始配置',exact:true}).click();await d().getByRole('button',{name:'保存',exact:true}).click();assert.deepEqual(await table().locator('thead th[data-field]').evaluateAll(es=>es.map(e=>e.dataset.field)),original.map(c=>c.key));
 console.log('PASS '+key+' own fields, arrows/drag, select-all/hide, color, freeze geometry, save/reload/cancel/restore');
}
assert.deepEqual(errors,[]);console.log('PASS no browser errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
