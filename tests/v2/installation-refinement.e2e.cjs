const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
  const options=l=>l.locator('option').allTextContents();
  await page.goto('http://127.0.0.1:8020/#installation');
  const form=page.locator('#query-form');
  await form.getByLabel('设备类别一级',{exact:true}).selectOption('工业管道');
  assert.deepEqual(await options(form.getByLabel('设备类别二级',{exact:true})),['请选择','工艺管道','动力管道','制冷管道']);
  await form.getByLabel('设备类别二级',{exact:true}).selectOption('工艺管道');
  assert.deepEqual(await options(form.locator('[name=latestInspectionKind]')),['请选择','年度检验','全面检验','安装监检']);
  await form.locator('button[type=submit]').click();
  assert.match(await page.locator('.installation-totals').innerText(),/管线总长度 \d+\.\d{3} m/);
  await form.getByRole('button',{name:/高级查询/}).click();
  assert.equal(await form.locator('.boiler-advanced .field').count(),32);
  await form.locator('[name=unit]').first().fill('虚构');
  assert.equal(await form.locator('[name=unit]').last().inputValue(),'虚构');
  await form.locator('[name=unit]').first().fill('');
  assert.deepEqual(await options(form.locator('[name=inspectionQueryKind]')),['请选择','年度检查','全面检验','安装监督检验','压力管道委托检验']);
  assert(await form.locator('[name=inspectionConclusion]').isDisabled());
  await form.locator('[name=inspectionQueryKind]').selectOption('年度检查');await form.locator('button[type=submit]').click();
  assert.equal(await page.locator('#main .count-total').innerText(),'2');
  await form.getByRole('button',{name:/普通查询/}).click();assert.equal(await form.locator('.boiler-advanced').count(),0);
  await form.getByRole('button',{name:/重置/}).click();
  await page.locator('.table-toolbar [data-action=新增]').click();
  assert.equal(await page.getByRole('tab',{name:'新增压力管道设备信息',exact:true}).count(),1);
  const create=page.locator('.installation-create'),mode=create.getByRole('switch',{name:'编辑模式'}),unit=create.getByLabel('使用单位名称',{exact:true});
  assert.equal(await create.locator('.dossier-group').count(),5);assert(await unit.isDisabled());
  await mode.check();await unit.fill('虚构新增单位');
  const length=create.getByLabel('管道总长度（m）',{exact:true});await length.fill('1.2');await length.press('Tab');assert.equal(await length.inputValue(),'1.200');
  await create.getByLabel('所在地区省级',{exact:true}).selectOption('53');
  await create.getByLabel('所在地区市区县',{exact:true}).selectOption('5301');
  await create.getByLabel('设备类别一级',{exact:true}).selectOption('工业管道');
  await create.getByLabel('设备类别二级',{exact:true}).selectOption('动力管道');
  const industry=await page.evaluate(()=>V2CommonFields.industry);
  for(const [parent,children] of Object.entries(industry)){
   await create.getByLabel('单位所属行业一级',{exact:true}).selectOption(parent);
   assert.deepEqual(await options(create.getByLabel('单位所属行业二级',{exact:true})),['请选择',...children]);
   await create.getByLabel('单位所属行业二级',{exact:true}).selectOption(children.at(-1));
  }
  for(const [label,values] of Object.entries({
   '发证类型':['首次发证','报检','换证','变更'],'是否重点监控':['是','否'],'组织单元':['云南省特检'],'安全阀校验情况':['未检','已检'],
   '检验类别':['年度检验','全面检验','安装监检'],'办理状态':['已报检','检验中','检验已完毕','未检验'],
   '智能化监测装置入网情况':['是','否'],'智能化监测装置运行状态':['在线','离线'],'是否购买责任保险':['是','否']
  }))assert.deepEqual(await options(create.getByLabel(label,{exact:true})),['请选择',...values]);
  const agency=create.getByLabel('检验责任主体机构名称',{exact:true});
  await agency.click();const dialog=page.locator('#dialog');
  assert.equal(await page.locator('#dialog-title').innerText(),'检验单位');
  assert.deepEqual(await dialog.locator('th').allTextContents(),['序号','选择','单位名称','单位地址','统一社会信用代码','地区代码','所在地区','电话','法定代表人','是否启用']);
  await dialog.getByLabel('每页条数',{exact:true}).selectOption('2');
  const first=await dialog.locator('tbody td').nth(2).innerText();
  await dialog.getByRole('button',{name:'下一页',exact:true}).click();assert.notEqual(await dialog.locator('tbody td').nth(2).innerText(),first);
  await dialog.getByLabel('跳至页',{exact:true}).fill('1');await dialog.getByLabel('跳至页',{exact:true}).press('Tab');
  assert.equal(await dialog.locator('tbody td').nth(2).innerText(),first);
  await dialog.getByLabel('所在地区',{exact:true}).selectOption(await page.evaluate(()=>V2InspectionUnits.rows[0].region));
  await dialog.getByLabel('综合查询',{exact:true}).fill('云岚');await dialog.getByRole('button',{name:'查询',exact:true}).click();
  assert.equal(await dialog.locator('tbody tr').count(),1);
  await dialog.getByRole('button',{name:'选择',exact:true}).click();assert.equal(await agency.inputValue(),first);
  await mode.uncheck();assert(await unit.isDisabled());await mode.check();assert.equal(await unit.inputValue(),'虚构新增单位');
  await agency.click();await page.locator('#dialog-close').click();
  await page.setViewportSize({width:390,height:800});assert(await mode.isVisible());
  await create.getByRole('button',{name:'关闭',exact:true}).click();assert.equal(await form.count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS installation query, 20 industry parents / 95 children, editable draft, unit search/region/paging/selection and close');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
