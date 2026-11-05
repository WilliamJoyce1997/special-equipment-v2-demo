const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const out='docs/special-equipment-v2/inspection-unification';fs.mkdirSync(out+'/screenshots',{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const ok=x=>{checks.push(x);console.log('PASS '+x)};
const query=()=>page.locator('#query-form button[type=submit]').click();
async function snapshot(scope){return scope.evaluate(e=>({tables:[...e.querySelectorAll('[data-table]')].map(t=>({id:t.dataset.table,headers:[...t.querySelectorAll('thead th:not(.check)')].map(x=>x.textContent),rows:[...t.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].slice(3).map(x=>x.textContent)),total:t.querySelector('.count-total').textContent,selected:t.querySelector('.count-selected').textContent})),kinds:[...e.querySelectorAll('select[aria-label="历史检验类别"] option')].map(x=>x.textContent),disabled:[...e.querySelectorAll('button:disabled')].map(x=>x.textContent)}))}
async function actions(scope){const card=scope.locator('[data-table=completed]');if(await card.locator('tbody .more-inspection-actions').count()){for(const name of ['详情','报告','报告附件','意见书']){await card.locator('tbody tr').first().getByRole('button',{name,exact:true}).click();if(name==='详情'||name==='报告附件'){const child=page.locator('dialog.inspection-record-dialog[open]');if(name==='详情')assert.equal(await child.locator('.inspection-read-field').count(),13);else assert.match(await child.innerText(),/暂无数据/);await child.getByRole('button',{name:'关闭子弹窗',exact:true}).click()}else{assert.match(await scope.innerText(),/演示数据暂无对应文件/);await scope.getByRole('button',{name:'‹ 返回历史检验信息',exact:true}).click()}}}}
async function filters(scope){const c=scope.locator('[data-table=completed]'),select=c.getByLabel('历史检验类别',{exact:true});const opts=await select.locator('option').evaluateAll(es=>es.map(x=>x.value));if(opts.length>1)await select.selectOption(opts[1]);await c.locator('.latest-label input').check();await c.locator('form button[type=submit]').click();return snapshot(scope)}
try{for(const type of ['boiler','vessel','elevator','crane','vehicle','amusement','ropeway','installation','pipeline']){
await page.goto('http://127.0.0.1:8020/#'+type);await query();
const row=page.locator('tbody tr[data-id]').first();const id=await row.getAttribute('data-id');await row.locator('input[type=checkbox]').check();const before=await page.locator('#main').innerText();
await row.getByRole('button',{name:'更多>>',exact:true}).click();await page.getByRole('menuitem',{name:'检验信息',exact:true}).click();
const modal=page.locator('#dialog .inspection-history-view'),original=await snapshot(modal);assert.equal(original.tables.length,3);assert.equal(original.tables[0].headers.length,14);assert.equal(original.tables[2].headers.length,9);
await actions(modal);const filtered=await filters(modal);ok(type+' modal actions / filters / three tables');
if(type==='boiler'){
await modal.locator('[data-table=completed] .latest-label input').uncheck();await modal.getByLabel('历史检验类别',{exact:true}).selectOption('');await modal.locator('form button[type=submit]').click();
const c=modal.locator('[data-table=completed]');await c.getByLabel('已完成检验信息每页条数',{exact:true}).selectOption('1');await c.getByLabel('已完成检验信息选择第1条',{exact:true}).check();await c.getByRole('button',{name:'已完成检验信息下一页',exact:true}).click();assert.equal(await c.locator('.count-selected').innerText(),'1');await c.getByLabel('已完成检验信息每页条数',{exact:true}).selectOption('10');
for(const width of [1366,1920,768,390]){
await page.setViewportSize({width,height:768});
const metrics=await page.locator('#dialog').evaluate(d=>{const b=d.querySelector('#dialog-body'),h=d.querySelector('.dialog-header'),f=d.querySelector('.dialog-footer');return {outer:d.scrollHeight-d.clientHeight,body:b.scrollHeight-b.clientHeight,overflow:getComputedStyle(b).overflowY,header:h.getBoundingClientRect().top,footer:f.getBoundingClientRect().bottom,v:innerHeight,wide:document.documentElement.scrollWidth>innerWidth}});
assert(metrics.outer<=1,JSON.stringify(metrics));assert(metrics.body>0);assert.equal(metrics.overflow,'auto');assert(!metrics.wide);assert(metrics.header>=0&&metrics.footer<=metrics.v);
await page.locator('#dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal(await page.locator('#dialog').evaluate(e=>e.scrollTop),0);
await c.locator('.table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);assert(await c.locator('.table-scroll').evaluate(e=>e.scrollLeft>0&&e.scrollHeight<=e.clientHeight+1));
if(width>760){const rects=await c.locator('thead .fixed').evaluateAll(es=>es.map(e=>({l:e.getBoundingClientRect().left,r:e.getBoundingClientRect().right})));assert(Math.abs(rects[0].r-rects[1].l)<2);assert(Math.abs(rects[1].r-rects[2].l)<2)}
await c.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);await page.locator('#dialog-body').evaluate(e=>e.scrollTop=0);
if(width===1366||width===390)await page.screenshot({path:out+'/screenshots/modal-'+width+'.png'});
ok('modal '+width+' single vertical owner / horizontal scroll / fixed cells');
}
await page.setViewportSize({width:1366,height:768});
}
await page.locator('#dialog-close').click();assert.equal(await page.locator('#main').innerText(),before);
await row.getByRole('button',{name:'详情',exact:true}).click();await page.locator('.equipment-subtabs').getByRole('tab',{name:'设备检验信息',exact:true}).click();
const detail=page.locator('.equipment-info .inspection-history-view');assert.equal(await detail.getAttribute('data-record'),id);assert.deepEqual(await snapshot(detail),original);await actions(detail);assert.deepEqual(await filters(detail),filtered);ok(type+' detail identical records / headers / categories / filters / disabled tools / actions');
if(type==='boiler'){await detail.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/screenshots/detail-1366.png'});await page.setViewportSize({width:390,height:768});await detail.scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/screenshots/detail-390.png'});await page.setViewportSize({width:1366,height:768});}
await page.locator('.equipment-subtabs').getByRole('tab',{name:'全部',exact:true}).click();assert.equal(await page.locator('.inspection-history-view').count(),1);ok(type+' all tab shares inspection view');
}
assert.deepEqual(errors,[]);ok('no blocking browser console or JS errors');
fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:0,checks,errors},null,2));console.log('ALL '+checks.length+' PASSED');
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

