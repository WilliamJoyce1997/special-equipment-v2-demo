const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));
const expected = require('./expected-headers.json');
const craneKinds = ['请选择', '定期检验', '监督检验', '制造监督检验', '起重其他委托检验'];

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8020/');
    for (const type of ['boiler', 'vessel', 'elevator', 'crane', 'vehicle', 'amusement', 'ropeway']) {
      await page.locator('#nav [data-page="' + type + '"]').click();
      const headers = await page.locator('.cq-table-card th').allTextContents();
      const labels = headers.slice(1).map(text => text.replace(/ ↕$/, ''));
      assert.deepEqual(labels, expected[type], type);
      await page.locator('.boiler-table-settings').click();
      const settings = await page.locator('#dialog .boiler-setting-name').evaluateAll(cells =>
        cells.map(cell => cell.firstChild.textContent));
      assert.deepEqual(settings, labels.slice(2), type);
      await page.locator('#dialog-close').click();
      console.log('PASS table and settings order: ' + type);
    }

    await page.locator('#nav [data-page="crane"]').click();
    const form = page.locator('#query-form');
    const parent = form.getByLabel('设备类别一级', { exact: true });
    const child = form.getByLabel('设备类别二级', { exact: true });
    assert.equal(await parent.locator('option').count(), 11);
    await parent.selectOption('桥式起重机');
    assert.equal(await child.locator('option').count(), 7);
    await child.selectOption('通用桥式起重机');
    assert.equal(await form.locator('[name=category]').inputValue(), '桥式起重机 / 通用桥式起重机');
    await form.locator('button[type=submit]').click();
    assert(Number(await page.locator('.count-total').innerText()) > 0);
    await parent.selectOption('旧目录起重机');
    assert(!(await child.isVisible()));
    assert.equal(await form.locator('[name=category]').inputValue(), '旧目录起重机');
    await form.getByRole('button', { name: /重置/ }).click();
    assert.deepEqual(await form.locator('[name=place] option').allTextContents(), ['请选择', '化工企业', '冶金企业', '建设工程', '其他']);
    assert.equal(await form.locator('[name=latestInspectionKind] option').count(), 13);
    await form.getByRole('button', { name: /高级查询/ }).click();
    assert.equal(await form.locator('.boiler-advanced .field').count(), 37);
    assert(await form.locator('[name=inspectionConclusion]').isDisabled());
    assert.deepEqual(await form.locator('[name=inspectionKind] option').allTextContents(), craneKinds);
    assert.deepEqual(await form.locator('[name=governorInspection] option').allTextContents(), ['请选择', '已检', '未检']);
    await form.locator('[name=latestInspectionKind]').selectOption('安装监检');
    await form.locator('[name=inspectionKind]').selectOption('监督检验');
    await form.locator('button[type=submit]').click();
    assert.equal(await page.locator('.count-total').innerText(), '4');

    const first = page.locator('.cq-table-card tbody tr[data-id]').first();
    await first.getByRole('button', { name: '精简档案' }).click();
    assert.deepEqual(await page.locator('#dialog').getByLabel('检验类别', { exact: true }).locator('option').allTextContents(), craneKinds);
    await page.locator('#dialog-close').click();
    await first.getByRole('button', { name: '详情', exact: true }).click();
    const dossier = page.locator('.equipment-info');
    assert.equal(await dossier.getByLabel('设备类别一级', { exact: true }).locator('option').count(), 11);
    await dossier.getByRole('tab', { name: '参数信息', exact: true }).click();
    assert.deepEqual(await dossier.getByLabel('设备使用场所', { exact: true }).locator('option').allTextContents(), ['请选择', '化工企业', '冶金企业', '建设工程', '其他']);
    await dossier.getByRole('tab', { name: '设备检验信息', exact: true }).click();
    assert.deepEqual(await dossier.getByLabel('历史检验类别').locator('option').allTextContents(), craneKinds);
    await dossier.locator('.inspection-history-view').getByRole('button', { name: '查询', exact: true }).click();
    await dossier.locator('.inspection-history-view').getByRole('button', { name: '详情', exact: true }).click();
    assert.deepEqual(await page.locator('.inspection-record-dialog').getByLabel('检验类别', { exact: true }).locator('option').allTextContents(), craneKinds);
    assert.deepEqual(errors, []);
    console.log('PASS crane cascade, independent filters, disabled conclusion, dossier and inspection dialog');
    await page.locator('.inspection-record-dialog').getByRole('button', { name: '关闭子弹窗' }).click();
    await page.locator('#nav [data-page="vehicle"]').click();
    const vehicleKinds = ['请选择', '定期检验', '监督检验'];
    await parent.selectOption('机动工业车辆');
    assert.deepEqual(await child.locator('option').allTextContents(), ['请选择', '叉车']);
    await child.selectOption('叉车');
    await form.locator('button[type=submit]').click();
    assert.equal(await page.locator('.count-total').innerText(), '4');
    await parent.selectOption('旧目录厂车');
    assert(!(await child.isVisible()));
    await form.getByRole('button', { name: /重置/ }).click();
    assert.equal(await parent.inputValue(), '');
    assert.deepEqual(await form.locator('[name=place] option').allTextContents(), ['请选择', '公园', '车站', '客运码头', '工厂', '其它']);
    assert.equal(await form.locator('[name=latestInspectionKind] option').count(), 13);
    await form.getByRole('button', { name: /高级查询/ }).click();
    assert.equal(await form.locator('.boiler-advanced .field').count(), 37);
    assert(await form.locator('[name=inspectionConclusion]').isDisabled());
    assert.deepEqual(await form.locator('[name=governorInspection] option').allTextContents(), ['请选择', '是', '否']);
    assert.deepEqual(await form.locator('[name=inspectionKind] option').allTextContents(), vehicleKinds);
    await form.locator('[name=latestInspectionKind]').selectOption('安装监检');
    await form.locator('[name=inspectionKind]').selectOption('监督检验');
    await form.locator('[name=governorInspection]').selectOption('否');
    await form.locator('button[type=submit]').click();
    assert.equal(await page.locator('.count-total').innerText(), '4');
    await form.getByRole('button', { name: /普通查询/ }).click();
    assert.equal(await form.locator('.boiler-advanced').count(), 0);

    await first.getByRole('button', { name: '精简档案' }).click();
    assert.deepEqual(await page.locator('#dialog').getByLabel('检验类别', { exact: true }).locator('option').allTextContents(), vehicleKinds);
    await page.locator('#dialog-close').click();
    await first.getByRole('button', { name: '详情', exact: true }).click();
    assert.equal(await dossier.getByLabel('设备类别一级', { exact: true }).inputValue(), '非公路用旅游观光车辆');
    await dossier.getByRole('tab', { name: '参数信息', exact: true }).click();
    assert.deepEqual(await dossier.getByLabel('设备使用场所', { exact: true }).locator('option').allTextContents(), ['请选择', '公园', '车站', '客运码头', '工厂', '其它']);
    await dossier.getByRole('tab', { name: '设备检验信息', exact: true }).click();
    assert.deepEqual(await dossier.getByLabel('历史检验类别').locator('option').allTextContents(), vehicleKinds);
    await dossier.locator('.inspection-history-view').getByRole('button', { name: '查询', exact: true }).click();
    await dossier.locator('.inspection-history-view').getByRole('button', { name: '详情', exact: true }).click();
    assert.deepEqual(await page.locator('.inspection-record-dialog').getByLabel('检验类别', { exact: true }).locator('option').allTextContents(), vehicleKinds);
    assert.deepEqual(errors, []);
    console.log('PASS vehicle cascade, query/reset, independent filters, dossier and inspection dialog');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
