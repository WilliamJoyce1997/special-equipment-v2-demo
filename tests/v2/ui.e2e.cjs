/* Run from V2 root: node tests/v2/ui.e2e.cjs. Uses installed Playwright with local Chrome. */
const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true});
 const errors=[],requests=[],checks=[],out='docs/special-equipment-v2/screenshots';
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>requests.push(r.url()));fs.mkdirSync(out,{recursive:true});
 const ok=(name)=>{checks.push(name);console.log('PASS '+name);};
 async function query(){await page.locator('#query-form button[type=submit]').click();}
 // Legacy flow resumes with an explicit query after asserting the new reset-empty contract.
 async function reset(){await page.getByRole('button',{name:'⟳  重置',exact:true}).click();await count(0);await query();}
 async function count(n){assert.equal(await page.locator('.count-total').innerText(),String(n));}
 async function close(){await page.locator('#dialog-close').click();}
 try{
 await page.goto('http://127.0.0.1:8020/');await page.locator('table').waitFor();
 assert.equal(await page.locator('.nav-item').count(),21);ok('21 leaf menus');
 const cfg=await page.evaluate(()=>({queries:Object.fromEntries(Object.entries(V2.types).filter(([,t])=>t.implemented).map(([k,t])=>[k,t.queries.map(f=>f.label)])),pipeline:V2.pipelineLabels,all:V2.groups.reduce((a,g)=>a+g[1].length,0)}));
 assert.equal(cfg.pipeline.length,31);assert.equal(cfg.pipeline[4],'下检日期');assert.equal(cfg.pipeline[25],'全面检验日期');assert.equal(cfg.pipeline[28],'检验日期');assert.equal(cfg.pipeline[30],'管道止点');ok('pipeline 31 distinct ordered columns');
 const types=[['boiler','锅炉',19,'fuel','天然气'],['vessel','压力容器',17,'purpose','储存'],['elevator','电梯',21,'insured','是']];
 for(const [key,title,fieldCount,filter,value] of types){
 await page.locator('[data-page="'+key+'"]').click();await query();await count(8);
 assert.equal(await page.locator('.query-grid .field').count(),fieldCount);assert.equal(await page.locator('tbody tr').count(),5);ok(title+' own query schema and 8 fixtures');
 await page.screenshot({path:out+'/'+key+'-1920.png',fullPage:true,style:'#announcement{visibility:hidden}'});
 await page.locator('#f-search').fill('DEMO-'+({boiler:'GL',vessel:'RQ',elevator:'DT'}[key])+'-003');await query();await count(1);ok(title+' comprehensive search');await reset();await count(8);
 await page.locator('#f-'+filter).selectOption(value);await query();await count(key==='elevator'?4:3);ok(title+' category-specific query');await reset();
 await page.locator('#f-inspected').fill('2026-02-01');await page.locator('#f-inspected-max').fill('2026-03-31');await query();await count(2);ok(title+' inspection date range');await reset();
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr').first().getAttribute('data-id'),key+'-1');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr').first().getAttribute('data-id'),key+'-8');ok(title+' ascending and descending sort');
 await page.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),3);ok(title+' pagination');
 await page.locator('tbody tr').first().getByRole('button',{name:'详细',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/前端虚构样本/);assert.match(await page.locator('#dialog-title').innerText(),new RegExp(title));await close();ok(title+' detail');
 await page.locator('tbody tr').first().getByRole('button',{name:'检验信息',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/不代表法定检验结论/);await close();
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body label').filter({hasText:'联系人'}).locator('input').uncheck();await close();assert.equal(await page.getByRole('button',{name:'按联系人排序',exact:true}).count(),0);
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body label').filter({hasText:'联系人'}).locator('input').check();await close();ok(title+' column visibility');
 await reset();await page.setViewportSize({width:1366,height:900});await page.screenshot({path:out+'/'+key+'-1366.png',fullPage:true,style:'#announcement{visibility:hidden}'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));ok(title+' 1366 layout and horizontal table scroll');
 await page.setViewportSize({width:1920,height:1080});
 }
 await page.getByRole('button',{name:'⌕高级查询',exact:true}).click();await page.locator('#dialog #f-equipmentCode').fill('DEMO-DT-004');await page.getByRole('button',{name:'应用高级查询'}).click();await count(1);await reset();ok('advanced query and reset');
 await page.locator('.query-links').getByRole('button',{name:'⚙ 设置',exact:true}).click();await page.locator('#dialog-body label').filter({hasText:'购买保险'}).locator('input').uncheck();await close();assert.equal(await page.locator('#f-insured').isVisible(),false);ok('query field settings');
 await page.locator('.query-links').getByRole('button',{name:'⚙ 设置',exact:true}).click();await page.locator('#dialog-body label').filter({hasText:'购买保险'}).locator('input').check();await close();
 await page.getByRole('button',{name:'更多 >>',exact:true}).click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'导出演示数据 CSV'}).click();const download=await dl;await download.saveAs('docs/special-equipment-v2/sample-export.csv');assert.match(download.suggestedFilename(),/电梯/);ok('CSV download');
 await page.locator('.table-toolbar').getByRole('button',{name:'更改检验机构',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/未提供/);await close();ok('unimplemented action clearly labelled');
 await page.locator('[data-page="pipeline"]').click();assert.equal(await page.locator('table').count(),1);assert.equal(await page.locator('thead th:not(.check)').count(),31);ok('pipeline completed with 31 headers (replaces prior placeholder requirement)');
 await page.locator('.nav-group').filter({hasText:'单位管理'}).click();await page.locator('[data-page="inspection-unit"]').click();assert.match(await page.locator('main').innerText(),/未接通业务操作/);ok('group expansion and other module placeholder');
 await page.locator('[data-page="elevator"]').click();
 for(const width of [768,390]){
 await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const fields=await page.locator('.query-grid .field').evaluateAll(es=>es.filter(e=>e.offsetParent).map(e=>({w:e.getBoundingClientRect().width,controls:[...e.querySelectorAll('input,select')].map(c=>c.getBoundingClientRect().width)})));
 assert(fields.every(f=>f.controls.every(w=>w>50)));await page.screenshot({path:out+'/elevator-'+width+'.png',fullPage:true,style:'#announcement{visibility:hidden}'});ok(width+' responsive form and no viewport overflow');
 }
 await page.locator('#menu-toggle').click();await page.locator('[data-page="boiler"]').click();await query();await count(8);ok('mobile navigation');
 await page.locator('#f-search').fill('NONEXISTENT');await query();await count(0);assert.match(await page.locator('tbody').innerText(),/暂无匹配记录/);await reset();ok('empty result and reset');
 await page.setViewportSize({width:1920,height:1080});await page.locator('#f-evaporation').fill('10');await page.locator('#f-evaporation-max').fill('1');await query();assert.match(await page.locator('#form-error').innerText(),/下限不能大于上限/);await reset();ok('invalid range feedback');
 const blocked=await page.request.get('http://127.0.0.1:8020/api/assets/');assert.equal(blocked.status(),404);ok('V2 UI preview does not expose inherited API');
 assert.equal(errors.length,0,errors.join('\n'));assert(requests.every(u=>u.startsWith('http://127.0.0.1:8020/')));ok('no browser console errors or external requests');
 fs.writeFileSync('docs/special-equipment-v2/test-results.json',JSON.stringify({passed:checks.length,failed:0,checks,errors,queries:cfg.queries,pipeline:cfg.pipeline,requests:[...new Set(requests)]},null,2));console.log('ALL '+checks.length+' CHECKS PASSED');
 }catch(e){fs.writeFileSync('docs/special-equipment-v2/test-failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));await page.screenshot({path:out+'/failure.png',fullPage:true,style:'#announcement{visibility:hidden}'});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

