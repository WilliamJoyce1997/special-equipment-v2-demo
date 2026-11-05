const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:900},acceptDownloads:true}),checks=[],errors=[];
 const ok=s=>{checks.push(s);console.log('PASS '+s);},close=()=>page.locator('#dialog-close').click();
 page.on('pageerror',e=>errors.push(e.message));
 try{
 for(const key of ['boiler','vessel','elevator']){
 await page.goto('http://127.0.0.1:8020/static/v2.html#'+key);await page.locator('table').waitFor();await page.locator('#query-form button[type=submit]').click();
 if(key==='elevator'){await page.getByRole('button',{name:'更多 >>',exact:true}).click();}
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:key==='elevator'?'导出演示数据 CSV':'导出',exact:true}).click();
 const file='docs/special-equipment-v2/batch2/'+key+'-regression.csv';await (await download).saveAs(file);
 const csv=fs.readFileSync(file,'utf8');assert(csv.includes('虚构演示样本'));assert(csv.includes('设备代码'));assert.equal(csv.trim().split(/\r?\n/).length,9);ok(key+' actual CSV regression');
 }
 await page.goto('http://127.0.0.1:8020/static/v2.html#installation');await page.locator('table').waitFor();await page.locator('#query-form button[type=submit]').click();
 await page.getByRole('button',{name:'管道汇总表',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/请勾选/);await close();ok('summary no-selection guidance');
 await page.getByLabel('选择 DEMO-ZZ-001',{exact:true}).check();await page.getByLabel('选择 DEMO-ZZ-002',{exact:true}).check();
 await page.getByRole('button',{name:'管道汇总表',exact:true}).click();assert.match(await page.locator('#dialog-title').innerText(),/选择条件不符/);await close();ok('summary cross-unit/category refused');
 await page.getByLabel('选择 DEMO-ZZ-002',{exact:true}).uncheck();await page.getByRole('button',{name:'管道汇总表',exact:true}).click();
 assert.match(await page.locator('#dialog-body').innerText(),/在用管线数量：0/);await close();ok('summary excludes stopped pipeline');
 await page.getByLabel('选择 DEMO-ZZ-001',{exact:true}).uncheck();await page.getByLabel('选择 DEMO-ZZ-002',{exact:true}).check();
 await page.getByRole('button',{name:'管道汇总表',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/在用管线数量：1；管线总长度：220 m/);assert.match(await page.locator('#dialog-body').innerText(),/DEMO-PIPE-002/);await close();ok('summary active quantities and length');
 const coherent=await page.evaluate(()=>{const codes=new Map();return V2.fixtures.installation.every(r=>{if(codes.has(r.unit))return codes.get(r.unit)===r.creditCode;codes.set(r.unit,r.creditCode);return true;});});assert(coherent);ok('same fictional unit consistent credit code');
 for(const key of ['boiler','vessel'])for(const width of [768,390]){
 await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8020/static/v2.html#'+key);await page.locator('table').waitFor();await page.locator('#query-form button[type=submit]').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#f-search').fill(key==='boiler'?'DEMO-GL-003':'DEMO-RQ-003');await page.locator('#query-form button[type=submit]').click();assert.equal(await page.locator('.count-total').innerText(),'1');
 await page.locator('tbody tr').first().getByRole('button',{name:'详细',exact:true}).click();await close();ok(key+' '+width+' responsive query/detail');
 }
 assert.equal(errors.length,0);ok('no fatal JS');
 fs.writeFileSync('docs/special-equipment-v2/batch2/edge-results.json',JSON.stringify({passed:checks.length,failed:0,checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

