const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.V2_PLAYWRIGHT || path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

const base = 'http://127.0.0.1:8020/';
const domains = ['person','unit','equipment'];
const comparisonLabels = ['等于','不等于','包含','不包含','大于','不大于','小于','不小于'];

async function run() {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const main = page.locator('.cq-plans'), dialog = page.locator('#dialog');
    const rows = dialog.locator('.cq-rules .cq-condition');
    const button = (parent,name) => parent.getByRole('button',{name,exact:true});
    const field = id => dialog.locator('.cq-field-list [data-field-id="'+id+'"]');
    const rule = id => dialog.locator('.cq-rules .cq-condition[data-field-id="'+id+'"]');
    const result = id => dialog.locator('.cq-result-fields [data-field-id="'+id+'"]');
    const checked = id => field(id).getByRole('checkbox');
    const query = () => button(main,'查询').click();
    const open = () => button(main,'新增').click();
    const save = () => button(dialog,'保存').click();
    const close = () => page.locator('#dialog-close').click();
    const scheme = () => main.locator('tbody tr[data-id]');
    const icon = control => control.locator('.v2-action-icon').evaluate(el=>[el.firstElementChild.outerHTML,el.offsetWidth,el.offsetHeight]);
    async function assertEmptyResultSelection() {
      const selectAll = dialog.getByRole('checkbox',{name:'选择全部结果字段',exact:true});
      assert.equal(await selectAll.isChecked(),false);
      assert.equal(await selectAll.evaluate(box=>box.indeterminate),false);
      const fields = dialog.getByRole('checkbox',{name:/^结果字段 /});
      assert(await fields.count()>0);
      assert.equal(await fields.evaluateAll(boxes=>boxes.some(box=>box.checked)),false);
    }

    await page.goto(base+'#safety-valve');
    const reference = await Promise.all(['新增','删除'].map(name=>icon(button(page.locator('.table-toolbar'),name))));
    for (const domain of domains) {
      await page.goto(base+'#'+domain+'-query');
      assert.deepEqual(await Promise.all(['新增','删除'].map(name=>icon(button(main.locator('.table-toolbar'),name)))),reference);
      await open();
      assert.equal(await dialog.locator('h2').innerText(),'新建组合查询条件');
      await assertEmptyResultSelection();
      const [originalType,otherType] = {
        person:['检验人员','无损检验人员'],unit:['监管机构','使用单位'],equipment:['锅炉','电梯']
      }[domain];
      await dialog.getByRole('checkbox',{name:/^结果字段 /}).first().check();
      await dialog.getByRole('radio',{name:otherType,exact:true}).check();
      await assertEmptyResultSelection();
      await dialog.getByRole('radio',{name:originalType,exact:true}).check();
      await assertEmptyResultSelection();
      assert.equal(await dialog.locator('.cq-field-list input:checked').count(),0);
      assert.equal(await dialog.locator('.cq-rules').innerText(),'');
      await save();
      assert.match(await dialog.getByRole('alert').innerText(),/名称/);
      if(domain==='unit')await dialog.getByRole('radio',{name:'检验单位',exact:true}).check();
      const {a,b,c,firstValue,secondValue,expected,defaultField}=await page.evaluate(domain=>{
        const D=V2QueryDictionaries.get(domain,{person:'inspector',unit:'inspection-unit',equipment:'boiler'}[domain]);
        const data=D.rows(D.objectType||{person:'inspector',unit:'inspection-unit',equipment:'boiler'}[domain]);
        const a=D.fieldMap[D.defaultField];
        const b=D.fields.find(f=>f.id!==a.id&&f.type===(domain==='person'?'date':domain==='equipment'?'number':'text')&&data.every(row=>D.value(row,null,f)!==null));
        const c=D.fields.find(f=>![a.id,b.id].includes(f.id));
        const firstValue=String(D.value(data[0],null,a)),secondValue=String(D.value(data[1],null,b));
        const match=data.filter(row=>D.value(row,null,a)===firstValue||String(D.value(row,null,b))===secondValue);
        return {a,b,c,firstValue,secondValue,expected:match.length,defaultField:D.defaultField};
      },domain);
      await checked(a.id).check();
      assert.equal(await rows.count(),1);
      await field(a.id).getByRole('button').click();
      assert.equal(await rows.count(),1);
      const op = id => rule(id).getByLabel('比较操作符',{exact:true});
      const value = f => rule(f.id).getByLabel(f.label+'条件值',{exact:true});
      assert.deepEqual((await op(a.id).locator('option:not(:disabled)').allTextContents()).slice(0,8),comparisonLabels);
      for (const operator of ['ne','contains','notContains','gt','lte','lt','gte','eq'])await op(a.id).selectOption(operator);
      await value(a).fill(firstValue);
      await checked(c.id).check();
      await checked(b.id).check();
      assert.deepEqual(await rows.evaluateAll(es=>es.map(e=>e.dataset.fieldId)),[a.id,c.id,b.id]);
      assert.deepEqual(await rule(b.id).getByLabel('逻辑关系').locator('option').allTextContents(),['并且','或者']);
      await rule(b.id).getByLabel('逻辑关系').selectOption('or');
      await value(b).fill(secondValue);
      await rule(c.id).getByRole('button',{name:/^删除条件 /}).click();
      assert(!(await checked(c.id).isChecked()));
      assert.equal(await value(a).inputValue(),firstValue);
      assert.equal(await value(b).inputValue(),secondValue);
      await checked(a.id).uncheck();
      assert.deepEqual(await rows.evaluateAll(es=>es.map(e=>e.dataset.fieldId)),[b.id]);
      assert.equal(await rule(b.id).getByLabel('逻辑关系').inputValue(),'or');
      await checked(a.id).check();
      await rule(a.id).getByLabel('逻辑关系').selectOption('or');
      await value(a).fill(firstValue);
      for (const [label,words] of [['设置查询条件帮助提示',['A 公司','正常','并且']],['设置查询结果表头帮助提示',['拖动字段','冻结字段']]]) {
        const trigger=button(dialog,label);
        await trigger.hover();
        assert.equal(await trigger.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(40, 138, 240)');
        const tip=trigger.locator('..').getByRole('tooltip');
        for (const word of words)assert((await tip.innerText()).includes(word));
        const box=await tip.boundingBox(),frame=await dialog.boundingBox();
        assert(box.x>=frame.x&&box.x+box.width<=frame.x+frame.width&&box.y+box.height<900);
        await dialog.getByLabel('查询条件名称').hover();
        await tip.waitFor({state:'hidden'});
      }
      await result(defaultField).getByRole('checkbox',{name:/^结果字段 /}).check();
      await result(b.id).getByRole('checkbox',{name:/^结果字段 /}).check();
      await result(b.id).dragTo(result(defaultField));
      await result(b.id).getByLabel(b.label+'文字颜色').fill('#3178c6');
      await result(b.id).getByLabel(b.label+'冻结').check();
      await dialog.getByLabel('查询条件名称').fill('DEMO-联动方案');
      await save();
      await dialog.waitFor({state:'hidden'});
      const stored=await page.evaluate(domain=>JSON.parse(localStorage.getItem(V2QueryPlans.keyFor(domain)))[0],domain);
      assert.deepEqual(stored.conditionFieldIds,[b.id,a.id]);
      assert.deepEqual(stored.expression.children.map(n=>[n.join,n.op,n.value]),[['or','eq',secondValue],['or','eq',firstValue]]);
      assert.deepEqual(stored.resultColumns[0],{fieldId:b.id,color:'#3178c6',frozen:true});
      await button(scheme(),'执行').click();
      assert.equal(Number(await dialog.locator('.count-total').innerText()),expected);
      await close();
      await page.reload();await query();
      await button(scheme(),'编辑').click();
      assert(await checked(a.id).isChecked());
      assert(await checked(b.id).isChecked());
      assert(await result(defaultField).getByRole('checkbox',{name:/^结果字段 /}).isChecked());
      assert(await result(b.id).getByRole('checkbox',{name:/^结果字段 /}).isChecked());
      assert.equal(await dialog.getByRole('checkbox',{name:/^结果字段 /}).evaluateAll(boxes=>boxes.filter(box=>box.checked).length),2);
      assert.equal(await value(a).inputValue(),firstValue);
      assert.equal(await rule(a.id).getByLabel('逻辑关系').inputValue(),'or');
      assert.equal(await result(b.id).getByLabel(b.label+'文字颜色').inputValue(),'#3178c6');
      assert(await result(b.id).getByLabel(b.label+'冻结').isChecked());
      await value(a).fill('DEMO-不保存');
      await button(dialog,'取消').click();
      await button(scheme(),'编辑').click();assert.equal(await value(a).inputValue(),firstValue);
      if(domain==='equipment'){
        await dialog.getByRole('radio',{name:'电梯',exact:true}).check();
        assert.equal(await field(a.id).count(),0);assert.equal(await rows.count(),0);
      }
      await close();
      console.log('PASS',domain,'icons, empty state, bidirectional conditions, typed OR execution, help, drag/color/freeze and refresh');
    }
    assert.deepEqual(await page.evaluate(domains=>domains.map(domain=>JSON.parse(localStorage.getItem(V2QueryPlans.keyFor(domain))).map(p=>p.domain)),domains),domains.map(d=>[d]));
    await page.setViewportSize({width:390,height:680});
    await open();
    for(const [step,title] of [[3,'设置查询条件'],[4,'设置查询结果表头']]){
      await button(dialog,step+'. '+title).click();
      const trigger=button(dialog,title+'帮助提示');
      await trigger.hover();
      const tip=trigger.locator('..').getByRole('tooltip'),box=await tip.boundingBox();
      assert(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=680);
      assert(await tip.evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1));
    }
    await close();
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
