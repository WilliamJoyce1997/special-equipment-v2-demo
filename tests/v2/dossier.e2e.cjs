/* Only this iteration: nine dossier entrances, read-only tabs and essential list regression. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const expectedHeaders=JSON.parse(fs.readFileSync('tests/v2/expected-headers.json','utf8').replace(/^\uFEFF/,''));
const changes=['序号','操作','变更方式','变更原因','变更日期','申请单位名称','受理机构','受理机构地区代码','回退原因','车辆Ukey'];
const history=['序号','操作','检验类别','检验结论','检验日期','下检日期','检验机构','检验部门','检验性质','报告编号','业务流水号','来源','添加人','添加时间'];
const kinds=['内部检验','外部检验','水质检验','安装监检','驻厂监检','进口监检'];
const children=['设备主题信息','设备相关信息','参数信息','设备检验信息','隐患治理记录','设备附件','全部'];
const codes={boiler:'GL',vessel:'RQ',elevator:'DT',crane:'QZ',vehicle:'CC',amusement:'YL',ropeway:'SD',installation:'ZZ',pipeline:'GX'};
const out='docs/special-equipment-v2/dossier';
fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:1000},acceptDownloads:true}),checks=[],errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r));
const ok=s=>{checks.push(s);console.log('PASS '+s);};
const query=()=>page.locator('#query-form button[type=submit]').click(),closeModal=()=>page.locator('#dialog-close').click();
const listCount=async x=>assert.equal(await page.locator('.table-panel .count-total').innerText(),String(x));
async function assertNoOverflow(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
const tableHeaders=title=>page.getByRole('table',{name:title,exact:true}).locator('thead th:not(.check)').allTextContents();
try{
for(const [type,prefix] of Object.entries(codes)){
 await page.setViewportSize({width:1366,height:1000});
 await page.goto('http://127.0.0.1:8020/static/v2.html?dossier='+type+'#'+type);await page.locator('table').waitFor();await listCount(0);
 await page.locator('#f-search').fill('DEMO-'+prefix+'-003');await query();await listCount(1);
 const row=page.locator('tbody tr[data-id]').first();assert.deepEqual(await row.locator('.row-action').allTextContents(),['精简档案','详情','更多>>']);ok(type+' row actions and selected-row query');
 await row.getByRole('button',{name:'精简档案',exact:true}).click();assert.equal(await page.locator('#dialog-title').innerText(),'精简档案');
 assert.equal(await page.locator('#dialog-body').getByLabel('设备代码',{exact:true}).inputValue(),'DEMO-'+prefix+'-003');
 assert(await page.locator('#dialog-body .dossier-group').count()>=3);
 assert.equal(await page.locator('#dialog-body input:not([readonly])').count(),0);
 assert.equal(await page.locator('#dialog-body select:not([disabled])').count(),0);
 await page.locator('#dialog-body summary').first().click();assert.equal(await page.locator('#dialog-body details').first().getAttribute('open'),null);await page.locator('#dialog-body summary').first().click();
 assert(await page.locator('#dialog-body').evaluate(e=>e.scrollHeight>e.clientHeight));await page.locator('#dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
 await closeModal();await listCount(1);ok(type+' brief mapped row / read-only / collapse / scroll / close');
 await row.getByRole('button',{name:'更多>>',exact:true}).click();assert(await page.locator('#record-more-menu').evaluate(e=>e.matches(':popover-open')));
 assert.equal(await page.locator('#record-more-menu button:enabled').count(),3);assert.deepEqual(await page.locator('#record-more-menu button').allTextContents(),['智慧监管码','检验信息','修改记录']);
 await page.keyboard.press('Escape');await listCount(1);ok(type+' More menu enabled (new dialog actions verified separately)');
 await row.getByRole('button',{name:'详情',exact:true}).click();const title=await page.evaluate(type=>V2.types[type].title+'设备信息',type);
 assert.equal(await page.locator('#tabs .tab-select').filter({hasText:title}).count(),1);
 assert.equal(await page.locator('.equipment-info').getAttribute('data-record'),type+'-3');
 assert.equal(await page.locator('.equipment-subtab.active').innerText(),'设备主题信息');
 assert.equal(await page.locator('.equipment-info-content').getByLabel('设备代码',{exact:true}).inputValue(),'DEMO-'+prefix+'-003');
 assert.deepEqual(await page.locator('.equipment-subtab').allTextContents(),children);assert(await page.getByRole('switch').isDisabled());ok(type+' detail new main tab / correct row / default theme');
 assert.deepEqual(await tableHeaders('更变信息查询表'),changes);
 for(const title of children){await page.locator('.equipment-subtabs').getByRole('tab',{name:title,exact:true}).click();assert.equal(await page.locator('.equipment-subtab.active').innerText(),title);
 if(title==='设备检验信息'){
 assert.deepEqual(await tableHeaders('已完成检验信息'),history);
 const records=await page.evaluate(type=>V2Dossier.histories(type,V2.fixtures[type].find(r=>r.id===type+'-3')),type);
 const options=await page.getByLabel('历史检验类别',{exact:true}).locator('option').allTextContents();for(const v of type==='boiler'?kinds:[...new Set(records.map(r=>r['检验类别']))])assert(options.includes(v),v);
 if(records.length){const selected=records[0]['检验类别'];await page.getByLabel('历史检验类别',{exact:true}).selectOption(selected);await page.locator('[data-table="completed"] form button[type=submit]').click();assert.equal(await page.locator('[data-table="completed"] .count-total').innerText(),String(records.filter(r=>r['检验类别']===selected).length));}
 else assert.equal(await page.locator('[data-table="completed"] .count-total').innerText(),'0');
 }
 if(title==='隐患治理记录'||title==='设备附件'){const card=page.locator('.dossier-table-card');assert.equal(await card.locator('th.fixed.check').count(),1);assert.equal(await card.locator('.pagination').count(),1);assert.equal(await card.locator('.count-total').innerText(),'0');}
 if(title==='全部'){assert.equal(await page.locator('.dossier-part').count(),6);assert.equal(await page.locator('.dossier-table-card').count(),6);
 assert.deepEqual(await tableHeaders('更变信息查询表'),changes);assert.deepEqual(await tableHeaders('已完成检验信息'),history);
 assert(await page.locator('.equipment-info-content').evaluate(e=>e.scrollHeight>e.clientHeight));}
 }
 ok(type+' seven child tabs / complete tables / applicable inspection options / combined page');
 assert.equal(await page.locator('.equipment-info-content input.dossier-input:not([readonly])').count(),0);
 for(const width of [1920,768,390]){
 await page.setViewportSize({width,height:900});await assertNoOverflow();
 await page.locator('.equipment-subtabs').getByRole('tab',{name:'设备主题信息',exact:true}).click();assert.equal(await page.locator('.equipment-info-content').getByLabel('设备代码',{exact:true}).inputValue(),'DEMO-'+prefix+'-003');
 await page.locator('.equipment-subtabs').getByRole('tab',{name:'全部',exact:true}).click();await assertNoOverflow();
 }
 ok(type+' 1920 / 768 / 390 detail layout and child navigation');
 await page.locator('#tabs .tab-select').filter({hasText:await page.evaluate(type=>V2.types[type].title,type)}).first().click();await listCount(1);
 // At narrow width, validate the modal too.
 await row.getByRole('button',{name:'精简档案',exact:true}).click();await assertNoOverflow();assert(await page.locator('#dialog-body').evaluate(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight));await closeModal();await listCount(1);
 await page.setViewportSize({width:1366,height:1000});
 await row.getByRole('button',{name:'详情',exact:true}).click();assert.equal(await page.locator('#tabs .tab-select').filter({hasText:title}).count(),1);ok(type+' same-record tab reused and list filters retained');
 await page.getByRole('button',{name:'关闭'+title+' DEMO-'+prefix+'-003标签',exact:true}).click();await listCount(1);
 await page.getByRole('button',{name:'⟳  重置',exact:true}).click();await listCount(0);await query();await listCount(8);
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr[data-id]').first().getAttribute('data-id'),type+'-1');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr[data-id]').first().getAttribute('data-id'),type+'-8');
 await page.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await page.locator('tbody tr[data-id]').count(),3);
 if(type==='elevator')await page.locator('.table-toolbar').getByRole('button',{name:'更多 >>',exact:true}).click();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:type==='elevator'?'导出演示数据 CSV':'导出',exact:true}).click();const d=await download;const stream=await d.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const csv=Buffer.concat(chunks).toString('utf8');
 const header=csv.replace(/^\uFEFF/,'').split(/\r?\n/)[0].split(',').map(s=>s.replace(/^"|"$/g,''));assert.deepEqual(header,expectedHeaders[type]);assert.equal(csv.trim().split(/\r?\n/).length,9);
 ok(type+' list reset/query/sort/pagination/full CSV regression');
}
assert.equal(errors.length,0,errors.join('\n'));assert(requests.every(r=>r.method()==='GET'&&r.url().startsWith('http://127.0.0.1:8020/')));ok('no console errors / external requests / write requests');
fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,checks,errors,referenceImagesCopied:false,children,changeHeaders:changes,historyHeaders:history,inspectionKinds:kinds},null,2));console.log('ALL '+checks.length+' CHECKS PASSED');
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

