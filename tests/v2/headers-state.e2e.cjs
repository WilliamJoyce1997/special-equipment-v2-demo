/* Incremental revision coverage using the existing local Chrome/Playwright setup. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const expected=JSON.parse(fs.readFileSync('tests/v2/expected-headers.json','utf8').replace(/^\uFEFF/,''));
const out='docs/special-equipment-v2/column-revision';
fs.mkdirSync(out+'/screenshots',{recursive:true});
const codes={boiler:'GL',vessel:'RQ',elevator:'DT',crane:'QZ',vehicle:'CC',amusement:'YL',ropeway:'SD',installation:'ZZ',pipeline:'GX'};
function csvRows(text){return text.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/).map(line=>{const r=[];let v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===','&&!q){r.push(v);v='';}else v+=c;}r.push(v);return r;});}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true});
 const checks=[],errors=[],downloads=[],headerReport=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('download',d=>downloads.push(d));
 const ok=s=>{checks.push(s);console.log('PASS '+s);},query=()=>page.locator('#query-form button[type=submit]').click(),reset=()=>page.getByRole('button',{name:'⟳  重置',exact:true}).click(),close=()=>page.locator('#dialog-close').click();
 async function counts(x,y=0){assert.equal(await page.locator('.count-total').innerText(),String(x));assert.equal(await page.locator('.count-selected').innerText(),String(y));}
 const headers=()=>page.locator('thead th:not(.check)').evaluateAll(es=>es.map(e=>e.textContent.replace(/[◆▲▼]/g,'').trim()));
 const snap=name=>page.screenshot({path:out+'/screenshots/'+name+'.png',fullPage:true,style:'#announcement{visibility:hidden}'});
 async function exportClick(key){if(key==='elevator'){await page.getByRole('button',{name:'更多 >>',exact:true}).click();await page.getByRole('button',{name:'导出演示数据 CSV',exact:true}).click();}else await page.locator('.table-toolbar').getByRole('button',{name:'导出',exact:true}).click();}
 try{
 const onlyType=process.argv.find(a=>a.startsWith('--type='))?.split('=')[1];
 for(const [key,wanted] of Object.entries(expected).filter(([k])=>!onlyType||k===onlyType)){
 await page.setViewportSize({width:1920,height:1080});
 await page.goto('http://127.0.0.1:8020/static/v2.html?revision='+key+'#'+key);await page.locator('table').waitFor();
 await counts(0);assert.equal(await page.locator('tbody tr[data-id]').count(),0);assert.equal(await page.locator('.fixed.check').count(),1);
 assert.deepEqual(await headers(),wanted);assert.equal(new Set(wanted).size,wanted.length);headerReport.push({key,expected:wanted.length,actual:(await headers()).length,matched:true});
 ok(key+' exact complete headers / independent checkbox / initial empty');
 if(key==='boiler')await snap('01-boiler-initial-empty');
 const fixtureCheck=await page.evaluate(key=>{
  const t=V2.types[key],rows=V2.fixtures[key];const nullable=(r,c)=>key==='elevator'&&r.insured==='否'&&['insurer','policyValidUntil'].includes(c.key)&&r[c.key]===null;
  return {count:rows.length,missing:rows.flatMap(r=>t.detailFields.filter(c=>!nullable(r,c)&&(r[c.key]===undefined||r[c.key]===null||r[c.key]==='')).map(c=>r.id+':'+c.key)),
  wrongTypes:rows.flatMap(r=>t.columns.filter(c=>!nullable(r,c)&&(c.type==='number'?typeof r[c.key]!=='number':c.type==='date'?!/^\d{4}-\d{2}-\d{2}$/.test(r[c.key]):false)).map(c=>c.key))};
 },key);
 assert.equal(fixtureCheck.count,8);assert.deepEqual(fixtureCheck.missing,[]);assert.deepEqual(fixtureCheck.wrongTypes,[]);ok(key+' every fixture/detail key populated with correct number/date types');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();await counts(0);await page.getByLabel('每页条数',{exact:true}).selectOption('10');await counts(0);
 assert(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled());
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();const hide=wanted.at(-1);
 await page.locator('#dialog-body').getByLabel(hide,{exact:true}).uncheck();await close();await counts(0);
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body').getByLabel(hide,{exact:true}).check();await close();await counts(0);
 await page.getByLabel('每页条数',{exact:true}).selectOption('5');ok(key+' sort/page/column settings do not trigger initial query');
 const before=downloads.length;await exportClick(key);assert.match(await page.locator('#dialog-body').innerText(),/尚未执行查询/);await close();await counts(0);assert.equal(downloads.length,before);ok(key+' pre-query export guarded with no download');
 await query();await counts(8);assert.equal(await page.locator('tbody tr[data-id]').count(),5);ok(key+' explicit blank query returns 8 records');
 if(key==='boiler')await snap('02-boiler-after-query');
 const row1='选择 DEMO-'+codes[key]+'-001',row6='选择 DEMO-'+codes[key]+'-006';
 await page.getByLabel(row1,{exact:true}).check();await counts(8,1);
 await page.getByRole('button',{name:'下一页',exact:true}).click();await counts(8,1);await page.getByLabel(row6,{exact:true}).check();await counts(8,2);
 await page.getByRole('button',{name:'上一页',exact:true}).click();await counts(8,2);assert(await page.getByLabel(row1,{exact:true}).isChecked());
 await page.getByLabel('选择本页全部设备',{exact:true}).check();await counts(8,6);await page.getByLabel('选择本页全部设备',{exact:true}).uncheck();await counts(8,1);
 if(key==='boiler')await snap('03-boiler-footer-selection');
 await query();await counts(8,0);ok(key+' cross-page selection / current-page select-all / requery clears selection');
 const colors=await page.locator('.result-count').evaluate(e=>({text:getComputedStyle(e).color,number:getComputedStyle(e.querySelector('.count-total')).color,rect:e.getBoundingClientRect().toJSON(),table:e.closest('.table-panel').querySelector('.table-scroll').getBoundingClientRect().toJSON(),pagination:e.closest('.table-panel').querySelector('.pagination').getBoundingClientRect().toJSON()}));
 assert.equal(colors.text,'rgb(47, 140, 240)');assert.equal(colors.number,'rgb(63, 133, 39)');assert(colors.rect.top>=colors.table.bottom);
 assert(colors.rect.left>=colors.pagination.right-1||colors.rect.top>=colors.pagination.bottom-1);ok(key+' bottom-right blue text / green counts / no pagination overlap');
 await page.getByLabel(row1,{exact:true}).check();await counts(8,1);await page.locator('#f-search').fill('DEMO-'+codes[key]+'-003');await counts(8,0);await query();await counts(1);
 await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'详细',exact:true}).click();
 const details=await page.locator('#dialog-body dt').allTextContents();for(const label of wanted)assert(details.includes(label),key+':'+label);
 assert(!await page.locator('#dialog-body dd').evaluateAll(es=>es.some(e=>e.textContent==='—'||!e.textContent)));
 await close();await counts(1);ok(key+' conditional query/detail full fields/close preserves result');
 await page.locator('#f-search').fill('NOT-EXIST');await query();await counts(0);assert.match(await page.locator('.empty').innerText(),/暂无匹配记录/);
 await reset();await counts(0);assert.equal(await page.locator('#f-search').inputValue(),'');assert.equal(await page.locator('tbody tr[data-id]').count(),0);
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();await counts(0);await query();await counts(8);ok(key+' no match / reset empty / sorting never implicitly loads');
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body').getByLabel(hide,{exact:true}).uncheck();await close();
 const event=page.waitForEvent('download');await exportClick(key);const dl=await event;const filename=out+'/'+key+'-complete.csv';await dl.saveAs(filename);const csv=csvRows(fs.readFileSync(filename,'utf8'));
 assert.deepEqual(csv[0],wanted);assert.equal(csv.length,9);assert(csv.every(r=>r.length===wanted.length));assert.equal(csv.slice(1).flat().filter(v=>v==='').length,key==='elevator'?8:0);assert(csv.slice(1).every(r=>r.every(v=>v!=='—')));
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body').getByLabel(hide,{exact:true}).check();await close();ok(key+' CSV full exact ordered columns even when hidden');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();const first=await page.locator('tbody tr[data-id]').first().getAttribute('data-id');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();const reversed=await page.locator('tbody tr[data-id]').first().getAttribute('data-id');assert.notEqual(first,reversed);ok(key+' queried ascending/descending sorting');
 for(const width of [1366,1920,768,390]){
 await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await page.locator('.table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
 if(width>=1366){
 await page.locator('.table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);
 const pos=await page.locator('thead th.fixed').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,position:getComputedStyle(e).position})));
 assert(pos.every(p=>p.position==='sticky'));assert(Math.abs(pos[1].right-pos[2].x)<2);assert(pos[2].x<450);
 if(key==='elevator'&&width===1920)await snap('04-elevator-rightmost-fields');
 if(key==='pipeline'&&width===1920)await snap('05-pipeline-rightmost-fields');
 await page.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);
 }
 await page.locator('#f-search').fill('DEMO-'+codes[key]+'-003');await query();await counts(1);await page.locator('tbody tr[data-id]').first().getByRole('button',{name:'详细',exact:true}).click();await close();
 if(width===390&&key==='elevator')await snap('06-elevator-390');
 }
 ok(key+' 1366/1920/768/390 layouts and query/detail usable');
 await page.setViewportSize({width:1920,height:1080});await reset();await query();await counts(8);
 const next=Object.keys(expected)[(Object.keys(expected).indexOf(key)+1)%9];
 await page.locator('[data-page="'+next+'"]').click();await counts(0);
 await page.getByRole('tab',{name:await page.evaluate(key=>V2.types[key].title,key),exact:true}).click();await counts(8);
 await reset();await counts(0);await page.locator('[data-page="'+next+'"]').click();await counts(0);ok(key+' category first-visit empty / tab query-state retained / reset retained');
 }
 const top=await page.evaluate(()=>({border:getComputedStyle(document.body).borderTopWidth,sideTop:document.querySelector('#sidebar').getBoundingClientRect().top,headerBottom:document.querySelector('.masthead').getBoundingClientRect().bottom,active:getComputedStyle(document.querySelector('.nav-item.active')).color}));
 assert.equal(top.border,'0px');assert.equal(top.sideTop,top.headerBottom);assert.equal(top.active,'rgb(47, 140, 240)');ok('top decorative border removed; header/sidebar alignment and active blue retained');
 const aliases=await page.evaluate(()=>({boiler:V2.fixtures.boiler.every(r=>new Set([r.internalInspectionDate,r.nextInternalInspectionDate,r.externalInspectionDate,r.nextExternalInspectionDate]).size===4),vessel:V2.fixtures.vessel.every(r=>new Set([r.fullInspectionDate,r.nextFullInspectionDate,r.annualInspectionDate,r.nextAnnualInspectionDate]).size===4),elevator:V2.fixtures.elevator.every(r=>new Set([r.testingDate,r.inspected,r.nextInspection,r.nextTestingDate,r.testingHandledDate]).size===5&&new Set([r.testingOrg,r.currentReportingOrg,r.acceptedTestingOrg,r.inspectionOrg]).size===4),installation:V2.fixtures.installation.every(a=>a.pipelineCount===V2.fixtures.pipeline.filter(p=>p.installationId===a.id).length&&a.pipelineTotalLength===V2.fixtures.pipeline.filter(p=>p.installationId===a.id).reduce((n,p)=>n+p.length,0))}));
 assert(Object.values(aliases).every(Boolean));ok('separate inspections/dates/organizations and consistent installation totals');
 assert.equal(errors.length,0,errors.join('\n'));ok('no fatal JS or console errors');
 fs.writeFileSync(out+'/test-results'+(onlyType?'-'+onlyType:'')+'.json',JSON.stringify({passed:checks.length,failed:0,checks,errors,headers:headerReport},null,2));console.log('ALL '+checks.length+' CHECKS PASSED');
 }catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));await snap('failure');throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

