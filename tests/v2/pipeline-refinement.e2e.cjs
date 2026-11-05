const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6500);
  await page.goto('http://127.0.0.1:8020/#pipeline');
  const form=page.locator('#query-form'),options=l=>l.locator('option').allTextContents(),query=()=>form.locator('button[type=submit]').click();
  const total=()=>page.locator('#main .count-total').innerText(),rows=()=>page.locator('#main tbody tr[data-id]');
  assert.deepEqual(await options(form.getByLabel('设备类别一级',{exact:true})),['请选择','旧目录压力管道','长输管道','公用管道','工业管道']);
  for(const [parent,children]of Object.entries(await page.evaluate(()=>V2PipelineSchema.category))){
   await form.getByLabel('设备类别一级',{exact:true}).selectOption(parent);
   const child=form.getByLabel('设备类别二级',{exact:true});
   if(children.length)assert.deepEqual(await options(child),['请选择',...children]);else assert(!(await child.isVisible()));
  }
  await form.getByLabel('设备类别二级',{exact:true}).selectOption('工艺管道');
  assert.deepEqual(await options(form.locator('[name=pipeLevel]')),['请选择','GA1','GA2','GB1','GB2','GC1','GC2','GC3','GD1','GD2','GCD']);
  await form.locator('[name=pipeLevel]').selectOption('GC2');
  await form.locator('[name=latestInspectionKind]').selectOption('年度检验');
  await form.locator('[name=importantPipeline]').selectOption('是');
  await form.locator('[name=length_min]').fill('0');await form.locator('[name=length_max]').fill('120');
  await query();assert.equal(await total(),'1');
  await form.getByRole('button',{name:/重置/}).click();
  await form.getByRole('button',{name:/高级查询/}).click();
  assert.equal(await form.locator('.boiler-advanced .field').count(),25);
  assert.equal(await form.locator('.boiler-advanced .query-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
  assert.equal(await form.locator('[name=advancedPipeLevel]').getAttribute('type'),'text');
  assert.deepEqual(await options(form.locator('[name=inspectionConclusion]')),['请选择','合格','不合格','复检合格','复检不合格','监护使用','整改后合格']);
  assert.deepEqual(await options(form.locator('[name=inspectionDepartment]')),['请选择','SCD','XX监管局']);
  assert.deepEqual(await options(form.locator('[name=inspectionProblems]')),['请选择','腐蚀','变形','裂纹','泄漏','材质劣化','其他']);
  assert.deepEqual(await options(form.locator('[name=managementProblems]')),['请选择','质量管理体系','人员管理','设计图纸','材料','施工过程']);
  await form.locator('[name=inspectionConclusion]').selectOption('合格');
  await form.locator('[name=inspectionDepartment]').selectOption('SCD');
  await form.locator('[name=inspectionProblems]').selectOption('腐蚀');
  await form.locator('[name=managementProblems]').selectOption('质量管理体系');
  await query();assert.equal(await total(),'4');
  await form.locator('[name=managementProblems]').selectOption('人员管理');await query();assert.equal(await total(),'0');
  assert.equal(await form.locator('[name=inspectionProblems]').inputValue(),'腐蚀');
  await form.getByRole('button',{name:/重置/}).click();
  assert.equal(await form.locator('[name=managementProblems]').inputValue(),'');
  const fullDate=await page.evaluate(()=>V2.fixtures.pipeline[0].fullInspectionDate);
  await form.locator('[name=inspectionDate_min]').fill(fullDate);await form.locator('[name=inspectionDate_max]').fill(fullDate);
  await query();assert.equal(await total(),'1');
  await form.getByRole('button',{name:/设置/}).click();
  assert.equal(await page.locator('#dialog tbody tr').count(),25);await page.locator('#dialog-close').click();
  await form.locator('[name=unit]').last().fill('云岚');
  assert.equal(await form.locator('[name=unit]').first().inputValue(),'云岚');
  await form.getByRole('button',{name:/普通查询/}).click();
  assert.equal(await form.locator('[name=unit]').inputValue(),'云岚');
  await form.getByRole('button',{name:/重置/}).click();await query();assert.equal(await total(),'8');
  await page.getByLabel('每页条数',{exact:true}).selectOption('5');
  await page.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await rows().count(),3);
  await page.getByRole('button',{name:'上一页',exact:true}).click();
  await page.getByRole('button',{name:'按管道名称排序',exact:true}).click();
  const first=rows().first();
  assert.deepEqual(await first.locator('.row-action').allTextContents(),['详情','检验信息','修改记录','智慧监管码']);
  for(const name of ['检验信息','修改记录','智慧监管码']){
   await first.getByRole('button',{name,exact:true}).click();assert(await page.locator('#dialog').isVisible());
   if(name==='检验信息'){
    const dialog=page.locator('#dialog');
    await dialog.getByLabel('历史检验类别').selectOption('全面检验');
    await dialog.getByRole('button',{name:'查询',exact:true}).click();
    await dialog.getByRole('button',{name:'详情',exact:true}).click();
    const child=page.locator('.inspection-record-dialog');
    assert.deepEqual(await options(child.getByLabel('设备检验结论',{exact:true})),['请选择','合格','不合格','复检合格','复检不合格','监护使用','整改后合格']);
    assert.deepEqual(await options(child.getByLabel('检验部门',{exact:true})),['请选择','SCD','XX监管局']);
    assert.equal(await child.locator('.problem-groups input:checked').count(),2);
    await child.getByRole('button',{name:'关闭子弹窗'}).click();
   }
   await page.locator('#dialog-close').click();
  }
  await first.getByRole('button',{name:'详情',exact:true}).click();
  assert.equal(await page.locator('.equipment-info').getByLabel('设备类别一级',{exact:true}).locator('option').count(),5);
  await page.locator('.equipment-info').getByRole('tab',{name:'检验信息',exact:true}).click();
  for(const select of await page.locator('.equipment-info').getByLabel('检验结论',{exact:true}).all()){
   assert.deepEqual(await options(select),['请选择','合格','不合格','复检合格','复检不合格','监护使用','整改后合格']);
  }
  await page.locator('#tabs .tab.active .tab-close').click();
  await page.locator('.table-toolbar').getByRole('button',{name:/设\s*置/}).click();
  assert.deepEqual(await page.locator('#dialog .settings-grid label').allTextContents(),await page.evaluate(()=>V2.types.pipeline.columns.map(c=>c.label)));
  await page.locator('#dialog-close').click();
  const downloaded=page.waitForEvent('download');await page.locator('.table-toolbar').getByRole('button',{name:'导出',exact:true}).click();assert((await downloaded).suggestedFilename());
  assert.deepEqual(errors,[]);
  console.log('PASS pipeline 8020 cascades, combined filters, independent problems, dates, settings, paging, four actions and export');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
