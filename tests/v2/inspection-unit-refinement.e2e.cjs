const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6500);
  const form=()=>page.locator('#query-form'),dialog=()=>page.locator('#dialog'),child=()=>page.locator('.qualification-info-dialog');
  const query=()=>form().locator('button[type=submit]').click(),reset=()=>form().getByRole('button',{name:/重置/}).click();
  const total=()=>page.locator('#main .count-total').innerText(),row=id=>page.locator('#main tbody tr[data-id="'+id+'"]');
  const close=()=>page.locator('#dialog-close').click(),options=control=>control.locator('option').allTextContents();
  async function load(){await page.goto('http://127.0.0.1:8020/#inspection-unit');await query();}
  async function qualifications(id){
   await row(id).getByRole('button',{name:'更多>>',exact:true}).click();
   await page.getByRole('menuitem',{name:'资质',exact:true}).click();
  }
  const qtotal=()=>dialog().locator('.count-total').innerText();
  async function add(certificate,kind='检验人员',detail=false){
   await dialog().getByRole('button',{name:'新增',exact:true}).click();
   await child().getByRole('button',{name:'保存',exact:true}).click();
   assert.match(await child().locator('.form-error').innerText(),/申请类别/);
   for(const [label,value]of Object.entries({'申请类别':'首次','核准项目种类':kind,'核准证状态':'有效'}))await child().getByLabel(label,{exact:true}).selectOption(value);
   for(const [label,value]of Object.entries({'证书编号':certificate,'审批机关':'虚构审批机关','发证机关':'虚构发证机关','发证日期':'2026-01-01','有效期至':'2027-01-01'}))await child().getByLabel(label,{exact:true}).fill(value);
   if(detail){
    await child().getByRole('button',{name:'新增许可项目明细'}).click();
    for(const [key,value]of Object.entries({category:'虚构类别',level:'虚构级别',variety:'虚构品种'}))await child().getByLabel('许可项目1 '+key,{exact:true}).fill(value);
   }
   await child().getByRole('button',{name:'保存',exact:true}).click();
   assert.equal(await child().count(),0);
  }
  await load();assert.equal(await total(),'4');
  await form().getByLabel('所在地区省级',{exact:true}).selectOption('53');
  await form().getByLabel('所在地区市区县',{exact:true}).selectOption('5301');await query();assert.equal(await total(),'2');
  await reset();assert.equal(await total(),'0');
  assert.deepEqual(await options(form().locator('[name=overdue]')),['请选择','是','否']);
  await form().locator('[name=overdue]').selectOption('是');await query();assert.equal(await total(),'2');
  await reset();await query();
  const A='DEMO-ORG-001',B='DEMO-ORG-002',originalName=await page.evaluate(()=>V2InspectionUnits.rows[0].name);
  await row(A).getByRole('button',{name:'编辑',exact:true}).click();
  await dialog().getByLabel('单位名称',{exact:true}).fill('未保存名称');
  await dialog().getByRole('button',{name:'关闭',exact:true}).click();
  await row(A).getByRole('button',{name:'编辑',exact:true}).click();
  assert.equal(await dialog().getByLabel('单位名称',{exact:true}).inputValue(),originalName);
  for(const [label,values]of Object.entries({
   '技术负责人职称':['高级','中级','初级','会计员','经济师','未评定'],
   '经济类型':['内资','港澳台资','国外投资','个体经营','其他'],
   '检验检测机构类型':['专管','兼管'],'隶属关系':['独立','派出'],
   '单位性质':['企业单位','事业单位','行政机关','社会团体','其他'],
   '单位级别':['国家级','省级','地市级','区县级','乡镇级'],'状态':['正常','停产/停业','注销','无效']
  }))assert.deepEqual(await options(dialog().getByLabel(label,{exact:true})),['请选择',...values]);
  assert.equal(await dialog().getByLabel('所在地区省级',{exact:true}).inputValue(),'53');
  await dialog().getByLabel('所在地区市区县',{exact:true}).selectOption('5303');
  await dialog().getByLabel('所属行业一级',{exact:true}).selectOption('制造业');
  assert.equal(await dialog().getByLabel('所属行业二级',{exact:true}).locator('option').count(),31);
  await dialog().getByLabel('所属行业二级',{exact:true}).selectOption('食品制造业');
  await dialog().getByLabel('技术负责人职称',{exact:true}).selectOption('高级');
  await dialog().getByLabel('状态',{exact:true}).selectOption('正常');
  await dialog().getByRole('button',{name:'保存',exact:true}).click();
  await page.reload();await query();
  await row(A).getByRole('button',{name:'编辑',exact:true}).click();
  assert.equal(await dialog().getByLabel('所在地区市区县',{exact:true}).inputValue(),'5303');
  assert.equal(await dialog().getByLabel('所属行业二级',{exact:true}).inputValue(),'食品制造业');
  assert.equal(await dialog().getByLabel('技术负责人职称',{exact:true}).inputValue(),'高级');await close();
  await form().getByRole('button',{name:/高级查询/}).click();
  assert.equal(await form().locator('.boiler-advanced .field').count(),8);
  assert(await form().locator('[name=projectCategory]').isDisabled());assert(await form().locator('[name=projectLevel]').isDisabled());
  await form().locator('[name=level]').selectOption('省级');await form().locator('[name=inspectionInstitutionType]').selectOption('专管');await query();
  assert.equal(await total(),'2');await reset();await form().getByRole('button',{name:/普通查询/}).click();await query();

  await qualifications(A);
  await dialog().getByRole('button',{name:'新增',exact:true}).click();
  await child().getByLabel('证书编号',{exact:true}).fill('DEMO-CANCEL');
  await child().getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await qtotal(),'0');
  await dialog().getByRole('button',{name:'删除',exact:true}).click();
  assert.match(await dialog().locator('p.form-error').innerText(),/先选择/);
  await add('DEMO-A1','检验人员',true);await add('DEMO-A2','无损检验人员');
  assert.equal(await qtotal(),'2');await close();
  await qualifications(B);await add('DEMO-B1');assert.equal(await qtotal(),'1');await close();
  await page.reload();await query();await qualifications(A);assert.equal(await qtotal(),'2');
  await dialog().getByLabel('资质记录选择第1条',{exact:true}).check();
  await dialog().getByRole('button',{name:'删除',exact:true}).click();await child().getByRole('button',{name:'取消',exact:true}).click();assert.equal(await qtotal(),'2');
  await dialog().getByRole('button',{name:'删除',exact:true}).click();await child().getByRole('button',{name:'确认删除',exact:true}).click();assert.equal(await qtotal(),'1');await close();
  await page.reload();await query();await qualifications(A);assert.equal(await qtotal(),'1');
  await add('DEMO-A3');await dialog().getByLabel('资质记录选择本页全部',{exact:true}).check();
  await dialog().getByRole('button',{name:'删除',exact:true}).click();await child().getByRole('button',{name:'确认删除',exact:true}).click();assert.equal(await qtotal(),'0');await close();
  await qualifications(B);assert.equal(await qtotal(),'1');await close();
  await page.reload();await query();await qualifications(A);assert.equal(await qtotal(),'0');await close();
  await form().getByRole('button',{name:/高级查询/}).click();await form().locator('[name=projectKind]').selectOption('检验人员');await query();assert.equal(await total(),'1');
  await reset();await form().getByRole('button',{name:/普通查询/}).click();await query();
  await page.locator('.table-toolbar').getByRole('button',{name:'删除',exact:true}).click();assert.match(await page.locator('#announcement').innerText(),/先选择/);
  await page.getByLabel('每页条数',{exact:true}).selectOption('2');await page.getByRole('button',{name:'下一页',exact:true}).click();
  await page.getByLabel('选择本页全部设备',{exact:true}).check();
  await page.locator('.table-toolbar').getByRole('button',{name:'删除',exact:true}).click();await dialog().getByRole('button',{name:'取消',exact:true}).click();assert.equal(await total(),'4');
  await page.locator('.table-toolbar').getByRole('button',{name:'删除',exact:true}).click();await dialog().getByRole('button',{name:'确认删除',exact:true}).click();
  assert.equal(await total(),'2');assert.equal(await page.locator('#main .count-selected').innerText(),'0');
  assert(await page.getByRole('button',{name:'上一页',exact:true}).isDisabled());
  await page.reload();await query();assert.equal(await total(),'2');
  await row(A).locator('input[type=checkbox]').check();await page.locator('.table-toolbar').getByRole('button',{name:'删除',exact:true}).click();
  await dialog().getByRole('button',{name:'确认删除',exact:true}).click();await page.reload();await query();assert.equal(await total(),'1');
  await qualifications(B);assert.equal(await qtotal(),'1');await close();
  const beforeFailure=await page.evaluate(()=>V2InspectionUnits.rows[0].name);
  await row(B).getByRole('button',{name:'编辑',exact:true}).click();
  await dialog().getByLabel('单位名称',{exact:true}).fill('模拟保存失败');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===V2InspectionUnits.storageKey)throw Error('test quota');return original.call(this,key,value);};});
  await dialog().getByRole('button',{name:'保存',exact:true}).click();
  assert.match(await dialog().locator('.form-error').innerText(),/保存失败/);
  assert.equal(await page.evaluate(()=>V2InspectionUnits.rows[0].name),beforeFailure);
  await close();await page.reload();await query();
  assert.equal(await page.evaluate(()=>V2InspectionUnits.rows[0].name),beforeFailure);
  assert.deepEqual(errors,[]);
  console.log('PASS organization shared region/industry, edit/cancel/reload, qualification A2/B1 isolation, detail rows, single/multi persistent deletion and page clamping');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
