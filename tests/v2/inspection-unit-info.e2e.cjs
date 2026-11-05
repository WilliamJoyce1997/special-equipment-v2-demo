const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const out='docs/special-equipment-v2/inspection-unit-info';fs.mkdirSync(out+'/screenshots',{recursive:true});
const labels=['机构类别','有效日期','单位名称','社会统一信用代码','地区代码','单位地址','质检行业统一社会信用代码','法定代表人','邮政编码','单位电话','单位传真','电子信箱','单位网址','营业执照登记机构','营业执照注册号','事业单位法人登记管理机关','事业单位法人证书编号','单位成立日期','开始工作日期','注册资金（万元）','固定资产（万元）','检验（试验）设备价值（万元）','总人数','检验人员数','无损检测人员数','试验人员数','技术负责人','技术负责人职称','所属行业','经济类型','检验检测机构类型','隶属关系','单位性质','单位级别','状态','状态变更日期','备注','创建时间','创建人','最后修改时间','最后更新人'];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1366,height:900}}),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});const ok=s=>{checks.push(s);console.log('PASS '+s)};
try{await p.goto('http://127.0.0.1:8020/#inspection-unit');await p.locator('#query-form button[type=submit]').click();await p.getByLabel('每页条数',{exact:true}).selectOption('2');await p.getByRole('button',{name:'下一页',exact:true}).click();await p.locator('tbody tr[data-id]').first().locator('input').check();const before=await p.locator('#main').innerText();
for(const index of [0,1]){
const row=p.locator('tbody tr[data-id]').nth(index),id=await row.getAttribute('data-id'),record=await p.evaluate(id=>V2InspectionUnits.rows.find(r=>r.id===id),id);
await row.getByRole('button',{name:'编辑',exact:true}).click();assert.equal(await p.locator('#dialog-title').innerText(),'检验单位信息');
assert.equal(await p.locator('.organization-edit').getAttribute('data-unit-id'),id);
assert.deepEqual(await p.locator('.unit-info-field>label').evaluateAll(es=>es.map(e=>e.textContent.replace(/^\*/,''))),labels);
assert.equal(await p.locator('.unit-info-field .required-mark').count(),3);
for(const [label,key] of [['单位名称','name'],['社会统一信用代码','creditCode'],['地区代码','regionCode'],['单位地址','address'],['单位电话','phone'],['法定代表人','legalPerson'],['单位级别','level']])assert.equal(await p.locator('#dialog').getByLabel(label,{exact:true}).inputValue(),record[key]);
for(const label of ['状态','机构类别','有效日期','创建时间']){const field=p.locator('#dialog').getByLabel(label,{exact:true});if(await field.count())assert.equal(await field.inputValue(),'')}
assert.equal(await p.locator('#dialog input:not([readonly]),#dialog textarea:not([readonly]),#dialog select:enabled').count(),0);
assert.match(await p.locator('#dialog-body').innerText(),/演示模式，仅供查看/);
ok('record '+id+' 41 ordered fields / 3 required marks / exact data / missing blank / read-only');
if(index===0)for(const width of [1366,1920,768,390]){
await p.setViewportSize({width,height:900});const m=await p.locator('#dialog').evaluate(d=>{const body=d.querySelector('#dialog-body'),g=d.querySelector('.unit-info-grid');return {outer:d.scrollHeight-d.clientHeight,body:body.scrollHeight-body.clientHeight,cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,wide:document.documentElement.scrollWidth>innerWidth,footer:d.querySelector('.dialog-footer').getBoundingClientRect().bottom}});
assert.equal(await p.locator('#dialog .dialog-footer').evaluate(e=>getComputedStyle(e).textAlign),'center');assert(m.outer<=1);assert(m.body>0);assert(!m.wide);assert(m.footer<=900);assert.equal(m.cols,width>650?2:1);
await p.screenshot({path:out+'/screenshots/unit-info-'+width+'.png'});await p.locator('#dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal(await p.locator('#dialog').evaluate(e=>e.scrollTop),0);await p.locator('#dialog-body').evaluate(e=>e.scrollTop=0);
ok(width+' layout / single body scroll / accessible footer');
}
await p.setViewportSize({width:1366,height:900});if(index===0)await p.locator('#dialog-done').click();else await p.locator('#dialog-close').click();assert.deepEqual(await p.locator('#main').innerText(),before);assert.notEqual(await p.evaluate(()=>document.body.style.overflow),'hidden');ok('close preserves filters/page/selection');
}
assert.deepEqual(errors,[]);ok('no blocking console or JavaScript errors');fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:0,checks,errors},null,2));
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

