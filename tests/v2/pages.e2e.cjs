const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const playwrightPath = process.env.V2_PLAYWRIGHT || 'playwright';
const { chromium } = require(playwrightPath);
const XLSX = require('../../static/v2/vendor/xlsx.full.min.js');

const exportNames = {
  boiler: '锅炉设备数据导出.xlsx',
  vessel: '压力容器设备数据导出.xlsx',
  elevator: '电梯设备数据导出.xlsx',
  crane: '起重机械设备数据导出.xlsx',
  vehicle: '场（厂）内机动车辆设备数据导出.xlsx',
  amusement: '大型游乐设施设备数据导出.xlsx',
  ropeway: '客运索道设备数据导出.xlsx',
  installation: '压力管道设备数据导出.xlsx',
  pipeline: '压力管道管线数据导出.xlsx',
  'inspection-unit': '检验单位数据导出.xlsx',
  personnel: '检验人员.xlsx',
  'boiler-product': '锅炉产品数据导出.xlsx',
  'vessel-product': '压力容器产品数据导出.xlsx',
  'elevator-product': '电梯产品数据导出.xlsx',
  'crane-product': '起重机械产品数据导出.xlsx',
  'pipe-component': '管道元件产品数据导出.xlsx',
  'pipe-project': '管道工程产品数据导出.xlsx',
};

function readExport(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304');
  const workbook = XLSX.read(bytes, { type: 'buffer', bookFiles: true });
  assert(workbook.files['xl/workbook.xml']);
  assert.equal(workbook.SheetNames.length, 1);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return { sheet, rows: XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) };
}

const output = path.resolve(__dirname, '../../dist-pages');
const prefix = '/special-equipment-v2-demo/';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
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
    async function newPage() {
      const tab = await context.newPage();
      tab.setDefaultTimeout(8000);
      await tab.goto(base);
      return tab;
    }
    let page = await newPage();
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
      if (key === 'elevator') {
        const icon = page.locator('[data-elevator-tool="print"] img');
        const src = await icon.evaluate(img => img.src);
        assert.equal(src, new URL('static/v2/elevator-use-mark.svg', base).href);
        const response = await context.request.get(src);
        assert.equal(response.status(), 200, src);
        assert.match(response.headers()['content-type'], /^image\/svg\+xml\b/, src);
        await icon.evaluate(img => img.decode());
      }
      menu.push([key, await page.title()]);
    }
    console.log('PASS 21 menu pages', base);

    const query = () => page.locator('#query-form button[type=submit]').click();
    const rows = () => page.locator('#main tbody tr[data-id]');
    const toolbar = () => page.locator('#main .table-toolbar');
    const dialog = () => page.locator('#dialog');
    const close = () => page.locator('#dialog-close').click();
    const download = async (control, expectedName) => {
      const url = page.url();
      const [file] = await Promise.all([page.waitForEvent('download'), control.click()]).catch(cause => {
        throw new Error('Download failed for ' + expectedName + ' at ' + url, { cause });
      });
      if (expectedName) assert.equal(file.suggestedFilename(), expectedName);
      return fs.readFileSync(await file.path());
    };

    await open('boiler');
    const exportButton = () => toolbar().getByRole('button', { name: /导出/ });
    await exportButton().click();
    await page.locator('#announcement').filter({ hasText: '请先进行查询' }).waitFor();
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
    const fullBoiler = readExport(await download(exportButton(), exportNames.boiler));
    assert(fullBoiler.rows[0].includes('设备代码'));
    assert.equal(fullBoiler.rows.length, 9);
    const search = page.locator('#query-form [name=search]');
    await search.fill('DEMO-GL-001');
    await query();
    assert.equal(await page.locator('#main .count-total').innerText(), '1');
    assert.equal(readExport(await download(exportButton(), exportNames.boiler)).rows.length, 2);
    await search.fill('DEMO-不存在的设备');
    await query();
    assert.deepEqual(readExport(await download(exportButton(), exportNames.boiler)).rows, [fullBoiler.rows[0]]);

    for (const [key, filename] of Object.entries(exportNames)) {
      // Chromium throttles bursts of downloads in one frame. Give each module
      // a fresh frame while still checking both downloads in the same module session.
      await page.close();
      page = await newPage();
      await open(key);
      await query();
      if (key === 'personnel') {
        // Synthetic identifiers exercise leading zeros and values longer than Excel's number precision.
        await page.evaluate(() => {
          Object.assign(V2.fixtures.personnel[0], {
            identity: '00000000000012345678', phone: '=1+1', mobile: '001234567890',
          });
        });
        await query();
      }
      const total = Number(await page.locator('#main .count-total').innerText());
      assert(total > 0, key);
      const header = await page.locator('#main th[data-field] button').evaluateAll(buttons =>
        buttons.map(button => button.getAttribute('aria-label').slice('按'.length, -'排序'.length)));
      const columns = await page.evaluate(key => V2.types[key].columns, key);
      assert.deepEqual(header, columns.map(c => c.label), key);
      const visibleIds = await rows().evaluateAll(lines => lines.map(line => line.dataset.id));
      const values = await page.evaluate(({ key, visibleIds }) => {
        return visibleIds.map(id => {
          const row = V2.fixtures[key].find(r => r.id === id);
          return V2.types[key].columns.map(c => row[c.key] ?? '');
        });
      }, { key, visibleIds });
      const exported = readExport(await download(exportButton(), filename));
      assert.deepEqual(exported.rows[0], ['序号', '操作', ...header], key);
      assert.equal(exported.rows.length, total + 1, key);
      for (const [i, row] of values.entries()) {
        const record = exported.rows[i + 1];
        assert.equal(record[0], String(i + 1), key);
        for (const [j, value] of row.entries()) {
          const cell = exported.sheet[XLSX.utils.encode_cell({ r: i + 1, c: j + 2 })];
          if (typeof value === 'number') assert.equal(cell.v, value, columns[j].label);
          else assert.equal(record[j + 2], String(value), columns[j].label);
          if (typeof value === 'string' && (/^0\d+$/.test(value) || /^[=+@-]/.test(value))) {
            assert.equal(cell.t, 's', columns[j].label);
            assert.equal(cell.f, undefined, columns[j].label);
          }
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(value)) {
            assert.equal(cell.t, 'n', columns[j].label);
          }
        }
      }
      await rows().first().locator('input[type=checkbox]').check();
      const selected = readExport(await download(exportButton(), filename));
      const exportsSelection = !key.endsWith('-product') && !['inspection-unit', 'personnel', 'pipe-component', 'pipe-project'].includes(key);
      assert.deepEqual(selected.rows, exportsSelection ? exported.rows.slice(0, 2) : exported.rows, key);
      assert.equal(await page.locator('#main .count-selected').innerText(), '1', key);
    }
    console.log('PASS XLSX names, column order, typed cells, row mapping and selection for 17 modules', base);

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
      const csv = await download(dialog().getByRole('button', { name: '导出', exact: true }), 'DEMO Pages ' + key + '-虚构样本.csv');
      assert.match(csv.toString('utf8'), /^\uFEFF"/);
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
    console.log('PASS filters, paging, dialog, copy, XLSX, query lists and print', base);
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
      console.log('Chromium ' + browser.version() + ' on ' + process.platform);
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
