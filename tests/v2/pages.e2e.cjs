const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwrightPath = process.env.V2_PLAYWRIGHT || 'playwright';
const { chromium } = require(playwrightPath);

const output = path.resolve(__dirname, '../../dist-pages');
const prefix = '/special-equipment-v2-demo/';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
  const file = path.resolve(output, relative || 'index.html');
  if (!file.startsWith(output + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

async function exercise(browser, base, isStatic) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 960 } });
  const problems = [];
  context.on('weberror', error => problems.push(error.error().message));
  context.on('requestfailed', req => problems.push(req.url() + ' ' + req.failure()?.errorText));
  context.on('request', req => {
    if (!['GET', 'HEAD'].includes(req.method()) || !req.url().startsWith(base)) {
      problems.push('Unexpected request: ' + req.method() + ' ' + req.url());
    }
  });
  context.on('response', res => {
    if (res.status() >= 400) problems.push(res.status() + ' ' + res.url());
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    await page.goto(base);
    const nav = key => page.locator('#nav [data-page="' + key + '"]');
    const open = async key => {
      const group = nav(key).locator('xpath=../preceding-sibling::button[1]');
      if (await group.getAttribute('aria-expanded') === 'false') await group.click();
      await nav(key).click();
    };
    const keys = await page.locator('#nav [data-page]').evaluateAll(items => items.map(item => item.dataset.page));
    assert.equal(keys.length, 21);
    assert.equal(new Set(keys).size, 21);
    const menu = [];
    for (const key of keys) {
      await open(key);
      assert.equal(new URL(page.url()).hash, '#' + key);
      assert.equal(await nav(key).getAttribute('aria-current'), 'page');
      assert((await page.locator('#main').innerText()).trim(), key);
      menu.push([key, await page.title()]);
    }
    console.log('PASS 21 menu pages', base);

    const query = () => page.locator('#query-form button[type=submit]').click();
    const rows = () => page.locator('#main tbody tr[data-id]');
    const toolbar = () => page.locator('#main .table-toolbar');
    const dialog = () => page.locator('#dialog');
    const close = () => page.locator('#dialog-close').click();
    const download = async (control, expectedName) => {
      const pending = page.waitForEvent('download');
      await control.click();
      const file = await pending;
      if (expectedName) assert.equal(file.suggestedFilename(), expectedName);
      return fs.readFileSync(await file.path());
    };

    await open('boiler');
    await query();
    const total = await page.locator('#main .count-total').innerText();
    assert.equal(total, '8');
    await page.getByLabel(/每页条数/).selectOption('2');
    const first = await rows().first().getAttribute('data-id');
    await page.getByRole('button', { name: /下一页/ }).click();
    assert.notEqual(await rows().first().getAttribute('data-id'), first);
    await rows().first().getByRole('button', { name: '精简档案' }).click();
    assert(await dialog().isVisible());
    await close();
    assert.match((await download(toolbar().getByRole('button', { name: /导出/ }))).toString('utf8'), /设备代码/);
    const search = page.locator('#query-form [name=search]');
    await search.fill('DEMO-GL-001');
    await query();
    assert.equal(await page.locator('#main .count-total').innerText(), '1');

    await open('safety-valve');
    await query();
    const valveCount = await rows().count();
    assert(valveCount > 0);
    await rows().first().getByRole('button', { name: '复制', exact: true }).click();
    await page.locator('#announcement').filter({ hasText: '复制成功' }).waitFor({ state: 'attached' });
    await toolbar().getByRole('button', { name: '导入', exact: true }).click();
    const template = await download(dialog().getByRole('link', { name: '下载模板' }), '安全阀管理.xlsx');
    assert(template.equals(fs.readFileSync(path.join(output, 'static/v2/templates/safety-valve-import.xlsx'))));
    await close();

    for (const key of ['person-query', 'unit-query', 'equipment-query']) {
      await open(key);
      const main = page.locator('#main');
      await main.getByRole('button', { name: '查询', exact: true }).click();
      assert.equal(await main.locator('.count-total').innerText(), '0', key);
      await main.getByRole('button', { name: /新增/ }).click();
      if (key === 'unit-query') await dialog().getByRole('radio', { name: '检验单位', exact: true }).check();
      await dialog().getByLabel('查询条件名称', { exact: true }).fill('DEMO Pages ' + key);
      await dialog().getByRole('checkbox', { name: /^结果字段 / }).first().check();
      await dialog().getByRole('button', { name: '保存', exact: true }).click();
      await main.getByRole('button', { name: '执行', exact: true }).click();
      assert(Number(await dialog().locator('.count-total').innerText()) > 0, key);
      await close();
    }

    await open('elevator');
    await query();
    await rows().first().locator('input[type=checkbox]').check();
    const popup = page.waitForEvent('popup');
    await toolbar().getByRole('button', { name: '使用标志', exact: true }).click();
    const print = await popup;
    await print.locator('.sheet').waitFor();
    assert.equal(await print.locator('canvas').count(), 1);
    const expectedPrint = isStatic ? base + 'static/v2/elevator-print.html' : base + 'scdrpt/rpt_printCrt.shtml';
    assert.equal(print.url().split('?')[0], expectedPrint);
    assert.deepEqual(problems, []);
    console.log('PASS filters, paging, dialog, CSV, copy, XLSX, query lists and print', base);
    return menu;
  } finally {
    await context.close();
  }
}

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const browser = await chromium.launch(process.env.V2_CHROME_CHANNEL ? { channel: process.env.V2_CHROME_CHANNEL } : {});
    try {
      const root = 'http://127.0.0.1:' + server.address().port + '/';
      const rootMenu = await exercise(browser, root, true);
      assert.deepEqual(await exercise(browser, root + prefix.slice(1), true), rootMenu);
      if (process.env.V2_COMPARE_URL) {
        assert.deepEqual(await exercise(browser, process.env.V2_COMPARE_URL, false), rootMenu);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
