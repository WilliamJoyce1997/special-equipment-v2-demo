const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const ok=s=>{checks.push(s);console.log('PASS '+s);},query=()=>page.locator('#query-form button[type=submit]').click();
async function open(name){await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'更多>>',exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
async function close(){await page.locator('#dialog-done').click();assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');}
try{
for(const width of [1920,768,390]){
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:8020/static/v2.html?qrwidth='+width+'#boiler');await query();await open('智慧监管码');
 const rect=await page.locator('.smart-qr').boundingBox();assert(rect.width>180&&rect.width<=400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await close();ok('QR '+width+' layout, footer close, scroll restored');
 await open('智慧监管码');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('dialog').open&&document.body.style.overflow!=='hidden');ok('Escape '+width+' cleanup');
}
await page.setViewportSize({width:1920,height:1400});await page.goto('http://127.0.0.1:8020/static/v2.html?combined=1#crane');await query();await open('修改记录');
const form=page.locator('#dialog .audit-query');await form.getByLabel('修改人姓名',{exact:true}).fill('演示核对员');await form.getByLabel('字段名称',{exact:true}).fill('档案校对');await form.getByLabel('上传时间开始',{exact:true}).fill('2026-02-01');await form.getByLabel('上传时间结束',{exact:true}).fill('2026-02-28');await form.locator('button[type=submit]').click();assert.equal(await page.locator('[data-table=audit] .count-total').innerText(),'1');ok('audit actor/field/date three-way combination');
await form.getByRole('button',{name:'⟳ 重置',exact:true}).click();assert.equal(await page.locator('[data-table=audit] .count-total').innerText(),'2');
await page.locator('#dialog').screenshot({path:'docs/special-equipment-v2/more-dialogs/screenshots/03-modification-history.png'});await close();
await page.goto('http://127.0.0.1:8020/static/v2.html?capture=1#boiler');await query();await open('检验信息');await page.locator('#dialog').screenshot({path:'docs/special-equipment-v2/more-dialogs/screenshots/02-inspection-history.png'});await close();
await open('智慧监管码');await page.locator('#dialog').screenshot({path:'docs/special-equipment-v2/more-dialogs/screenshots/01-smart-regulatory-code.png'});await close();ok('three actual modal screenshots captured; no reference files copied');
assert.equal(errors.length,0);ok('no blocking JS');
fs.writeFileSync('docs/special-equipment-v2/more-dialogs/edge-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:0,checks,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

