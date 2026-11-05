const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const out='docs/special-equipment-v2/inspection-record-dialogs';fs.mkdirSync(out+'/screenshots',{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),checks=[],skipped=[],errors=[],writes=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url())});
const ok=s=>{checks.push(s);console.log('PASS '+s)},child=()=>page.locator('dialog.inspection-record-dialog[open]');
const expected=['检验机构','检验部门','检验员','检验性质','检验报告编号','检验类别','报告审核人','报告审核日期','报告审批人','报告审批日期','设备检验结论','检验日期','下次检验日期'];
const hist=()=>page.locator('.inspection-history-view:visible');
async function state(){return hist().evaluate(e=>({text:e.innerText,select:[...e.querySelectorAll('select')].map(s=>s.value),checks:[...e.querySelectorAll('input[type=checkbox]')].map(s=>s.checked),scroll:[...e.querySelectorAll('.table-scroll')].map(s=>s.scrollLeft)}))}
async function openChild(action){await hist().locator('[data-table=completed] tbody tr').first().getByRole('button',{name:action,exact:true}).click();await child().waitFor({state:'visible',timeout:2500})}
async function closeChild(mode){if(mode==='escape')await page.keyboard.press('Escape');else await child().getByRole('button',{name:mode,exact:true}).click();await child().waitFor({state:'detached'});assert.equal(await page.locator('.inspection-record-dialog').count(),0)}
try{
for(const type of ['boiler','vessel','elevator','crane','vehicle','amusement','ropeway','installation','pipeline']){
const snapshots=[];
for(const entrance of ['A','B']){
await page.goto('http://127.0.0.1:8020/#'+type);await page.locator('#query-form button[type=submit]').click();
const row=page.locator('tbody tr[data-id]').first(),id=await row.getAttribute('data-id');
if(entrance==='A'){await row.getByRole('button',{name:'详情',exact:true}).click();await page.locator('.equipment-subtabs').getByRole('tab',{name:'设备检验信息',exact:true}).click()}
else{await row.getByRole('button',{name:'更多>>',exact:true}).click();await page.getByRole('menuitem',{name:'检验信息',exact:true}).click()}
const card=hist().locator('[data-table=completed]'),count=Number(await card.locator('.count-total').innerText());
if(!count){skipped.push(type+' '+entrance+' no existing inspection records; no fabricated row');continue}
const record=await page.evaluate(({type,id})=>V2Dossier.histories(type,V2.fixtures[type].find(r=>r.id===id))[0],{type,id});
await card.locator('.latest-label input').check();await card.locator('form button[type=submit]').click();await card.getByLabel('已完成检验信息每页条数',{exact:true}).selectOption('1');await card.getByLabel('已完成检验信息选择第1条',{exact:true}).check();
const selectedKind=await card.locator('tbody tr td').nth(3).innerText();const actual=await page.evaluate(({type,id,kind})=>V2Dossier.histories(type,V2.fixtures[type].find(r=>r.id===id)).find(r=>r['检验类别']===kind),{type,id,kind:selectedKind});
const before=await state();
await openChild('详情');assert.equal(await child().getByRole('heading').innerText(),'详情检验信息');
assert.equal(await child().getAttribute('data-device-id'),id);assert.equal(await child().getAttribute('data-record-id'),actual.id);
assert.deepEqual(await child().locator('.inspection-read-field>label').allTextContents(),expected.map(x=>['检验机构','检验性质','检验报告编号','检验类别','报告审批人','设备检验结论','检验日期'].includes(x)?'*'+x:x));
for(const [label,key] of [['检验机构','检验机构'],['检验类别','检验类别'],['设备检验结论','检验结论'],['检验日期','检验日期'],['下次检验日期','下检日期'],['检验报告编号','报告编号']])assert.equal(await child().getByLabel(label,{exact:true}).inputValue(),actual[key]||'');
assert.equal(await child().locator('.inspection-problems input').count(),11);assert.equal(await child().locator('.inspection-problems input:checked').count(),0);assert.equal(await child().locator('.inspection-problems input:enabled').count(),0);
snapshots.push(await child().locator('.inspection-read-field').evaluateAll(es=>es.map(e=>e.querySelector('input,select').value)));
if(type==='boiler'&&entrance==='B'){for(const width of [1366,1920,390]){await page.setViewportSize({width,height:900});assert(await child().evaluate(d=>d.scrollHeight<=d.clientHeight+1&&d.getBoundingClientRect().right<=innerWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/screenshots/detail-'+width+'.png'})}await page.setViewportSize({width:1366,height:900})}
await closeChild('取消');assert.deepEqual(await state(),before);assert.equal(await page.locator('#dialog[open]').count(),entrance==='B'?1:0);ok(type+' '+entrance+' detail fields/context/read-only problems and cancel preserves parent');
await openChild('报告附件');assert.equal(await child().getByRole('heading').first().innerText(),'附件管理');assert.equal(await child().getAttribute('data-record-id'),actual.id);
assert.deepEqual(await child().locator('thead th:not(.check)').allTextContents(),['序号','操作','附件类别','附件种类','标题','文件名','上传账号','上传时间']);
assert.equal(await child().locator('.attachment-classification select').count(),3);assert.equal(await child().locator('.count-total').innerText(),'0');assert.equal(await child().locator('.count-selected').innerText(),'0');
await child().getByLabel('文件名',{exact:true}).fill('DEMO-report');await child().getByLabel('上传时间开始',{exact:true}).fill('2026-05-01');await child().getByLabel('上传时间结束',{exact:true}).fill('2026-01-01');await child().getByRole('button',{name:'查询',exact:true}).click();assert.match(await child().getByRole('alert').innerText(),/开始日期不能晚于结束日期/);
await child().getByRole('button',{name:'重置',exact:true}).click();assert.equal(await child().getByLabel('文件名',{exact:true}).inputValue(),'');assert.equal(await child().getByLabel('上传时间开始',{exact:true}).inputValue(),'');
await child().getByRole('button',{name:'查询',exact:true}).click();assert.equal(await child().locator('.count-total').innerText(),'0');assert.match(await child().innerText(),/暂无数据/);
if(type==='boiler'&&entrance==='B'){for(const width of [1366,1920,390]){await page.setViewportSize({width,height:900});await child().locator('.table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);assert(await child().locator('.table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth||e.scrollLeft>0));assert(await child().evaluate(d=>d.scrollHeight<=d.clientHeight+1));await page.screenshot({path:out+'/screenshots/attachments-'+width+'.png'})}await page.setViewportSize({width:1366,height:900})}
await closeChild('escape');assert.deepEqual(await state(),before);assert.equal(await page.locator('#dialog[open]').count(),entrance==='B'?1:0);assert.equal(await page.evaluate(()=>document.body.style.overflow==='hidden'),entrance==='B');ok(type+' '+entrance+' attachment headers/filter validation/reset/empty and Escape only closes child');
for(const action of ['详情','报告附件']){await openChild(action);await closeChild('关闭子弹窗')}assert.deepEqual(await state(),before);ok(type+' '+entrance+' repeat open/close without stale nodes or parent state loss');
for(const action of ['报告','意见书']){await card.locator('tbody tr').first().getByRole('button',{name:action,exact:true}).click();assert.match(await hist().innerText(),/演示数据暂无对应文件/);await hist().getByRole('button',{name:'‹ 返回历史检验信息',exact:true}).click()}assert.deepEqual(await state(),before);
if(entrance==='B')await page.locator('#dialog-close').click();
}
if(snapshots.length===2)assert.deepEqual(snapshots[0],snapshots[1]);ok(type+' both entry data identical (or unchanged empty source)');
}
const filtering=await page.evaluate(()=>{const context={type:'boiler',deviceId:'demo-device',recordId:'demo-record'},base={deviceType:'boiler',deviceId:'demo-device',recordId:'demo-record','文件名':'DEMO-Report.pdf','上传时间':'2026-05-12 09:00:00'};const rows=[{...base,id:'correct'},{...base,id:'other-record',recordId:'other'},{...base,id:'other-device',deviceId:'other'}];return [V2InspectionRecordDialogs.filterAttachments(rows,context,{filename:'report',from:'2026-05-01',to:'2026-05-31'}).map(r=>r.id),V2InspectionRecordDialogs.filterAttachments(rows,context,{filename:'absent'}).length,V2InspectionRecordDialogs.filterAttachments(rows,context,{from:'2026-06-01'}).length]});assert.deepEqual(filtering,[['correct'],0,0]);ok('attachment filename/date matching and device+record isolation (in-memory test input only)');
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);ok('no console errors or write requests');
fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:skipped.length,checks,skippedReasons:skipped,errors},null,2));console.log('ALL '+checks.length+' PASSED; '+skipped.length+' SKIPPED');
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

