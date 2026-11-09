const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),XLSX=require('../../static/v2/vendor/xlsx.full.min.js');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
const out='docs/special-equipment-v2/safety-valve';fs.mkdirSync(out+'/screenshots',{recursive:true});
const expected='使用单位名称、统一社会信用代码、使用单位地址、压力等级、流通直径、制造许可证编号、出厂日期、装置名称、位号、安全阀类型、安全阀型号、公称压力、公称通径、产品编号、所属设备、制造厂家、工作压力、工作介质、要求整定压力、要求回座压力、校验方式、校验介质、整定压力（MPa）、回座压力（MPa）、开启高度（mm）、密封试验压力（MPa）、出口密封试验、铅封、最新业务标签、状态'.split('、');
const templateName='安全阀管理.xlsx',templateHash='44b1fb2ae79109975d16fcb5a62f5b6c13a852ef50523e3370a044cbdaad685e';
const headers='使用单位名称|使用单位地址|压力等级|流通直径|制造许可证编号|出厂日期|装置名称|位号|安全阀类型|安全阀型号|公称压力|公称通径|产品编号|制造厂家|工作压力|工作介质|要求整定压力|要求回座压力|检验方式校（  01验台/02在线/03回座校验台）|检验介质|整定压力|回座压力|开启高度|密封试验压力|出口密封试验|铅封|最新业务标签|状态'.split('|');
const enums={
 '安全阀类型':['弹簧','重锤式','杠杆式'],
 '校验方式':['校验台','在线','回座校验台'],
 '最新业务标签':['定期检验','安装监检','进口监检','驻厂监检','新装验收','普查验收','移梯验收','停启验收','改造验收','大修验收','重新验收','型式试验'],
 '状态':['正常','无效']
};
const inspectionValues={
 '检验机构':'DEMO-安全阀检验机构','检验性质':'正常检验','首次检验日期':'2025-02-01',
 '上次检验日期':'2026-01-01','下次检验日期':'2027-04-01','检验日期':'2026-03-04',
 '检验结论':'整改后合格','检验报告书编号':'DEMO-SV-REPORT','检验人员':'演示人员','检验主要问题':'演示问题'
};
(async()=>{const hashDb=()=>require('crypto').createHash('sha256').update(fs.readFileSync('.local/demo.sqlite3')).digest('hex'),dbBefore=hashDb();const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1366,height:900},acceptDownloads:true}),checks=[],errors=[],writes=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('request',r=>{if(r.method()!=='GET')writes.push(r.url())});
p.setDefaultTimeout(8000);
const ok=s=>{checks.push(s);console.log('PASS '+s)},query=()=>p.locator('#query-form button[type=submit]').click(),total=()=>p.locator('.table-panel .count-total').innerText(),button=n=>p.locator('.table-toolbar').getByRole('button',{name:n,exact:true}),close=()=>p.locator('#dialog-close').click(),field=n=>p.locator('#dialog').getByLabel(n,{exact:true}),save=async()=>{await p.locator('#dialog').getByRole('button',{name:'保存',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#dialog').open||!!document.querySelector('#dialog .form-error')?.textContent.trim());},row=id=>p.locator('tbody tr[data-id="'+id+'"]');
async function importFile(name,buffer){await button('导入').click();await p.locator('#dialog input[type=file]').setInputFiles({name,mimeType:'application/octet-stream',buffer});await p.locator('#dialog').getByRole('button',{name:'上传',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#dialog')?.open||!!document.querySelector('#dialog .form-error')?.textContent.trim())}
try{
await p.goto(process.env.V2_SAFETY_VALVE_URL||'http://127.0.0.1:8020/');await p.getByRole('button',{name:'安全附件',exact:true}).click();await p.getByRole('button',{name:'安全阀管理',exact:true}).click();assert.equal(await p.locator('.table-panel').count(),1);assert.equal(await total(),'0');await query();assert.equal(await total(),'10');assert.deepEqual((await p.locator('.table-panel th:not(.check)').evaluateAll(es=>es.map(e=>e.querySelector('button span')?.textContent||e.textContent))).slice(0,8),['序号','操作','使用单位名称','装置名称','安全阀类型','安全阀型号','制造单位','产品编号']);ok('menu, initial empty, ten fictional valves and visible reference headers');
const baseline=await p.evaluate(()=>({rows:structuredClone(V2SafetyValves.rows),form:V2SafetyValveSchema.fields,schema:V2SafetyValveSchema.importFields,assets:JSON.stringify(V2.fixtures.boiler)})),original=baseline.rows[0];await p.getByLabel('每页条数',{exact:true}).selectOption('20');
assert.equal(await button('导出').count(),0);assert.equal(await p.locator('#query-form .query-links, #query-form .boiler-advanced').count(),0);
const tableSettings=()=>p.locator('.table-toolbar > .link').click();
await tableSettings();assert.equal(await p.locator('#dialog-title').innerText(),'表格自定义展示字段');
await field('显示 安全阀型号').uncheck();await save();
assert.equal(await p.getByRole('button',{name:'按安全阀型号排序',exact:true}).count(),0);
await tableSettings();await field('显示 安全阀型号').check();await save();
assert.equal(await p.getByRole('button',{name:'按安全阀型号排序',exact:true}).count(),1);
async function checkOptions(label,values){assert.deepEqual(await field(label).locator('option').allTextContents(),['请选择',...values]);}
async function inspection(id){
 await row(id).getByRole('button',{name:'更多>>',exact:true}).click();
 assert.deepEqual(await p.getByRole('menuitem').allTextContents(),['修改记录','检验信息']);
 await p.getByRole('menuitem',{name:'检验信息',exact:true}).click();
 assert.equal(await p.locator('#dialog-title').innerText(),'检验信息');
}
await button('新增').click();assert.equal(await p.locator('#dialog-title').innerText(),'安全阀新增');assert.equal(await field('使用单位名称').inputValue(),'');assert.equal(await field('产品编号').inputValue(),'');assert.deepEqual(await p.locator('.valve-form-field>label').evaluateAll(es=>es.map(e=>e.textContent.replace(/^\*/,''))),expected);assert.equal(await p.locator('.required-mark').count(),8);
for(const [label,values] of Object.entries(enums))await checkOptions(label,values);
await p.locator('#dialog .dialog-footer').getByRole('button',{name:'粘贴',exact:true}).click();assert.match(await p.locator('#dialog .form-error').innerText(),/没有.*复制/);await save();assert.match(await p.locator('#dialog .form-error').innerText(),/使用单位名称/);
for(const f of baseline.form.filter(f=>f.required)){const value=f.type==='number'?'1':f.key==='productNumber'?'DEMO-SV-NEW':f.key==='pressureLevel'?'演示压力等级':'DEMO-'+f.label;await field(f.label).fill(value)}
for(const [label,values] of Object.entries(enums))await field(label).selectOption(values.at(-1));
await field('公称压力').fill('-1');await save();assert.match(await p.locator('#dialog .form-error').innerText(),/公称压力/);await field('公称压力').fill('1.6');await save();assert.equal(await total(),'11');ok('same 30-field add form, eight stars, paste-empty/required/numeric validation and browser-local add');
const created=await p.evaluate(()=>V2SafetyValves.rows.find(r=>r.productNumber==='DEMO-SV-NEW'));await row(created.id).getByRole('button',{name:'编辑',exact:true}).click();assert.equal(await field('产品编号').inputValue(),'DEMO-SV-NEW');
for(const [label,values] of Object.entries(enums)){await checkOptions(label,values);assert.equal(await field(label).inputValue(),values.at(-1));}
await field('装置名称').fill('DEMO-EDITED-INSTALLATION');await save();assert.match(await row(created.id).innerText(),/DEMO-EDITED-INSTALLATION/);await row(created.id).getByRole('button',{name:'编辑',exact:true}).click();await field('产品编号').fill(original.productNumber);await save();assert.match(await p.locator('#dialog .form-error').innerText(),/重复/);await close();ok('edit loads correct record, saves only selected row, duplicate identifier rejected and cancel discards draft');
await p.reload();await query();await p.getByLabel('每页条数',{exact:true}).selectOption('20');await row(created.id).getByRole('button',{name:'编辑',exact:true}).click();
for(const [label,values] of Object.entries(enums))assert.equal(await field(label).inputValue(),values.at(-1));
assert.equal(await field('装置名称').inputValue(),'DEMO-EDITED-INSTALLATION');await close();await p.getByLabel('每页条数',{exact:true}).selectOption('20');
await inspection(original.id);
assert.equal(await field('检验日期').inputValue(),original.inspectionDate);
assert.equal(await field('下次检验日期').inputValue(),original.nextInspectionDate);
await checkOptions('检验性质',['正常检验','无法检验','延期检验','下达检验']);
await checkOptions('检验结论',['合格','不合格','复检合格','复检不合格','监护使用','整改后合格']);
for(const [label,value] of Object.entries(inspectionValues)){
 const control=field(label);assert(await control.isEditable());
 if(['检验性质','检验结论'].includes(label))await control.selectOption(value);
 else{if(label.endsWith('日期'))assert.equal(await control.getAttribute('type'),'date');await control.fill(value);}
}
assert.deepEqual(await p.locator('.valve-inspection-grid label').allTextContents(),Object.keys(inspectionValues));
await field('下次检验日期').fill('2026-01-01');await save();
assert.match(await p.locator('#dialog .form-error').innerText(),/下次检验日期不能早于/);
await field('下次检验日期').fill(inspectionValues['下次检验日期']);
await save();await p.locator('#dialog').waitFor({state:'hidden'});
assert.match(await row(original.id).innerText(),/2026-03-04/);
await inspection(baseline.rows[1].id);assert.equal(await field('检验日期').inputValue(),baseline.rows[1].inspectionDate);assert.equal(await field('检验报告书编号').inputValue(),'');await close();
await inspection(original.id);await field('检验报告书编号').fill('DEMO-DISCARD');await p.locator('#dialog-done').click();
await inspection(original.id);assert.equal(await field('检验报告书编号').inputValue(),inspectionValues['检验报告书编号']);await field('检验人员').fill('DEMO-DISCARD');await close();
await p.reload();await query();await inspection(original.id);
for(const [label,value] of Object.entries(inspectionValues))assert.equal(await field(label).inputValue(),value);
const gridBounds=await Promise.all(['检验机构','检验性质','首次检验日期','检验主要问题'].map(label=>field(label).boundingBox()));
assert(Math.abs(gridBounds[0].x-gridBounds[1].x)<2);assert(Math.abs(gridBounds[1].y-gridBounds[2].y)<2);assert(gridBounds[2].x>gridBounds[1].x);assert(Math.abs(gridBounds[3].x-gridBounds[0].x)<2);
await p.setViewportSize({width:390,height:680});assert(await p.locator('#dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1&&d.scrollHeight<=d.clientHeight+1));
await p.setViewportSize({width:1366,height:900});await close();await p.getByLabel('每页条数',{exact:true}).selectOption('20');
ok('inspection fields and paired layout, editable dates, row isolation, both cancel paths and reload persistence');
await row(original.id).getByRole('button',{name:'复制',exact:true}).click();await p.getByRole('status').filter({hasText:'复制成功'}).waitFor({state:'attached'});assert.equal(await total(),'12');assert.match(await p.locator('#announcement').innerText(),/复制成功/);const copy=await p.evaluate(()=>V2SafetyValves.rows.at(-1));assert.notEqual(copy.id,original.id);assert.notEqual(copy.productNumber,original.productNumber);
await button('新增').click();await p.locator('#dialog .dialog-footer').getByRole('button',{name:'粘贴',exact:true}).click();assert.equal(await field('使用单位名称').inputValue(),original.unitName);assert.notEqual(await field('产品编号').inputValue(),original.productNumber);await save();assert.equal(await total(),'13');ok('copy creates independent record and session clipboard paste uses unique number');
await button('删除').click();assert.match(await p.locator('#announcement').innerText(),/先选择/);await row(created.id).locator('input').check();await button('删除').click();assert.equal(await p.locator('#dialog-title').innerText(),'确认删除安全阀');await p.locator('#dialog').getByRole('button',{name:'取消',exact:true}).click();assert.equal(await total(),'13');assert.equal(await p.locator('.table-panel .count-selected').innerText(),'1');await button('删除').click();await p.locator('#dialog').getByRole('button',{name:'确认删除',exact:true}).click();await p.locator('#dialog').waitFor({state:'hidden'});assert.equal(await total(),'12');assert.equal(await p.locator('.table-panel .count-selected').innerText(),'0');assert.equal(await row(created.id).count(),0);ok('delete requires selection and confirmation; cancel preserves, confirm updates counts');
await p.getByLabel('使用单位',{exact:true}).fill(original.unitName);await p.getByLabel('检验日期下限',{exact:true}).fill('2026-01-01');await p.getByLabel('检验日期上限',{exact:true}).fill('2026-12-31');await query();assert(Number(await total())>0);await p.locator('#query-form').getByRole('button',{name:'⟳ 重置',exact:true}).click();assert.equal(await total(),'0');await query();ok('combined date/text query and reset empty');
await button('导入').click();const dl=p.waitForEvent('download');await p.locator('#dialog').getByRole('link',{name:'下载模板',exact:true}).click();const download=await dl;
assert.equal(download.suggestedFilename(),templateName);
const template=fs.readFileSync(await download.path());assert.equal(require('node:crypto').createHash('sha256').update(template).digest('hex'),templateHash);
const wb=XLSX.read(template),sheet=wb.Sheets[templateName];assert.deepEqual(wb.SheetNames,[templateName]);assert.deepEqual(XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}),[headers]);
assert.deepEqual(baseline.schema.map(f=>f.label),headers);assert(baseline.schema.every(f=>f.required));await close();ok('download matches the original filename, bytes, worksheet and 28 required headers');
function book(records,type='xlsx',changedHeaders=headers,formula=false){
 const wb=XLSX.read(template),ws=wb.Sheets[templateName];
 XLSX.utils.sheet_add_aoa(ws,[changedHeaders,...records.map(r=>baseline.schema.map(f=>r[f.key]??''))],{origin:'A1'});
 if(formula)ws.A2={t:'n',f:'1+1',v:2};
 return Buffer.from(XLSX.write(wb,{type:'buffer',bookType:type}));
}
const beforeImport=Number(await total());
const valid=Object.fromEntries(baseline.schema.map(f=>[f.key,original[f.key]||f.options[0]||(f.type==='number'?1:'DEMO-'+f.key)]));
Object.assign(valid,{productNumber:'001204',factoryDate:46023,calibrationMethod:1});
await importFile('valid.xlsx',book([valid]));assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await total(),String(beforeImport+1));
const imported=await p.evaluate(()=>V2SafetyValves.rows.find(r=>r.productNumber==='001204'));
for(const [key,value] of Object.entries({...valid,factoryDate:'2026-01-01',calibrationMethod:'校验台'}))assert.equal(imported[key],value,key);
for(const key of ['creditCode','equipment','inspectionDate','nextInspectionDate'])assert.equal(imported[key]??'','');
ok('filled original template imported with exact field mapping, date conversion and leading zero preservation');
await p.context().setOffline(true);await importFile('valid.xls',book([{...valid,productNumber:501205,calibrationMethod:'03'}],'biff8'));assert.equal(await total(),String(beforeImport+2));await p.context().setOffline(false);
assert.equal(await p.evaluate(()=>V2SafetyValves.rows.find(r=>r.productNumber==='501205').calibrationMethod),'回座校验台');ok('valid legacy xls parsed locally while offline');
const n=await total();
const cases=[
 ['wrong.csv',Buffer.from('bad'),'格式'],
 ['fake.xlsx',Buffer.from('not an Excel workbook'),'文件'],
 ['headers.xlsx',book([valid],'xlsx',['错误表头',...headers.slice(1)]),'表头'],
 ['missing.xlsx',book([{...valid,productNumber:'DEMO-MISSING',unitName:''}]),'使用单位名称'],
 ['missing-seal.xlsx',book([{...valid,productNumber:'DEMO-MISSING-SEAL',leadSeal:''}]),'第2行.*铅封.*必填'],
 ['invalid-method.xlsx',book([{...valid,productNumber:'DEMO-BAD-METHOD',calibrationMethod:'04'}]),'第2行.*检验方式'],
 ['negative.xlsx',book([{...valid,productNumber:'DEMO-NEGATIVE',nominalPressure:-1}]),'公称压力'],
 ['date.xlsx',book([{...valid,productNumber:'DEMO-DATE',factoryDate:'2026-02-31'}]),'出厂日期'],
 ['existing.xlsx',book([valid]),'重复'],
 ['batch-duplicate.xlsx',book([{...valid,productNumber:'DEMO-BATCH'},{...valid,productNumber:'DEMO-BATCH'}]),'重复'],
 ['atomic.xlsx',book([{...valid,productNumber:'DEMO-ATOMIC-GOOD'},{...valid,productNumber:'DEMO-ATOMIC-BAD',unitName:''}]),'使用单位名称'],
 ['formula.xlsx',book([{...valid,productNumber:'DEMO-FORMULA'}],'xlsx',headers,true),'公式']
];for(const [name,buffer,message]of cases){await importFile(name,buffer);assert.match(await p.locator('#dialog .form-error').innerText(),new RegExp(message));await close();assert.equal(await total(),n);ok('reject '+name+' without partial writes')}
await p.getByRole('button',{name:'按产品编号排序',exact:true}).click();await p.getByLabel('每页条数',{exact:true}).selectOption('5');await p.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await p.locator('tbody tr[data-id]').count(),5);ok('sorting and paging reflect current records');
await p.getByLabel('每页条数',{exact:true}).selectOption('20');
await row(original.id).locator('input').check();
for(const valve of baseline.rows.slice(0,2)){
 const before=await p.locator('.table-panel').innerText();
 await row(valve.id).getByRole('button',{name:'更多>>',exact:true}).click();
 await p.getByRole('menuitem',{name:'修改记录',exact:true}).click();
 assert.equal(await p.locator('#dialog-title').innerText(),'历史修改记录');
 assert.equal(await p.locator('.more-dialog-view').getAttribute('data-record'),valve.id);
 assert.equal(await p.locator('.more-dialog-view').getAttribute('data-entity'),'safety-valve');
 assert.match(await p.locator('.more-context-note').innerText(),new RegExp(valve.productNumber));
 assert.deepEqual(await p.locator('#dialog th:not(.check)').allTextContents(),['序号',...await p.evaluate(()=>V2MoreDialogs.auditFields)]);
 assert.equal(await p.locator('#dialog .count-total').innerText(),'0');
 await p.locator('#dialog input[name=actor]').fill('DEMO');
 await p.locator('#dialog input[name=from]').fill('2026-12-31');await p.locator('#dialog input[name=to]').fill('2026-01-01');
 await p.locator('#dialog button[type=submit]').click();assert.match(await p.locator('#dialog .form-error').innerText(),/开始日期不能晚于/);
 await p.locator('#dialog').getByRole('button',{name:'⟳ 重置',exact:true}).click();assert.equal(await p.locator('#dialog input[name=actor]').inputValue(),'');
 await p.locator('#dialog button[type=submit]').click();assert.equal(await p.locator('#dialog .count-total').innerText(),'0');
 await close();assert.equal(await p.locator('.table-panel').innerText(),before);
}
assert.deepEqual(await p.evaluate(()=>{const a=V2SafetyValves.rows[0],b=V2SafetyValves.rows[1];return V2MoreDialogs.auditRows('safety-valve',{...a,auditRecords:[{id:'own',entityType:'safety-valve',entityId:a.id},{id:'other-valve',entityType:'safety-valve',entityId:b.id},{id:'equipment',entityType:'equipment',entityId:a.id},{id:'product',entityType:'product',entityId:a.id}]}).map(r=>r.id)}),['own']);
ok('two valve audit dialogs reuse shared component, exact headers/query/reset/empty and strict entity-ID isolation; closing preserves list state');
for(const width of [1366,1920,390]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/screenshots/list-'+width+'.png'});await row(original.id).getByRole('button',{name:'编辑',exact:true}).click();assert(await p.locator('#dialog').evaluate(e=>e.scrollHeight<=e.clientHeight+1));assert.equal(await p.locator('#dialog .dialog-footer button').count(),3);await p.screenshot({path:out+'/screenshots/edit-'+width+'.png'});await close();await button('导入').click();await p.screenshot({path:out+'/screenshots/import-'+width+'.png'});await close();ok(width+' list and dialogs usable / one vertical owner');}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(await p.evaluate(()=>JSON.stringify(V2.fixtures.boiler)),baseline.assets);ok('no blocking errors, network writes or asset mutations');
await p.reload();await query();assert.equal(await total(),n);assert.equal(await p.evaluate(id=>V2SafetyValves.rows.some(r=>r.id===id),created.id),false);assert.deepEqual(await p.evaluate(id=>V2SafetyValves.rows.find(r=>r.id===id),imported.id),imported);ok('refresh retains mapped import records and confirmed deletion');
assert.equal(hashDb(),dbBefore);fs.writeFileSync(out+'/test-results.json',JSON.stringify({passed:checks.length,failed:0,skipped:0,checks,errors,demoDatabaseSha256Unchanged:true},null,2));
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({checks,errors,error:e.stack},null,2));throw e}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

