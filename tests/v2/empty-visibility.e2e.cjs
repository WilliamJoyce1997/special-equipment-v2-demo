const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='docs/special-equipment-v2/column-revision',keys=['boiler','vessel','elevator','crane','vehicle','amusement','ropeway','installation','pipeline'];
async function visible(){const r=await page.locator('.empty-message').evaluate(e=>({r:e.getBoundingClientRect().toJSON(),wrap:e.closest('.table-scroll').getBoundingClientRect().toJSON()}));assert(r.r.left>=r.wrap.left-1&&r.r.right<=r.wrap.right+1);}
try{
for(const key of keys)for(const width of [1920,1366,768,390]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8020/static/v2.html?empty='+key+width+'#'+key);await page.locator('table').waitFor();
 await visible();assert.equal(await page.locator('.count-total').innerText(),'0');
 if(key==='boiler'&&width===1920)await page.screenshot({path:out+'/screenshots/01-boiler-initial-empty.png',fullPage:true});
 await page.locator('#f-search').fill('NONEXISTENT');await page.locator('#query-form button[type=submit]').click();await visible();assert.match(await page.locator('.empty-message').innerText(),/暂无匹配记录/);
 await page.locator('.table-scroll').evaluate(e=>e.scrollLeft=500);await visible();checks.push(key+' '+width+' empty message visible before/after query and scroll');
}
for(const key of ['elevator','pipeline']){
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:8020/static/v2.html?panorama='+key+'#'+key);await page.locator('table').waitFor();await page.locator('#query-form button[type=submit]').click();
 const wide=await page.locator('table').evaluate(e=>Math.ceil(e.scrollWidth)+300);await page.setViewportSize({width:wide,height:1080});
 await page.locator('table').screenshot({path:out+'/screenshots/'+key+'-all-columns.png'});checks.push(key+' complete-table panorama captured with expanded browser viewport');
}
await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:8020/static/v2.html?footer=1#boiler');await page.locator('#query-form button[type=submit]').click();await page.getByLabel('选择 DEMO-GL-001',{exact:true}).check();await page.locator('.table-footer').screenshot({path:out+'/screenshots/07-table-footer-statistics.png'});
assert.equal(errors.length,0);checks.push('no fatal JS');
fs.writeFileSync(out+'/empty-visibility-results.json',JSON.stringify({passed:checks.length,failed:0,checks,errors},null,2));console.log('ALL '+checks.length+' empty-visibility / panorama checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

