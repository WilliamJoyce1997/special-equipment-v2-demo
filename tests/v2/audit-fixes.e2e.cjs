const assert = require('node:assert/strict');
const fs = require('node:fs');
const { after, before, test } = require('node:test');
const { chromium } = require(process.env.V2_PLAYWRIGHT || 'playwright');
const XLSX = require('../../static/v2/vendor/xlsx.full.min.js');

const base = 'http://127.0.0.1:8020/';
let browser;
before(async () => {
  browser = await chromium.launch(process.env.V2_CHROME_CHANNEL ? { channel: process.env.V2_CHROME_CHANNEL } : {});
});
after(async () => { await browser?.close(); });

async function withPage(run) {
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await run(page);
  } finally {
    await context.close();
  }
}

for (const [type, category, nature] of [
  ['elevator', '演示检验记录', '定期检验（模拟）'],
  ['crane', '定期检验', '正常检验']
]) {
  test(`F3 ${type}: read-only inspection detail preserves historical values on reopen`, () => withPage(async page => {
    await page.goto(base + '#' + type);
    await page.locator('#query-form button[type=submit]').click();
    const row = page.locator('.table-panel tbody tr[data-id]').first();
    await row.getByRole('button', { name: '更多>>', exact: true }).click();
    await page.getByRole('menuitem', { name: '检验信息', exact: true }).click();
    const history = page.locator('#dialog [data-table=completed] tbody tr').first();
    const original = await history.innerText();
    const fields = await history.evaluate(row => ({
      category: row.cells[3].textContent,
      conclusion: row.cells[4].textContent,
      date: row.cells[5].textContent,
      next: row.cells[6].textContent,
      agency: row.cells[7].textContent,
      nature: row.cells[9].textContent,
      report: row.cells[10].textContent
    }));
    assert.equal(fields.category, category);
    if (nature) assert.equal(fields.nature, nature);
    const inDictionary = await page.evaluate(({ type, category }) =>
      V2EquipmentSchema.optionsFor(type, { key: '检验类别', label: '检验类别' }).includes(category),
    { type, category });
    assert.equal(inDictionary, type === 'crane');
    const detail = page.locator('dialog.inspection-record-dialog[open]');
    for (let attempt = 0; attempt < 2; attempt++) {
      await history.getByRole('button', { name: '详情', exact: true }).click();
      for (const [label, key] of [
        ['检验类别', 'category'], ['检验性质', 'nature'], ['设备检验结论', 'conclusion'],
        ['检验日期', 'date'], ['下次检验日期', 'next'], ['检验机构', 'agency'], ['检验报告编号', 'report']
      ]) {
        assert.equal(await detail.getByLabel(label, { exact: true }).inputValue(), fields[key] === '—' ? '' : fields[key], label);
      }
      assert.equal(await detail.locator('select:enabled').count(), 0);
      await detail.getByRole('button', { name: '取消', exact: true }).click();
      assert.equal(await history.innerText(), original);
    }
  }));
}

for (const type of ['boiler', 'vessel', 'elevator', 'crane', 'vehicle', 'amusement', 'ropeway']) {
  test(`F2 ${type}: leaving advanced search applies visible criteria and clears advanced-only state`, () => withPage(async page => {
    await page.goto(base + '#' + type);
    const form = page.locator('#query-form');
    const table = page.locator('.table-panel');
    const total = () => table.locator('.count-total').innerText();
    const rows = table.locator('tbody tr[data-id]');
    const submit = () => form.locator('button[type=submit]').click();
    const expand = () => form.getByRole('button', { name: /高级查询/ }).click();
    const collapse = () => form.getByRole('button', { name: /普通查询/ }).click();
    const search = form.locator('input[name="search"]');
    const code = form.locator('.boiler-advanced input[name="equipmentCode"]');

    await expand();
    await collapse();
    assert.equal(await total(), '0', 'switching alone keeps the initial empty state');
    await submit();
    assert.equal(await total(), '8');
    const first = await rows.first().getAttribute('data-id');
    const codes = await page.evaluate(type => V2.fixtures[type].map(row => row.equipmentCode), type);
    if (type === 'boiler') assert.equal(codes[0], 'DEMO-GL-001');

    await expand();
    await code.fill(codes[0]);
    await submit();
    assert.equal(await total(), '1');
    assert.equal(await rows.first().getAttribute('data-id'), first);
    await rows.first().getByRole('checkbox').check();
    await code.fill(codes[2]);
    await collapse();
    assert.equal(await total(), '8', 'hidden equipment code must not filter normal results');
    assert.equal(await table.locator('.count-selected').innerText(), '0');
    await expand();
    assert.equal(await code.inputValue(), '');
    assert.equal(await total(), '8');

    // A visible draft takes effect on collapse after an earlier submitted query.
    await search.fill(codes[1]);
    await collapse();
    assert.equal(await search.inputValue(), codes[1]);
    assert.equal(await total(), '1');
    assert.match(await rows.first().innerText(), new RegExp(codes[1]));

    if (type === 'elevator') {
      await search.fill('');
      await expand();
      const baseAge = form.locator(':scope > .query-grid [name="age_min"]');
      const advancedAge = form.locator('.boiler-advanced [name="age_min"]');
      const ages = await page.evaluate(() => V2.fixtures.elevator.map(row => ({ id: row.id, age: row.age })));
      const threshold = Math.max(...ages.map(row => row.age));
      await advancedAge.pressSequentially('1e');
      assert(await advancedAge.evaluate(input => input.validity.badInput));
      await collapse();
      assert(await advancedAge.isVisible(), 'invalid advanced copy of a shared field must not discard the ordinary bound');
      assert.equal(await total(), '1');
      await advancedAge.fill(String(threshold));
      assert.equal(await baseAge.inputValue(), String(threshold));
      await collapse();
      assert.equal(await baseAge.inputValue(), String(threshold));
      assert.deepEqual(await rows.evaluateAll(items => items.map(row => row.dataset.id)),
        ages.filter(row => row.age >= threshold).map(row => row.id));
    }

    if (type === 'boiler') {
      await expand();
      const minimum = form.getByLabel('额定蒸发量（t/h）下限', { exact: true });
      const maximum = form.getByLabel('额定蒸发量（t/h）上限', { exact: true });
      await minimum.pressSequentially('1e');
      assert(await minimum.evaluate(input => input.validity.badInput));
      await collapse();
      assert(await code.isVisible(), 'an incomplete numeric value must not become an empty filter');
      assert.equal(await total(), '1');
      await minimum.fill('10');
      await maximum.fill('1');
      await collapse();
      assert(await code.isVisible(), 'invalid ordinary range keeps the current mode available for correction');
      assert.match(await form.getByRole('alert').innerText(), /下限.*上限/);
      assert.equal(await total(), '1');
      await minimum.fill('');
      await maximum.fill('');
      await collapse();
      await search.fill('');
      await submit();
      const sort = table.getByRole('button', { name: '按设备代码排序', exact: true });
      await sort.click();
      await sort.click();
      await table.getByLabel('锅炉设备列表每页条数', { exact: true }).selectOption('2');
      await table.getByRole('button', { name: '锅炉设备列表下一页', exact: true }).click();
      assert.equal(await rows.count(), 2);
      await rows.first().getByRole('checkbox').check();
      await expand();
      await collapse();
      assert.equal(await table.locator('.count-selected').innerText(), '0');
      assert.match(await rows.first().innerText(), /DEMO-GL-008/);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        table.getByRole('button', { name: '导出', exact: true }).click()
      ]);
      assert.equal(download.suggestedFilename(), '锅炉设备数据导出.xlsx');
      const workbook = XLSX.read(fs.readFileSync(await download.path()));
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      assert.deepEqual(sheet.map(row => row['设备代码']).sort(), [...codes].sort());
    }
    await form.getByRole('button', { name: /重置/ }).click();
    assert.equal(await total(), '0');
    assert.equal(await search.inputValue(), '');
  }));
}

for (const [type, advancedKey] of [['installation', 'equipmentCode'], ['pipeline', 'registrationCode']]) {
  test(`F2 compatibility ${type}: ordinary mode keeps its existing filter behavior`, () => withPage(async page => {
    await page.goto(base + '#' + type);
    const form = page.locator('#query-form');
    const total = () => page.locator('.table-panel .count-total').innerText();
    await form.locator('button[type=submit]').click();
    const before = await total();
    assert.equal(before, '8');
    await form.getByRole('button', { name: /高级查询/ }).click();
    const field = form.locator(`.boiler-advanced [name="${advancedKey}"]`);
    await field.fill('DEMO-NO-MATCH-AUDIT');
    await form.locator('button[type=submit]').click();
    assert.equal(await total(), '0');
    await form.getByRole('button', { name: /普通查询/ }).click();
    assert.equal(await total(), before);
    await form.getByRole('button', { name: /高级查询/ }).click();
    assert.equal(await field.inputValue(), '');
  }));
}
