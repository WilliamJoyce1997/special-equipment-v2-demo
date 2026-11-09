const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.env.V2_PLAYWRIGHT || 'playwright');
const XLSX = require('../../static/v2/vendor/xlsx.full.min.js');

const prefix = '/special-equipment-v2-demo/';
const output = path.resolve(__dirname, '../../dist-pages');
const modules = [
  ['boiler-product','锅炉','有机热载体气相炉','8b7a79ba035b77e151c71f1241788f912e7175567a65724c31368daabddb0658'],
  ['vessel-product','压力容器','第三类压力容器','9d4ad91fabb04778a7d1b33fdcc32cce1dfecf2086b9c09489fd92742218cdbe'],
  ['elevator-product','电梯','曳引驱动乘客电梯','06bb8e2f2e5d28484f37010c00b4cdc1c5eefd2323cabf77d9860d244c09a618'],
  ['crane-product','起重机械','通用桥式起重机','0ee193786e18ef573c8c4860c454609541270a94a8fbe45e32c318cb7d369bdf'],
  ['pipe-component','管道元件','无缝钢管','8f12397a9414fb866690e40e3c4f9d5ec31dee43fae837eebc86ac5d0dbe790b'],
  ['pipe-project','管道工程','','fbb133b730115b20e5ea41e133923f4d221bd35ed68c9da486443aba197387e9']
];

async function exercise(browser, base) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const requests = [], errors = [];
  context.on('request', r => requests.push([r.method(), r.url()]));
  page.on('pageerror', error => errors.push(error.message));
  const dialog = page.locator('#dialog');
  const upload = dialog.getByRole('button', { name:'上传', exact:true });
  const open = () => page.locator('[data-action="导入"]').click();
  const query = () => page.locator('#query-form button[type=submit]').click();
  const search = async value => {await page.locator('#query-form input[name="search"]').fill(value);await query();};
  const total = () => page.locator('#main .count-total').innerText().then(Number);
  const message = pattern => dialog.getByText(pattern).first().waitFor();
  const setFile = (bytes, extension) => dialog.getByLabel('选择附件').setInputFiles({
    name: 'synthetic.' + extension, mimeType:'application/octet-stream', buffer:Buffer.from(bytes)
  });
  try {
    for (const [index,[type,label,category,hash]] of modules.entries()) {
      await page.goto(base + '#' + type);
      assert.equal(await page.locator('#query-form .query-links').count(), 0);
      await query();
      const before = await total();
      await open();
      assert.equal(await dialog.locator('h2').innerText(), '产品导入');
      await message('未选择任何文件');
      const pending = page.waitForEvent('download');
      await dialog.getByRole('link', {name:'下载模板'}).click();
      const download = await pending;
      const filename = label + '产品.xlsx';
      assert.equal(download.suggestedFilename(), filename);
      const original = fs.readFileSync(await download.path());
      assert.equal(crypto.createHash('sha256').update(original).digest('hex'), hash);
      const nextRequest = requests.length;
      const project = type === 'pipe-project';
      const name = '虚构导入' + label;
      const data = {'设备代码':'DEMO-IMPORT-CODE','产品名称':name,'产品编号':'DEMO-IMPORT-NO',
        '设备类别':category,'制造单位名称':'虚构制造单位','制造日期':'2025-06-07',
        '工程项目名称':name,'合同编号':'DEMO-IMPORT-CONTRACT','总质量':42.5,'长度':7.5,
        '设计压力':1.5,'壳程设计压力(MPa)':2.5,'额定速度（下行）':1.25,'设备造价(元)':123.5};
      const makeWorkbook = (overrides, extension) => {
        const w = XLSX.read(original);
        const sheet = w.Sheets[filename];
        const [headers] = XLSX.utils.sheet_to_json(sheet,{header:1});
        XLSX.utils.sheet_add_aoa(sheet,[headers.map(h => ({...data,...overrides})[h] ?? '')],{origin:'A2'});
        return XLSX.write(w,{type:'buffer',bookType:extension==='xls'?'biff8':'xlsx'});
      };
      const extension = index % 2 ? 'xls' : 'xlsx';
      const wrong = XLSX.read(original);
      wrong.Sheets[filename].A1.v='错误表头';
      await setFile(XLSX.write(wrong,{type:'buffer',bookType:'xlsx'}),'xlsx');
      await message(/表头名称或顺序/);
      await setFile(makeWorkbook({'制造单位名称':''},extension),extension);
      await message(/第 2 行.*制造单位名称.*必填/);
      assert(await upload.isDisabled());
      await setFile(makeWorkbook({'制造日期':'2025-02-30'},extension),extension);
      await message(/第 2 行.*制造日期.*日期/);
      if (!project) {
        await setFile(makeWorkbook({'设备类别':'客运索道'},extension),extension);
        await message(/第 2 行.*设备类别/);
      }
      await setFile(Buffer.from('not excel'),'xlsx');
      await message(/文件内容与扩展名不一致/);
      const otherExtension=extension==='xls'?'xlsx':'xls';
      await setFile(makeWorkbook({},otherExtension),otherExtension);
      await message(/有效 1 行/);
      await dialog.getByRole('button',{name:'取消'}).click();
      assert.equal(await total(),before);
      await open();
      await setFile(makeWorkbook({},extension),extension);
      await message(/有效 1 行/);
      await upload.click();
      await dialog.waitFor({state:'hidden'});
      assert.equal(await total(),before+1);
      assert.deepEqual(requests.slice(nextRequest),[]);
      await page.reload();
      await query();
      assert.equal(await total(),before+1);
      await page.getByLabel('每页条数',{exact:true}).selectOption('2');
      await page.getByRole('button',{name:'下一页',exact:true}).click();
      assert.equal(await page.locator('#main tbody tr[data-id]').count(),2);
      await search(name);
      assert.equal(await total(),1);
      await open();
      await setFile(makeWorkbook({},extension),extension);
      await message(/第 2 行.*重复/);
      assert(await upload.isDisabled());
      await dialog.getByRole('button',{name:'取消'}).click();
      const row = page.locator('tbody tr[data-id]').filter({hasText:name});
      await row.getByRole('button',{name:'编辑',exact:true}).click();
      assert.equal(await dialog.getByLabel('制造日期',{exact:true}).inputValue(),'2025-06-07');
      const [field,value] = [['设计压力','1.5'],['壳程设计压力（MPa）','2.5'],['额定速度（下行）','1.25'],['设备造价(元)','123.5'],['长度','7.5'],['总重量','42.5']][index];
      assert.equal(await dialog.getByLabel(field,{exact:true}).inputValue(),value);
      if (!project) {
        const tree = await page.evaluate(key => V2ProductCategories.trees[key], type);
        const picker = dialog.getByLabel('设备类别',{exact:true});
        assert.deepEqual(await picker.locator('option').evaluateAll(es=>es.map(e=>e.value)),['',...tree.map(([p])=>p)]);
        const [parent,children] = tree.find(([, c])=>c.length);
        await picker.selectOption(parent);
        await dialog.getByLabel('设备子类别',{exact:true}).selectOption(children.at(-1));
        await dialog.getByRole('button',{name:'保存',exact:true}).click();
        await dialog.waitFor({state:'hidden'});
        assert.equal(await row.locator('td[data-field="category"]').innerText(),children.at(-1));
        await page.reload();await search(name);
        await row.getByRole('button',{name:'编辑',exact:true}).click();
        assert.equal(await dialog.getByLabel('设备子类别',{exact:true}).inputValue(),children.at(-1));
      } else {
        assert.equal(await dialog.getByLabel('设备类别',{exact:true}).count(),0);
        assert.equal(await dialog.getByRole('button',{name:'保存',exact:true}).count(),0);
      }
      await page.locator('#dialog-close').click();
      await page.locator('.table-toolbar > .link').click();
      assert.equal(await dialog.locator('h2').innerText(),'表格自定义展示字段');
      await page.locator('#dialog-close').click();
      console.log('PASS',base,type,extension);
    }
    assert.deepEqual(errors,[]);
    assert(requests.every(([method,url])=>method==='GET'&&url.startsWith(base)));
  } finally { await context.close(); }
}

async function main() {
  const browser = await chromium.launch({channel:'chrome'});
  const server = http.createServer((req,res)=>{
    const pathname = new URL(req.url,'http://localhost').pathname;
    const file = path.resolve(output,pathname.slice(prefix.length)||'index.html');
    if (!pathname.startsWith(prefix)||!file.startsWith(output+path.sep)||!fs.existsSync(file)) return res.writeHead(404).end();
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  try {
    await exercise(browser,'http://127.0.0.1:8020/');
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    await exercise(browser,`http://127.0.0.1:${server.address().port}${prefix}`);
  } finally {server.close();await browser.close();}
}

main().catch(error=>{console.error(error);process.exitCode=1;});
