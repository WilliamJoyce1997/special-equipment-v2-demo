/** Real browser interactions. Explicitly refuses the original :8000 service. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
let pw;try{pw=require("playwright");}catch{pw=require(path.join(process.env.APPDATA,"npm/node_modules/@playwright/cli/node_modules/playwright"));}
const base=process.env.CMMS_E2E_BASE_URL||"http://127.0.0.1:8010",url=new URL(base);
assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"8010");
const accounts=JSON.parse(fs.readFileSync(".local/demo-accounts.json","utf8"));
const stamp=Date.now().toString(),code="DEMO-SE-E2E-"+stamp,name="虚构E2E电梯 "+stamp,plan="E2E维护-"+stamp;
const results=[],errors=[];let browser,page;
function step(name){results.push({step:name,time:new Date().toISOString()});console.log("E2E "+name);}
async function login(user){
    await page.goto(base+"/api/demo-info/");await page.evaluate(()=>localStorage.clear());await page.goto(base+"/static/login.html");
    await page.getByLabel("用户名",{exact:true}).fill(accounts[user].username);await page.getByLabel("密码",{exact:true}).fill(accounts[user].password);
    await page.getByRole("button",{name:"登录",exact:true}).click();await page.waitForURL("**/static/index.html");
    await page.waitForFunction(()=>typeof UI!=="undefined"&&UI.user&&document.querySelector("#page-dashboard table"));
}
async function nav(label){
    const button=page.getByRole("button",{name:"展开导航",exact:true});
    if(await button.isVisible())await button.click();
    await page.locator(".nav-item").filter({hasText:label}).click();
    await page.waitForFunction(()=>!document.querySelector(".page-container.active")?.innerText.includes("正在读取数据"));
}
async function fill(label,value){await page.getByLabel(label,{exact:true}).fill(String(value));}
async function select(label,value){await page.getByLabel(label,{exact:true}).selectOption({label:value});}
async function save(label="保存"){await page.locator("#businessForm").getByRole("button",{name:label,exact:true}).click();await page.waitForSelector("#businessModal",{state:"detached"});}
async function rowAction(text,button){await page.getByRole("row").filter({hasText:text}).getByRole("button",{name:button,exact:true}).click();}
async function state(button){await page.getByRole("button",{name:button,exact:true}).click();await fill("操作原因与模拟确认说明 *","仅虚构业务确认，无真实准用效力");await save("提交确认");}
async function taskAction(button){await page.getByRole("button",{name:button,exact:true}).click();}
async function workFlow(user,summary){
    await login(user);await nav("工单管理");await rowAction(summary,"详情");
    await taskAction("接单");await taskAction("开始 / 维修进场");await taskAction("处理过程");await fill("处理过程记录 *","模拟检查、进场及过程记录");await save();
    await taskAction("完工反馈");await fill("处理措施 *","模拟紧固与复查完成");await fill("工时","1.5");await save();
}
(async()=>{
 try{
    browser=await pw.chromium.launch({channel:"chrome",headless:true});
    page=await browser.newPage({viewport:{width:1366,height:900}});
    page.on("pageerror",e=>errors.push(e.message));
    const check=await page.request.get(base+"/api/demo-info/");assert.equal(check.status(),200);assert.equal((await check.json()).isolated_demo,true);
    await login("demo_manager");step("login and isolated database preflight");
    await nav("设备台账");await taskAction("新增设备");
    await fill("设备编号 *",code);await fill("设备名称 *",name);await select("设备负责人 *","演示使用单位主管");
    await fill("规格型号","DEMO-LIFT-E2E");await fill("规格说明","虚构参数，仅演示");await fill("安装位置","虚构园区E2E栋");
    await fill("备注",'<img src=x onerror="window.__xss=true">');
    const next=new Date(Date.now()+10*86400000).toISOString().slice(0,10);await fill("下次模拟检验日期",next);await save();
    await rowAction(code,"详情");assert.equal(await page.evaluate(()=>window.__xss),undefined);
    await state("申请模拟准入");await state("确认模拟投入使用");step("asset creation, escaped content, controlled simulated admission");
    for(const [org,kind] of [["演示恒护维护单位C","维护"],["演示迅修维修单位D","维修"]]){
        await taskAction("服务单位授权");await select("服务单位 *",org);await select("服务种类 *",kind);await save();
    }
    await nav("保养计划");await taskAction("新增计划");await fill("计划编码 *","E2E-PM-"+stamp);await fill("计划名称 *",plan);await select("设备 *",code+" · "+name);
    await select("默认维护单位","演示恒护维护单位C");await select("默认执行人","演示维护员");await fill("维护项目与说明","虚构日常维护");await save();
    await rowAction(plan,"生成工单");await page.getByRole("heading",{name:/工单详情/}).waitFor();
    const pmcode=await page.evaluate(()=>WorkOrders.selected.wo_code);
    await workFlow("demo_maintenance",pmcode);
    await login("demo_manager");await nav("工单管理");await rowAction(pmcode,"详情");await taskAction("使用单位确认关闭");step("PM generation, provider acceptance, process, completion and owner confirmation");
    await nav("设备台账");await rowAction(code,"详情");await state("申请模拟准入");await state("确认模拟投入使用");
    for(const label of ["正常日检","异常复查"]){
        await nav("点检记录");await taskAction("点检计划");await taskAction("新建点检计划");await fill("计划编码 *","E2E-"+label+"-"+stamp);await fill("点检计划名称 *",label+"-"+stamp);
        await select("设备 *",code+" · "+name);await select("点检模板 *","电梯日常观察Demo");await select("执行人员 *","演示点检员");await save();
        await rowAction(label+"-"+stamp,"生成当日任务");
    }
    await login("demo_operator");await nav("点检记录");await rowAction("正常日检-"+stamp,"执行点检");await save("提交点检");
    await nav("点检记录");await taskAction("点检任务");await rowAction("异常复查-"+stamp,"执行点检");await page.locator("#f-result_0").selectOption("abnormal");await page.locator("#f-note_0").fill("虚构门区异响");await save("提交点检");
    const recordId=await page.locator("#page-inspections h3").first().textContent();const rid=Number(recordId.match(/#(\d+)/)[1]);
    await taskAction("上报维修");await taskAction("查看关联工单");await page.getByRole("heading",{name:/工单详情/}).waitFor();
    const cmcode=await page.evaluate(()=>WorkOrders.selected.wo_code);step("two actual inspections and linked abnormal repair");
    await login("demo_manager");await nav("工单管理");await rowAction(cmcode,"详情");await taskAction("分配任务");await select("受托单位 *","演示迅修维修单位D");await select("执行人 *","演示维修员");await save();
    await workFlow("demo_repair",cmcode);
    await login("demo_manager");await nav("工单管理");await rowAction(cmcode,"详情");await taskAction("使用单位确认关闭");
    await nav("点检记录");await taskAction("执行记录");
    // Record ID is stable; this is a read-only navigation helper, not a business mutation.
    await page.getByRole("row").filter({hasText:name}).filter({hasText:"异常"}).getByRole("button",{name:"记录详情",exact:true}).click();await taskAction("复核已解决");await fill("复查依据 *","维修已关闭，模拟复查门区恢复正常");await save();
    await nav("设备台账");await rowAction(code,"详情");await state("申请模拟准入");await state("确认模拟投入使用");await taskAction("生命周期");
    await page.waitForSelector(".lifecycle-timeline li");assert.ok((await page.locator(".lifecycle-timeline li").count())>=12);
    await page.screenshot({path:".local/e2e-lifecycle.png",fullPage:true});step("CM full flow, independent issue verification and simulated release, lifecycle");
    await nav("报表统计");await select("设备",code+" · "+name);await taskAction("刷新统计");
    await page.waitForFunction(()=>Reports.snapshot?.assets.total===1&&Reports.snapshot?.inspections.total===2);
    const stats=await page.evaluate(()=>Reports.snapshot);assert.equal(stats.inspections.completed,2);assert.equal(stats.inspections.abnormal_records,1);assert.equal(stats.workorders.completed,1);assert.equal(stats.workorders.pending,0);
    await page.screenshot({path:".local/e2e-reports-1366.png",fullPage:true});step("data-driven report and metrics assertions");
    await nav("备件管理");await taskAction("新增备件");await fill("备件编码 *","DEMO-E2E-PART-"+stamp);await fill("备件名称 *","虚构E2E门轮-"+stamp);await save();
    await rowAction("虚构E2E门轮-"+stamp,"入库");await fill("数量 *","5");await save();
    await rowAction("虚构E2E门轮-"+stamp,"出库");await fill("数量 *","2");await save();
    await rowAction("虚构E2E门轮-"+stamp,"流水");await page.waitForSelector("#businessModal tbody tr");assert.ok((await page.locator("#businessModal tbody tr").count())===2);await save("关闭");step("inventory in/out and transaction history");
    for(const width of [1920,1366,768,390]){
        await page.setViewportSize({width,height:900});await nav("报表统计");
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"page overflow "+width);
        await page.screenshot({path:".local/e2e-reports-"+width+".png",fullPage:true});
    }
    for(const label of ["工作台","设备台账","工单管理","保养计划","点检记录","备件管理","报表统计"])await nav(label);
    step("four responsive sizes and all seven mobile navigation entries");
    await login("demo_other");await nav("设备台账");assert.equal(await page.getByText(code,{exact:true}).count(),0);step("different unit cannot view sample asset");
    assert.deepEqual(errors,[]);
    fs.writeFileSync(".local/e2e-result.json",JSON.stringify({passed:true,asset_code:code,cmcode,pmcode,record:rid,steps:results,page_errors:errors,stats},null,2));console.log("E2E PASS "+results.length+" checkpoints");
 }catch(error){fs.writeFileSync(".local/e2e-result.json",JSON.stringify({passed:false,steps:results,error:String(error),page_errors:errors},null,2));if(page)await page.screenshot({path:".local/e2e-failure.png",fullPage:true}).catch(()=>{});console.error(error.stack);process.exitCode=1;}
 finally{await browser?.close();}
})();
