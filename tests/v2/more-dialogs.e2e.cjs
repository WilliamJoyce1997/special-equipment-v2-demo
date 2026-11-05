/* Targeted More-dialog coverage. Decoder is independent, test-only jsQR. */
const path=require('path'),fs=require('fs'),assert=require('node:assert/strict'),jsQR=require('./vendor/jsQR.js');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const out='docs/special-equipment-v2/more-dialogs',codes={boiler:'GL',vessel:'RQ',elevator:'DT',crane:'QZ',vehicle:'CC',amusement:'YL',ropeway:'SD',installation:'ZZ',pipeline:'GX'};
fs.mkdirSync(out+'/screenshots',{recursive:true});
const histHeaders=['序号','操作','检验类别','检验结论','检验日期','下检日期','检验机构','检验部门','检验性质','报告编号','业务流水号','来源','添加人','添加时间'];
const delayHeaders=['序号','操作','未检原因','检验类别名称','下次检验日期','延期检验至','申请人','申请日期','备注'];
const auditHeaders=['序号','操作','修改人姓名','所在部门','字段名称','修改类型','字段代码','修改前值','修改后值','修改日期','账号'];
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:1000},acceptDownloads:true}),checks=[],errors=[],writes=[],external=[],decoded=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());if(!r.url().startsWith('http://127.0.0.1:8020/'))external.push(r.url());});
const ok=s=>{checks.push(s);console.log('PASS '+s);},query=()=>page.locator('#query-form button[type=submit]').click(),modal=page.locator('#dialog');
async function close(){await page.locator('#dialog-close').click();assert.equal(await page.locator('dialog[open]').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');assert.equal(await page.locator('#dialog-body .more-dialog-view canvas').count(),0);}
async function more(name){await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'更多>>',exact:true}).click();assert(await page.locator('#record-more-menu').evaluate(e=>e.matches(':popover-open')));await page.getByRole('menuitem',{name,exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),1);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');}
async function listState(){return page.locator('#main').evaluate(e=>({values:[...e.querySelectorAll('#query-form input,#query-form select')].map(x=>[x.name,x.value]),rows:[...e.querySelectorAll('tbody tr[data-id]')].map(x=>x.dataset.id),checks:[...e.querySelectorAll('tbody input:checked')].map(x=>x.getAttribute('aria-label')),sort:[...e.querySelectorAll('th[aria-sort]')].map(x=>x.getAttribute('aria-sort')),page:e.querySelector('.pagination .current')?.textContent,total:e.querySelector('.count-total')?.textContent,selected:e.querySelector('.count-selected')?.textContent}));}
const headers=card=>card.locator('thead th:not(.check)').allTextContents();
async function dataRows(card){return card.locator('tbody tr').evaluateAll(es=>es.filter(e=>!e.querySelector('.empty')).map(e=>[...e.querySelectorAll('td')].slice(3).map(c=>c.textContent)));}
async function noOverflow(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
async function decode(){const pixels=await page.locator('.smart-qr').evaluate(c=>({width:c.width,height:c.height,data:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),payload:c.dataset.payload}));const result=jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);assert(result,'Independent decoder failed');assert.equal(result.data,pixels.payload);decoded.push(result.data);return JSON.parse(result.data);}
const snap=name=>page.screenshot({path:out+'/screenshots/'+name+'.png',fullPage:true,style:'#announcement{visibility:hidden}'});
try{
for(const [type,prefix] of Object.entries(codes)){
 await page.setViewportSize({width:1366,height:1000});await page.goto('http://127.0.0.1:8020/static/v2.html?more='+type+'#'+type);await query();
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();await page.getByRole('button',{name:'下一页',exact:true}).click();const rowId=await page.locator('tbody tr[data-id]').first().getAttribute('data-id');
 await page.locator('tbody tr[data-id]').first().locator('input[type=checkbox]').check();const before=await listState();
 await more('智慧监管码');assert.equal(await page.locator('#dialog-title').innerText(),'智慧监管码');assert.equal(await page.locator('.more-dialog-view').getAttribute('data-record'),rowId);
 const record=await page.evaluate(({type,rowId})=>V2.fixtures[type].find(r=>r.id===rowId),{type,rowId});for(const key of ['regulatoryCode','unit','category','equipmentCode','registrationCode'])assert.equal(await page.locator('[data-field="'+key+'"] dd').innerText(),record[key]);
 assert.equal(await page.locator('[data-field="productNumber"] dd').innerText(),record.productNumber??'—');assert.equal(await page.locator('[data-field="unitAddress"] dd').innerText(),record.unitAddress??'—');
 const payload=await decode();assert.equal(payload.id,rowId);assert.equal(payload.type,type);assert.equal(payload.equipmentCode,record.equipmentCode);assert.equal(payload.demo,true);assert(!JSON.stringify(payload).includes('http'));ok(type+' unique real QR decoded by jsQR, exact per-device fields');
 if(type==='boiler')await snap('01-smart-regulatory-code');
 await close();assert.deepEqual(await listState(),before);ok(type+' QR close restores page/sort/query/selection');
 await more('检验信息');assert.equal(await page.locator('#dialog-title').innerText(),'历史检验信息');
 const completed=modal.locator('[data-table="completed"]');assert.deepEqual(await headers(completed),histHeaders);assert.deepEqual(await headers(modal.locator('[data-table="delay"]')),delayHeaders);
 assert.equal(await modal.locator('.dossier-table-card').count(),3);assert.equal(await modal.getByRole('button',{name:'⊕ 新增',exact:true}).isDisabled(),true);assert(await modal.getByRole('button',{name:'登记',exact:true}).isDisabled());
 const originalRows=await dataRows(completed);
 const options=await modal.getByLabel('历史检验类别',{exact:true}).locator('option').allTextContents();if(type==='boiler')for(const name of ['内部检验','外部检验','水质检验','安装监检','驻厂监检','进口监检'])assert(options.includes(name));else assert(!originalRows.some(r=>['内部检验','外部检验','水质检验'].includes(r[0])));
 if(type==='boiler'){
 await modal.getByLabel('历史检验类别',{exact:true}).selectOption('内部检验');await completed.locator('form button[type=submit]').click();assert.equal(await completed.locator('.count-total').innerText(),'1');
 await modal.getByLabel('历史检验类别',{exact:true}).selectOption('');await completed.locator('form button[type=submit]').click();
 await completed.locator('.latest-label input').check();await completed.locator('form button[type=submit]').click();assert.equal(await completed.locator('.count-total').innerText(),'2');
 await completed.locator('.latest-label input').uncheck();await completed.locator('form button[type=submit]').click();
 await completed.getByLabel('已完成检验信息每页条数',{exact:true}).selectOption('1');await completed.getByLabel('已完成检验信息选择第1条',{exact:true}).check();await completed.getByRole('button',{name:'已完成检验信息下一页',exact:true}).click();assert.equal(await completed.locator('.count-selected').innerText(),'1');await completed.getByLabel('已完成检验信息每页条数',{exact:true}).selectOption('10');
 }
 if(originalRows.length){
 for(const action of ['详情','报告附件']){await completed.locator('tbody tr').first().getByRole('button',{name:action,exact:true}).click();const child=page.locator('.inspection-record-dialog[open]');if(action==='详情')assert.equal(await child.locator('.inspection-read-field').count(),13);else assert.match(await child.innerText(),/暂无数据/);await child.getByRole('button',{name:'关闭子弹窗',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),1);}
 for(const action of ['报告','意见书']){await completed.locator('tbody tr').first().getByRole('button',{name:action,exact:true}).click();assert.match(await modal.innerText(),/演示数据暂无对应文件/);await modal.getByRole('button',{name:'‹ 返回历史检验信息',exact:true}).click();}
 }
 await completed.locator('.table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);const pos=await completed.locator('thead th.fixed').evaluateAll(es=>es.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));assert(Math.abs(pos[0].right-pos[1].left)<2);assert(Math.abs(pos[1].right-pos[2].left)<2);
 assert(await completed.locator('tbody .fixed.actions').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)));await completed.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);
 if(type==='boiler')await snap('02-inspection-history');
 for(const width of [1920,768,390]){await page.setViewportSize({width,height:1000});await noOverflow();assert(await modal.locator('.table-scroll').first().evaluate(e=>e.scrollWidth>e.clientWidth));}
 await page.setViewportSize({width:1366,height:1000});await close();assert.deepEqual(await listState(),before);
 await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'详情',exact:true}).click();await page.locator('.equipment-subtabs').getByRole('tab',{name:'设备检验信息',exact:true}).click();
 const detailRows=await dataRows(page.locator('.equipment-info [data-table="completed"]'));assert.deepEqual(detailRows,originalRows);
 const title=await page.evaluate(type=>V2.types[type].title+'设备信息',type);await page.getByRole('button',{name:'关闭'+title+' '+record.equipmentCode+'标签',exact:true}).click();assert.deepEqual(await listState(),before);ok(type+' three inspection regions / disabled mutations / detail dataset identical / table scroll');
 await more('修改记录');assert.equal(await page.locator('#dialog-title').innerText(),'历史修改记录');
 const audit=modal.locator('[data-table="audit"]');assert.deepEqual(await headers(audit),auditHeaders);const total=Number(await audit.locator('.count-total').innerText());assert.equal(total,(record.history||[]).length);
 if(type==='crane'){
 assert.equal(total,2);await modal.getByLabel('修改人姓名',{exact:true}).fill('演示资料员');await modal.locator('.audit-query button[type=submit]').click();assert.equal(await audit.locator('.count-total').innerText(),'1');
 await modal.getByRole('button',{name:'⟳ 重置',exact:true}).click();await modal.getByLabel('字段名称',{exact:true}).fill('设备名称');await modal.getByLabel('上传时间开始',{exact:true}).fill('2026-01-01');await modal.getByLabel('上传时间结束',{exact:true}).fill('2026-01-31');await modal.locator('.audit-query button[type=submit]').click();assert.equal(await audit.locator('.count-total').innerText(),'1');
 await modal.getByRole('button',{name:'⟳ 重置',exact:true}).click();await modal.getByLabel('上传时间开始',{exact:true}).fill('2026-03-01');await modal.getByLabel('上传时间结束',{exact:true}).fill('2026-01-01');await modal.locator('.audit-query button[type=submit]').click();assert.match(await modal.locator('.form-error').innerText(),/开始日期不能晚于结束日期/);
 await modal.getByRole('button',{name:'⟳ 重置',exact:true}).click();assert.equal(await audit.locator('.count-total').innerText(),'2');
 await audit.getByRole('button',{name:'按修改日期排序',exact:true}).click();const first=await audit.locator('tbody tr').first().innerText();await audit.getByRole('button',{name:'按修改日期排序',exact:true}).click();assert.notEqual(await audit.locator('tbody tr').first().innerText(),first);
 await audit.getByLabel('修改记录每页条数',{exact:true}).selectOption('1');await audit.getByRole('button',{name:'修改记录下一页',exact:true}).click();assert.equal(await audit.locator('tbody tr').count(),1);await audit.getByLabel('修改记录每页条数',{exact:true}).selectOption('10');await snap('03-modification-history');
 }
 await modal.getByLabel('字段名称',{exact:true}).fill('NO-SUCH-FIELD');await modal.locator('.audit-query button[type=submit]').click();assert.equal(await audit.locator('.count-total').innerText(),'0');
 await modal.getByRole('button',{name:'⟳ 重置',exact:true}).click();assert.equal(await audit.locator('.count-total').innerText(),String(total));
 for(const width of [1920,768,390]){await page.setViewportSize({width,height:1000});await noOverflow();}
 await page.setViewportSize({width:1366,height:1000});await close();assert.deepEqual(await listState(),before);ok(type+' audit context/filter/reset/empty/footer and narrow layouts');
 for(const name of ['智慧监管码','检验信息','修改记录']){await more(name);await close();}assert.deepEqual(await listState(),before);ok(type+' repeated open/close, one overlay, scroll lock released');
 await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'精简档案',exact:true}).click();assert.equal(await modal.getByLabel('设备代码',{exact:true}).inputValue(),record.equipmentCode);await close();assert.deepEqual(await listState(),before);
 ok(type+' accepted brief and list state unchanged');
}
assert.equal(new Set(decoded).size,9);ok('nine device QR payloads distinct');
const latest=await page.evaluate(()=>{const rows=[{id:'b',检验类别:'内部检验',检验日期:'2026-02-01'},{id:'c',检验类别:'外部检验',检验日期:'2026-04-01'},{id:'a',检验类别:'内部检验',检验日期:'2026-02-01'},{id:'z',检验类别:'内部检验',检验日期:'2025-01-01'}];const before=JSON.stringify(rows);return {ids:V2Dossier.latestHistories(rows).map(r=>r.id),unchanged:JSON.stringify(rows)===before};});assert.deepEqual(latest.ids,['c','a']);assert(latest.unchanged);ok('latest per category sorts dates and stable IDs without mutating records');
// Same category, different row; offline operation after scripts have loaded; explicit QR failure path.
await page.goto('http://127.0.0.1:8020/static/v2.html?offline=1#boiler');await query();await more('智慧监管码');const firstPayload=await decode();await close();await page.locator('#f-search').fill('DEMO-GL-002');await query();
await page.context().setOffline(true);await more('智慧监管码');const secondPayload=await decode();assert.notEqual(firstPayload.id,secondPayload.id);await close();ok('same-category QR changes by record and works offline');
await page.evaluate(()=>{window.__qrBackup=window.qrcode;window.qrcode=undefined;});await more('智慧监管码');assert.equal(await modal.locator('canvas').count(),0);assert.match(await modal.getByRole('alert').innerText(),/二维码生成失败/);await close();await page.evaluate(()=>{window.qrcode=window.__qrBackup;delete window.__qrBackup;});await page.context().setOffline(false);ok('encoder failure shows error, no fake QR');
assert.equal(errors.length,0,errors.join('\n'));assert.equal(writes.length,0);assert.equal(external.length,0);ok('no console errors, writes or external runtime calls');
fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:0,checks,errors,qrDecoder:'jsQR 1.4.0 reading rendered canvas RGBA',decodedPayloads:decoded},null,2));console.log('ALL '+checks.length+' CHECKS PASSED');
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

