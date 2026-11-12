const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.V2_PLAYWRIGHT || 'playwright');
const XLSX = require('../../static/v2/vendor/xlsx.full.min.js');

const templatePath = 'static/v2/templates/jyryExp.xls';
const prefix = '/special-equipment-v2-demo/';
const output = path.resolve(__dirname, '../../dist-pages');
const headers = ['姓名','身份证号','工作单位','地区代码','性别','职务','电话','学历','毕业学校','所学专业','联系地址','邮政编码','个人电话','手机号码'];
const sample = ['虚构导入人员','DEMO-IMPORT-A','虚构单位','530100','女','虚构职务','01000000','虚构学历','虚构学校','虚构专业','虚构联系地址','001234','02000000','03000000'];

function excel(bookType, rows, head = headers, sheetName = 'Sheet1') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([head, ...rows]), sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType });
}

async function exercise(browser, base) {
  const context = await browser.newContext({ acceptDownloads: true });
  const requests = [], errors = [];
  context.on('request', request => requests.push([request.method(), request.url()]));
  context.on('weberror', error => errors.push(error.error().message));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const dialog = page.locator('#dialog');
  const upload = dialog.getByRole('button', { name: '上传', exact: true });
  const total = page.locator('#main .count-total');
  const query = () => page.locator('#query-form button[type=submit]').click();
  const open = () => page.locator('[data-action="导入"]').click();
  const setFile = (buffer, name) => dialog.getByLabel('选择附件').setInputFiles({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(buffer) });
  const message = async pattern => {
    await dialog.getByText(pattern).first().waitFor();
  };
  try {
    await page.goto(base + '#personnel');
    await open();
    assert.equal(await dialog.locator('h2').innerText(), '人员导入');
    await message('未选择任何文件');
    assert(await upload.isDisabled());
    const pending = page.waitForEvent('download');
    await dialog.getByRole('link', { name: '下载模板' }).click();
    const download = await pending;
    assert.equal(download.suggestedFilename(), 'jyryExp.xls');
    assert(fs.readFileSync(await download.path()).equals(fs.readFileSync(templatePath)));

    const beforeSelection = requests.length;
    await setFile(excel('biff8', [sample, [], sample]), 'duplicate.xls');
    await message(/第 4 行.*重复/);
    assert(await upload.isDisabled());
    await setFile(excel('xlsx', [sample, ['', ...sample.slice(1)]]), 'missing.xlsx');
    await message(/第 3 行.*姓名.*必填/);
    assert(await upload.isDisabled());
    await setFile(excel('xlsx', [sample], [...headers.slice(1), headers[0]]), 'header.xlsx');
    await message(/表头.*顺序/);
    await setFile(excel('xlsx', [sample], headers, 'WrongSheet'), 'sheet.xlsx');
    await message(/工作表.*Sheet1/);
    await setFile(Buffer.from([0x50,0x4b,3,4,0,0]), 'broken.xlsx');
    await message(/无法解析/);
    await setFile(excel('xlsx', [sample]), 'wrong.xls');
    await message(/内容与扩展名不一致/);
    const dateRow = [...sample];
    dateRow[6] = { t: 'n', v: -1, z: 'yyyy-mm-dd' };
    await setFile(excel('xlsx', [dateRow]), 'date.xlsx');
    await message(/第 2 行.*电话.*日期格式/);
    assert(await upload.isDisabled());
    await setFile(excel('biff8', [[], sample]), 'cancel.xls');
    await message(/有效 1 行/);
    await dialog.getByRole('button', { name: '取消' }).click();
    assert.deepEqual(requests.slice(beforeSelection), []);
    await query();
    assert.equal(await total.innerText(), '4');

    // Fill the actual template's workbook instead of synthesizing its header for the XLS acceptance case.
    const original = XLSX.read(fs.readFileSync(templatePath));
    XLSX.utils.sheet_add_aoa(original.Sheets.Sheet1, [sample], { origin: 'A2' });
    await open();
    await setFile(XLSX.write(original, { type: 'buffer', bookType: 'biff8' }), 'filled.xls');
    await message(/有效 1 行/);
    assert.equal(await total.innerText(), '4');
    const beforeCommit = requests.length;
    await page.evaluate(() => {
      const set = Storage.prototype.setItem;
      window.restorePersonnelTestStorage = () => { Storage.prototype.setItem = set; };
      Storage.prototype.setItem = function (key, value) {
        if (key === 'v2:personnel-import:v1') throw new DOMException('test quota', 'QuotaExceededError');
        return set.call(this, key, value);
      };
    });
    await upload.click();
    await message(/保存失败/);
    assert.equal(await total.innerText(), '4');
    await page.evaluate(() => window.restorePersonnelTestStorage());
    await upload.click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await total.innerText(), '5');
    assert.deepEqual(requests.slice(beforeCommit), []);

    await open();
    await setFile(excel('xlsx', [[sample[0], 'demo-import-a', ...sample.slice(2)]]), 'existing.xlsx');
    await message(/第 2 行.*重复/);
    assert(await upload.isDisabled());
    await setFile(excel('xlsx', [['虚构导入乙', 'DEMO-IMPORT-B', ...sample.slice(2)]]), 'filled.xlsx');
    await message(/有效 1 行/);
    await upload.click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await total.innerText(), '6');
    await page.reload();
    await query();
    assert.equal(await total.innerText(), '6');
    await page.getByRole('button', { name: '按姓名排序' }).click();
    await page.locator('.pagination select').selectOption('2');
    assert.equal(await page.locator('#main tbody tr[data-id]').count(), 2);
    await page.locator('#query-form input[name="search"]').fill('DEMO-IMPORT-A');
    await page.getByLabel('所在地区省级').selectOption('53');
    await page.getByLabel('所在地区市区县').selectOption('5301');
    await query();
    assert.equal(await total.innerText(), '1');
    for (const action of ['编辑','资格','修改记录']) {
      await page.getByRole('button', { name: action, exact: true }).click();
      assert(await dialog.isVisible());
      if (action === '编辑') {
        assert.equal(await dialog.getByLabel('单位联系电话', { exact: true }).inputValue(), '01000000');
        assert.equal(await dialog.getByLabel('个人电话', { exact: true }).inputValue(), '02000000');
        assert.equal(await dialog.getByLabel('邮政编码（住址）', { exact: true }).inputValue(), '001234');
      }
      await page.locator('#dialog-close').click();
    }

    await page.getByRole('button', { name: /重置/ }).click();
    await query();
    await page.locator('.pagination select').selectOption('10');
    const personnelRows = () => page.locator('#main tbody tr[data-id]').evaluateAll(rows => rows.map(row => ({
      id: row.dataset.id, name: row.cells[3].textContent, unit: row.cells[6].textContent
    })).sort((a, b) => a.id.localeCompare(b.id)));
    const beforeDeletion = await personnelRows();
    assert.equal(beforeDeletion.length, 6);
    const queryPeople = () => page.evaluate(() => {
      const domain = V2QueryDictionaries.person;
      const field = domain.fieldMap['person.unitName'];
      return domain.types.flatMap(({id}) => domain.rows(id).map(person => ({
        id: person.id, type: id, unitId: person.unitId, unit: domain.value(person, null, field),
        qualifications: domain.qualifications(person)
      }))).sort((a, b) => a.id.localeCompare(b.id));
    });
    const beforeQueryPeople = await queryPeople();
    const storedImports = await page.evaluate(() => localStorage.getItem('v2:personnel-import:v1'));
    const switchPage = key => page.evaluate(key => { location.hash = key; }, key);
    await switchPage('inspection-unit');
    await page.getByLabel('单位名称', { exact: true }).waitFor();
    await query();
    await page.getByRole('button', { name: '按单位名称排序', exact: true }).click();
    await page.locator('tr[data-id="DEMO-ORG-001"] input[type=checkbox]').check();
    await page.locator('.table-toolbar').getByRole('button', { name: '删除', exact: true }).click();
    await dialog.getByRole('button', { name: '确认删除', exact: true }).click();
    assert.equal(await total.innerText(), '3');
    await switchPage('personnel');
    await page.getByLabel('持证状态', { exact: true }).waitFor();
    await query();
    const afterDeletion = await personnelRows();
    const afterQueryPeople = await queryPeople();
    assert.deepEqual(afterQueryPeople, beforeQueryPeople.map(person => person.id === 'DEMO-PERSON-001'
      ? { ...person, unit: null }
      : person));
    assert.deepEqual(afterDeletion.map(({id, name}) => ({id, name})), beforeDeletion.map(({id, name}) => ({id, name})));
    assert.deepEqual(afterDeletion.filter(person => person.id !== 'DEMO-PERSON-001'),
      beforeDeletion.filter(person => person.id !== 'DEMO-PERSON-001'));
    assert(!afterDeletion.find(person => person.id === 'DEMO-PERSON-001').unit.includes('云岚'));
    await page.reload();
    await query();
    assert.deepEqual(await personnelRows(), afterDeletion, 'reload preserves every person and their remaining unit data');
    assert.deepEqual(await queryPeople(), afterQueryPeople, 'reload preserves comprehensive-query identities and qualifications');
    assert.equal(await page.evaluate(() => localStorage.getItem('v2:personnel-import:v1')), storedImports);
    await page.locator('tr[data-id="DEMO-PERSON-001"]').getByRole('button', { name: '编辑', exact: true }).click();
    assert.match(await dialog.innerText(), /关联单位已不存在.*DEMO-ORG-001/);
    await page.locator('#dialog-close').click();
    await switchPage('person-query');
    await page.getByRole('button', { name: '新增', exact: true }).click();
    await dialog.getByLabel('查询条件名称', { exact: true }).fill('DEMO-单位删除回归');
    await dialog.getByRole('radio', { name: '无损检验人员', exact: true }).check();
    await dialog.getByLabel('结果字段 姓名', { exact: true }).check();
    await dialog.getByLabel('结果字段 单位名称', { exact: true }).check();
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await page.getByRole('button', { name: '执行', exact: true }).click();
    const resultRows = dialog.getByRole('table', { name: '组合查询结果' }).locator('tbody tr[data-id]');
    assert.equal(await resultRows.count(), 2);
    const people = await resultRows.evaluateAll(rows => Object.fromEntries(rows.map(row =>
      [row.cells[2].textContent, row.cells[3].textContent])));
    assert.match(people['演示人员甲'], /^(?:—)?$/);
    assert.equal(people['演示人员丙'], beforeQueryPeople.find(person => person.id === 'DEMO-PERSON-003').unit);
    await page.locator('#dialog-close').click();
    assert.deepEqual(errors, []);
    assert(requests.every(([method, url]) => ['GET','HEAD'].includes(method) && url.startsWith(base)));
    console.log('PASS personnel XLS/XLSX, query and stable identity before/after organization deletion and reload', base);
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(output, name.slice(prefix.length) || 'index.html');
    if (!name.startsWith(prefix) || !file.startsWith(output + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xls': 'application/vnd.ms-excel' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  try {
    await exercise(browser, 'http://127.0.0.1:8020/');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    await exercise(browser, `http://127.0.0.1:${server.address().port}${prefix}`);
  } finally {
    server.close();
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
