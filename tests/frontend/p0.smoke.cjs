/** Bounded final read-only browser checks; uses the last fictional E2E specimen. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {chromium}=require(path.join(process.env.APPDATA,"npm/node_modules/@playwright/cli/node_modules/playwright"));
const accounts=JSON.parse(fs.readFileSync(".local/demo-accounts.json","utf8")),fixture=JSON.parse(fs.readFileSync(".local/browser-fixture.json","utf8"));
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],checks=[];
 page.on("pageerror",e=>errors.push(e.message));
 async function login(user){
  await page.goto("http://127.0.0.1:8010/api/demo-info/");await page.evaluate(()=>localStorage.clear());
  await page.goto("http://127.0.0.1:8010/static/login.html");
  await page.getByLabel("用户名",{exact:true}).fill(accounts[user].username);await page.getByLabel("密码",{exact:true}).fill(accounts[user].password);await page.getByRole("button",{name:"登录",exact:true}).click();
  await page.waitForURL("**/static/index.html");await page.waitForSelector("#page-dashboard table");
 }
 async function nav(label){
  const toggle=page.getByRole("button",{name:"展开导航",exact:true});if(await toggle.isVisible())await toggle.click();
  await page.locator(".nav-item").filter({hasText:label}).click();
  await page.waitForFunction(()=>!document.querySelector(".page-container.active")?.innerText.includes("正在读取数据"));
  assert.equal(await page.locator(".page-container.active").getByText("加载失败",{exact:true}).count(),0);
 }
 try{
  await login("demo_manager");
  for(const label of ["工作台","设备台账","工单管理","保养计划","点检记录","备件管理","报表统计"]){await nav(label);checks.push(label);}
  await nav("设备台账");await page.getByRole("row").filter({hasText:fixture.asset.code}).getByRole("button",{name:"详情",exact:true}).click();
  await page.getByRole("button",{name:"生命周期",exact:true}).click();await page.waitForSelector(".lifecycle-timeline li");
  assert.ok(await page.locator(".lifecycle-timeline li").count()>=12);await page.screenshot({path:".local/final-lifecycle.png",fullPage:true});checks.push("lifecycle timeline");
  await nav("报表统计");await page.getByLabel("设备",{exact:true}).selectOption({label:fixture.asset.code+" · "+fixture.asset.name});await page.getByRole("button",{name:"刷新统计",exact:true}).click();
  await page.waitForFunction(()=>Reports.snapshot.assets.total===1&&Reports.snapshot.inspections.total===2);
  const stats=await page.evaluate(()=>Reports.snapshot);
  assert.equal(stats.inspections.completed,2);assert.equal(stats.inspections.abnormal_records,1);assert.equal(stats.workorders.completed,1);assert.equal(stats.workorders.pending,0);checks.push("actual persisted report: 2/2 checks,1 abnormal,1 repaired");
  await nav("备件管理");await page.getByRole("row").filter({hasText:fixture.part.part_code}).getByRole("button",{name:"流水",exact:true}).click();
  await page.waitForSelector("#businessModal tbody tr");assert.equal(await page.locator("#businessModal tbody tr").count(),2);await page.locator("#businessForm").getByRole("button",{name:"关闭",exact:true}).last().click();checks.push("inventory transaction modal 2 rows");
  for(const width of [1920,1366,768,390]){
   await page.setViewportSize({width,height:900});await nav("报表统计");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"overflow "+width);
   await page.screenshot({path:".local/final-reports-"+width+".png",fullPage:true});checks.push("responsive "+width);
  }
  for(const label of ["工作台","设备台账","工单管理","保养计划","点检记录","备件管理","报表统计"])await nav(label);
  checks.push("all seven pages at mobile width");
  await login("demo_other");await nav("设备台账");assert.equal(await page.getByText(fixture.asset.code,{exact:true}).count(),0);checks.push("unit boundary");
  assert.deepEqual(errors,[]);
  fs.writeFileSync(".local/final-browser.json",JSON.stringify({passed:true,checks,errors,fixture,stats},null,2));console.log("FINAL BROWSER PASS "+checks.length+" checks");
 }catch(error){
  fs.writeFileSync(".local/final-browser.json",JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));
  await page.screenshot({path:".local/final-browser-failure.png",fullPage:true});console.error(error.stack);process.exitCode=1;
 }finally{await browser.close();}
})();
