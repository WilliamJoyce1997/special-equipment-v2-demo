const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const stageA=process.argv.includes('--stage-a'),out='docs/special-equipment-v2/batch2';
fs.mkdirSync(out+'/screenshots',{recursive:true});
const pipelineHeaders='序号、操作、智慧监管编码、检验状态、下检日期、装置名称、管道名称、使用单位、设备代码、所在地区、所在街道、管道编号、管道级别、管道规格、最高工作压力、最高工作温度、管道长度（m）、设计单位、安装单位、工作介质、管道类别、安全等级、使用状态、检验责任主体机构名称、全面检验报告编号、全面检验日期、安管人员、安管人员电话、检验日期、管道起点、管道止点'.split('、');
const common=['综合查询','所在地区','设备类别','使用状态'];
const expected={
crane:[...common,'受理状态','部门名称','拼音简称','主管部门','是否在重要场所','注册状态','使用单位','最新检验业务 检验类别','办理日期','设备使用场所','检验日期'],
vehicle:[...common,'受理状态','部门名称','厂牌编号','拼音简称','最新检验业务 检验类别','主管部门','是否在重要场所','注册状态','使用单位','办理日期','设备使用场所','检验日期'],
amusement:[...common,'受理状态','部门名称','拼音简称','主管部门','最新检验业务 检验类别','是否在重要场所','注册状态','使用单位','办理日期','设备使用场所','检验日期'],
ropeway:[...common,'受理状态','部门名称','拼音简称','主管部门','是否在重要场所','注册状态','使用单位','最新检验业务 检验类别','办理日期','设备使用场所','检验日期'],
installation:[...common,'社会信用代码','创建时间','注册状态','使用单位','最新检验业务 检验类别','办理日期','告知单编号'],
pipeline:[...common,'受理状态','社会信用代码','管道名称','管道级别','是否为重要压力管道','工程装置名称','创建时间','管道长度','注册状态','使用单位','最新检验业务 检验类别','办理日期']
};
const codes={crane:'QZ',vehicle:'CC',amusement:'YL',ropeway:'SD',installation:'ZZ',pipeline:'GX'};
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.replace(/^\uFEFF/,'').length;i++){/* CSV samples use no multiline strings. */}return text.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/).map(line=>{const cells=[];let value='',inside=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(inside&&line[i+1]==='"'){value+='"';i++;}else inside=!inside;}else if(c===','&&!inside){cells.push(value);value='';}else value+=c;}cells.push(value);return cells;});}
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const ok=s=>{checks.push(s);console.log('PASS '+s);};
const count=async n=>assert.equal(await page.locator('.count-total').innerText(),String(n));
const query=()=>page.locator('#query-form button[type=submit]').click(),reset=async()=>{await page.getByRole('button',{name:'⟳  重置',exact:true}).click();await count(0);await query();},close=()=>page.locator('#dialog-close').click();
const snap=async file=>page.screenshot({path:out+'/screenshots/'+file+'.png',fullPage:true,style:'#announcement{visibility:hidden}'});
const keys=stageA?['crane','vehicle','amusement','ropeway']:Object.keys(expected);
try{
for(const key of keys){
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:8020/static/v2.html#'+key);await page.locator('table').waitFor();await query();await count(8);
 assert.deepEqual(await page.locator('.query-grid .field>label').allTextContents(),expected[key]);assert.equal(await page.locator('tbody tr').count(),5);ok(key+' reference query order and 8 samples');
 await snap(key+'-1920');
 await page.locator('#f-search').fill('DEMO-'+codes[key]+'-003');await query();await count(1);
 await page.locator('tbody tr').first().getByRole('button',{name:'详细',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/前端虚构样本/);
 const missing=await page.evaluate(()=>V2.types[location.hash.slice(1)].detailFields.filter(c=>!document.querySelector('#dialog-body').textContent.includes(c.label)).map(c=>c.label));assert.deepEqual(missing,[]);await close();await count(1);ok(key+' query/detail/close retains filters');
 await reset();await count(8);
 await page.locator('#f-category').selectOption({index:1});await query();assert((await page.locator('tbody tr').count())>0);assert(Number(await page.locator('.count-total').innerText())<8);await reset();ok(key+' dropdown and reset');
 await page.locator('#f-handled').fill('2026-02-01');await page.locator('#f-handled-max').fill('2026-03-31');await query();await count(2);await reset();ok(key+' date range');
 await page.locator('#f-search').fill('DEMO-'+codes[key]+'-003');await page.locator('#f-status').selectOption('停用');await query();await count(0);assert.match(await page.locator('tbody').innerText(),/暂无匹配记录/);await reset();ok(key+' combined filters and empty state');
 await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr').first().getAttribute('data-id'),key+'-1');await page.getByRole('button',{name:'按设备代码排序',exact:true}).click();assert.equal(await page.locator('tbody tr').first().getAttribute('data-id'),key+'-8');
 await page.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),3);await page.getByLabel('每页条数',{exact:true}).selectOption('10');assert.equal(await page.locator('tbody tr').count(),8);ok(key+' sort pagination and page size');
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();const hideKey=key==='pipeline'?'管道止点':key==='installation'?'工程装置名称':'联系人';
 await page.locator('#dialog-body label').filter({hasText:hideKey}).locator('input').uncheck();await close();assert.equal(await page.getByRole('button',{name:'按'+hideKey+'排序',exact:true}).count(),0);
 const dlEvent=page.waitForEvent('download');await page.locator('.table-toolbar').getByRole('button',{name:'导出',exact:true}).click();const dl=await dlEvent;const csvFile=out+'/'+key+'-export.csv';await dl.saveAs(csvFile);const csv=parseCSV(fs.readFileSync(csvFile,'utf8'));assert.equal(csv.length,9);
 if(key==='pipeline'){assert.deepEqual(csv[0],pipelineHeaders);assert.equal(csv[1].length,31);assert(csv.every(r=>r.length===31));}
 else assert(csv[0].includes('设备代码'));
 await page.locator('.table-toolbar').getByRole('button',{name:'设 置',exact:true}).click();await page.locator('#dialog-body label').filter({hasText:hideKey}).locator('input').check();await close();ok(key+' column settings and actual CSV download');
 await page.locator('tbody tr').first().getByRole('button',{name:'检验信息',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/不代表法定检验结论/);await close();
 if(!stageA){await page.locator('tbody tr').first().getByRole('button',{name:'修改记录',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/演示资料员/);await close();await page.locator('tbody tr').first().getByRole('button',{name:'智慧监管码',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/虚构标识/);await close();}
 ok(key+' demonstration record actions');
 for(const width of [1366,768,390]){
 await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
 await page.locator('#f-search').fill('DEMO-'+codes[key]+'-003');await query();await count(1);await reset();await count(8);await page.locator('tbody tr').first().getByRole('button',{name:'详细',exact:true}).click();await close();
 if(width===1366||key==='pipeline')await snap(key+'-'+width);ok(key+' '+width+' layout and query/detail interaction');
 }
}
if(!stageA){
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:8020/static/v2.html#pipeline');
 const headers=await page.locator('thead th:not(.check)').evaluateAll(es=>es.map(e=>e.textContent.replace(/[◆▲▼]/g,'').trim()));assert.deepEqual(headers,pipelineHeaders);assert.equal(await page.locator('thead th:not(.check)').count(),31);ok('pipeline EXACT 31 visible headers in required order');
 await page.locator('#f-length').fill('200');await page.locator('#f-length-max').fill('400');await query();await count(2);await reset();ok('pipeline numeric length interval');
 await page.locator('.table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);
 const fixed=await page.locator('thead .fixed').evaluateAll(es=>es.map(e=>({position:getComputedStyle(e).position,x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width})));assert(fixed.every(e=>e.position==='sticky'));assert(fixed[0].x<350&&fixed[1].x<450);await snap('pipeline-scrolled-right');ok('pipeline fixed left columns during far-right scroll');
 await page.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);
 await page.locator('tbody tr').first().getByRole('button',{name:'详细',exact:true}).click();const detailLabels=await page.locator('#dialog-body dt').allTextContents();for(const label of pipelineHeaders)assert(detailLabels.includes(label),label);await snap('pipeline-detail');await close();ok('pipeline detail contains every one of 31 labels');
 const coherent=await page.evaluate(()=>V2.fixtures.pipeline.every(r=>{const a=V2.fixtures.installation.find(a=>a.id===r.installationId);return a&&r.unit===a.unit&&r.installationName===a.installationName&&r.region===a.region&&r.length>0&&r.maxPressure>0&&new Set([r.regulatoryCode,r.equipmentCode,r.pipelineNumber]).size===3&&new Set([r.nextInspection,r.fullInspectionDate,r.inspected]).size===3;}));assert(coherent);ok('pipeline equipment/installation and dates/codes distinct');
 await page.locator('[data-page="installation"]').click();await page.getByLabel('选择 DEMO-ZZ-002',{exact:true}).check();await page.getByRole('button',{name:'管道汇总表',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/虚构管线/);await close();await page.getByRole('button',{name:'新增',exact:true}).click();assert.match(await page.locator('#dialog-body').innerText(),/未提供/);await close();ok('installation summary and honest add placeholder');
 for(const key of ['boiler','vessel','elevator','crane','vehicle','amusement','ropeway','installation','pipeline']){
 await page.locator('[data-page="'+key+'"]').click();await query();await count(8);assert.equal(await page.locator('table').count(),1);assert(!/后续设计|尚未开发/.test(await page.locator('main').innerText()));ok(key+' final 9-page navigation');
 }
 await page.locator('[data-page="crane"]').click();await page.locator('#f-search').fill('DEMO-QZ-003');await query();await count(1);await page.locator('[data-page="vehicle"]').click();await page.getByRole('tab',{name:'起重机械',exact:true}).click();await count(1);ok('top tab switch retains page filters');
}
assert.equal(errors.length,0,errors.join('\n'));ok('no fatal JS or console errors');
const result={stage:stageA?'A':'A+B',passed:checks.length,failed:0,checks,errors,expectedQueries:expected,pipelineHeaders};
fs.writeFileSync(out+'/'+(stageA?'stage-a-results':'test-results')+'.json',JSON.stringify(result,null,2));console.log('ALL '+checks.length+' PASSED');
}catch(e){fs.writeFileSync(out+'/failure-'+(stageA?'a':'all')+'.json',JSON.stringify({checks,errors,error:e.stack},null,2));await snap('failure-'+(stageA?'a':'all'));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

