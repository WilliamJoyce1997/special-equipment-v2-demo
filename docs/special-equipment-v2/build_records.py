"""Build V2 records from the UI schema and preserved reference manifest."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/special-equipment-v2'
REF=ROOT/'docs/references/special-equipment-ui'
schema=json.loads((DOC/'schema.json').read_text(encoding='utf-8-sig'))
manifest=json.loads((ROOT/'.local/p0-preservation.json').read_text(encoding='utf-8-sig'))
def write(name,text): (DOC/name).write_text(text.strip()+'\n',encoding='utf-8')
groups=['分类菜单总览','设备管理展开菜单','单位管理展开菜单','人员管理展开菜单','产品管理展开菜单','安全附件展开菜单','查询统计展开菜单']
visible={
'boiler':'序号、操作、智慧监管编码、使用单位、设备代码、联系人、联系电话、使用证编号',
'vessel':'序号、操作、智慧监管编码、使用单位、联系人、联系电话、设备注册代码、设备型号、设备代码（右缘）',
'elevator':'序号、操作、智慧监管编码、使用单位、设备代码、联系人、联系电话（部分）',
'crane':'序号、操作、智慧监管编码、使用单位、联系人、联系电话、设备注册代码、设备代码（右缘）',
'vehicle':'序号、操作、智慧监管编码、使用单位、联系人、联系电话、设备注册代码、设备代码',
'amusement':'序号、操作、智慧监管编码、使用单位、设备识别码、联系人、联系电话、设备注册代码',
'ropeway':'序号、操作、智慧监管编码、使用单位、联系人、联系电话、设备注册代码、设备代码',
'installation':'序号、操作、智慧监管编码、使用单位、设备代码、工程装置名称、注册登记日期（右缘）',
'pipeline':'序号、操作、智慧监管编码、检验状态、下检日期、装置名称、管道名称、使用单位（右缘）'
}
index=['# 参考截图索引','',
'共16张用户提供的原始PNG，按上传顺序保存；未裁剪、缩小或替换。图片仅为设计依据，被遮蔽信息和企业资料不用于生成样本。',
'','|序号|业务页面|原文件名|完整原图|','|---|---|---|---|']
for r in manifest['references']:
 n=r['order'];t=next((t for t in schema['types'].values() if t['reference']==n),None)
 title=groups[n-1] if n<=7 else t['title']
 index.append(f"|{n:02}|{title}|{r['original']}|[{r['saved']}]({r['saved']})|")
for r in manifest['references']:
 n=r['order'];pair=next(((k,t) for k,t in schema['types'].items() if t['reference']==n),None)
 index.extend(['',f"## {n:02} · "+(groups[n-1] if n<=7 else pair[1]['title']),'',
 f"- 原文件名：{r['original']}",f"- 完整图片：[{r['saved']}]({r['saved']})",f"- SHA-256：{r['sha256']}"])
 if n<=7:
  names='、'.join(g[0] for g in schema['groups']) if n==1 else '、'.join(name for _,name in schema['groups'][n-2][1])
  index.extend([f"- 布局特点：浅色侧栏，分类可折叠；可见菜单：{names}。",
  '- 查询字段：此图不包含表单。','- 表格字段：此图不包含数据表格。',
  '- 特殊操作：分类折叠箭头；设备展开图包含蓝色当前项。',
  '- 无法确认：交互细节、角色权限、接口及数据持久化行为。'])
 else:
  k,t=pair
  fields=[f['label']+('（区间）' if f['type'].endswith('Range') else '') for f in t['queries']] if t.get('implemented') else t['queryPlan']
  actions='、'.join(t['actions']) if t.get('implemented') else ('新增、导出、管道汇总表；装置数量/管线数量/管线总长度' if k=='installation' else '导出；详细、检验信息、修改记录、智慧监管码' if k=='pipeline' else '更改检验机构、导出')
  index.extend(['- 布局特点：浅色侧栏、多标签导航、三列查询、居中查询/重置、右侧设置/高级查询；下方独立白色宽表卡片；左侧操作区域阴影。',
  '- 查询字段（按行从左到右）：'+'；'.join(fields)+'。',
  '- 截图实际可见表格字段：'+visible[k]+'。',
  '- 特殊操作入口：'+actions+'；查询设置、表格设置、高级查询。',
  '- 无法确认：被遮蔽地区及真实数据；下拉完整选项；右侧未显示列、排序分页规则；业务按钮提交规则、完整详情和后端接口。前三类截图表体为空，不能据此推断真实记录。'])
  if k=='pipeline':index.append('- 管线完整31列来自用户明确补充要求，不是对本图可见区域的推断；详见新版 design.md。')
(REF/'README.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
write('requirements.md',"""
# V2 第一批需求与验收边界

系统名称：特种设备综合管理系统。核心模块：基础档案管理。
依据16张用户原图实现锅炉、压力容器、电梯；其余六种设备仅配置规划，其他分类仅保留菜单与明确待开发页面。不实现“工作桌面”。

## 信息架构

"""+'\n'.join('- '+name+'：'+'、'.join(label for _,label in items) for name,items in schema['groups'])+"""

## 本批验收条件

- 21个叶子菜单；浅色侧栏、蓝色选中、多级折叠、页面标签切换与关闭。
- 三列查询布局；锅炉19项、压力容器17项、电梯21项，各类专有字段与顺序不合并。
- 每类8条明确虚构样本；组合查询、重置、数值/日期区间、无结果提示。
- 分页、每页条数、升降序、详情、模拟检验信息、选择与CSV导出、查询及表格列显示设置。
- 桌面选择/序号/操作列固定，宽表横向滚动；窄屏菜单抽屉及表格滚动不造成页面溢出。
- 更改检验机构、使用标志等保留入口但明确未接通，不返回业务成功。
- 遮蔽信息不复制入样本，不推定统一法定检验周期。

## 数据及安全边界

数据来源为 static/v2/fixtures.js，未调用P0 API，不写入数据库。
详情、导出、检验展示均注明虚构及无法定效力。刷新恢复样本；列设置仅在当前页面会话内有效。
8020仅绑定回环地址，不发布公网，不暴露继承的管理员或API。
""")
design=['# V2 前端架构与配置设计','',
'## 复用与隔离','',
'在保留P0全部当前源码的独立副本中新增V2入口，保留Django、DRF、SQLite及原生HTML/CSS/JavaScript。未新增业务模型或迁移。原P0页面/API源码仍保留在副本，但V2预览不挂载这些接口。',
'','## 文件职责','',
'- static/v2.html：系统标题、侧栏、标签、主容器、原生dialog。',
'- static/v2/config.js：9类元数据、各类查询类型/顺序/选项、独立列/列宽/固定信息、详情、21个菜单。前三类 implemented=true，其余 false。',
'- static/v2/fixtures.js：每类8条纯虚构样本；查询字段均有对应值，不使用真实单位或数据。',
'- static/v2/app.js：通用组件，各类别隔离的筛选/排序/页码/列设置状态、详情、校验、CSV导出、明确未接通提示。用textContent构建节点，CSV防公式前缀，无外部CDN。',
'- static/v2/styles.css：浅色视觉、3/2/1列响应式查询、横向滚动、桌面固定左列，窄屏取消固定避免遮挡数据。',
'- v2_server.py、cmms_project/v2_settings.py、v2_urls.py：Waitress + WhiteNoise，仅开放V2静态资源，DEBUG=False、精确loopback Host及CSP；8020不开放API/admin。',
'','## 配置与数据适配','',
'查询描述：key、label、type（text/select/numberRange/dateRange）、options、placeholder。区间分别保存_min/_max。查询按“且”组合，文本不分大小写；综合查询匹配设备代码、注册代码及使用证编号。隐藏查询字段会清除其已应用条件。高级查询补充设备代码、联系人、设备注册代码。','',
'列描述：key、label、width、type、sortable；fixedColumns描述序号/操作，选择框另占42px。详情由detailFields去重组合，不复制九份HTML。切换页面保留各自状态；重置清筛选与选中，不清排序/列配置。','',
'本批 dataSource=fictional-browser-fixtures、api=null，明确为前端样本适配。后续可替换fixtures读取边界以接入API，复用P0设备/单位/权限服务。既有 /api/assets/ 为候选，九类监管专用字段、查询语义、单位权限须另做映射确认；当前未虚构九类API、未宣称真实持久化已完成。','',
'## 三类配置','']
for k in ['boiler','vessel','elevator']:
 t=schema['types'][k];design.extend([f"### {t['title']}",'',
 '查询：'+'、'.join(f['label'] for f in t['queries'])+'。',
 '表格（选择框、序号、操作之后）：'+'、'.join(c['label'] for c in t['columns'])+'。',
 '截图只确认左侧可见列；设备名称、类别、地区、状态、检验日期及各类专有扩展列为演示补充，不宣称截图完整列清单。',''])
design.extend(['## 压力管道管线31列预留','',
'严格按用户给定顺序，不合并编号、编码与不同日期。本批仅保存配置，未渲染管线表格：','',
'\n'.join(f"{i}. {label}" for i,label in enumerate(schema['pipelineLabels'],1)),
'','## 后续接入限制','',
'业务更新须后端单位/角色鉴权，检测、检验、验收与恢复使用保持独立语义。本批只读UI不修改设备状态，无数据库迁移。P0库快照用于成果保护，本批不读取其真实业务记录到页面。'])
write('design.md','\n'.join(design))
write('tasks.md',"""
# 第一批任务与后续计划

- [x] 核对P0未提交/未跟踪文件，保留独立V2副本（上轮完成，本轮未重复复制）。
- [x] 代码ZIP、数据库在线备份及恢复副本、16张完整原图与SHA-256索引。
- [x] 系统名称、浅色布局、21叶子多级菜单与标签切换。
- [x] 配置驱动查询、宽表、详情、排序、分页、选择、列显示与CSV导出。
- [x] 锅炉19项/压力容器17项/电梯21项查询，每类8条虚构样本。
- [x] 1920、1366三类截图；768/390窄屏截图；真实浏览器交互测试。
- [x] 独立8020预览入口，不挂载业务API/admin。
- [ ] 产品部人工验收前三类UI。
- [ ] 验收授权后继续六类；当前不开发。

## 剩余六类具体计划（待授权）

1. 起重机械：图11的15项查询、最新检验业务检验类别；核对注册代码及设备代码列，独立样本和专有字段测试。
2. 场（厂）内机动车辆：图12的16项查询、厂牌编号；确认类别选项、详情专有参数，独立样本及查询验证。
3. 大型游乐设施：图13的15项查询排列，设备识别码独立列；确认右侧未显示列，不擅自合并设备代码。
4. 客运索道：图14的15项查询、注册代码及日期区间；独立样本、详情与排序测试。
5. 压力管道装置：图15的11项查询、社会信用代码/创建时间/告知单编号；规划新增、汇总表和数量/长度统计，业务提交范围需另行确认。
6. 压力管道管线：图16的16项查询，按design.md完整31列；分别处理下检/全面检验/检验日期；横向滚动/列配置；装置关联之后实现汇总联动。

每类完成条件：确认字段、独立配置、至少5条虚构样本、查询/重置/详情/分页/排序、1366及1920截图对照。
本次不实施剩余六类可操作页面，也不实施P1/P2生命周期业务。
""")
write('README.md',r"""
# 特种设备综合管理系统 · V2 第一批

V2独立副本：C:\Users\willi\.codex\worktrees\special-equipment-v2\OpenCMMS

副本保留P0当前工作文件（含未提交、未跟踪代码），不是只取Git HEAD；未复制.git，不含可提交分支。本轮没有重复复制，没有提交/推送，也未覆盖 D:\Projects\OpenCMMS。

## 预览与启动

访问 http://127.0.0.1:8020/ ，或 /static/v2.html#vessel、#elevator。
不需要账号：仅显示前端虚构样本，不开放P0 API/admin或真实业务数据，不是新的认证实现。

PowerShell：

~~~powershell
Set-Location 'C:\Users\willi\.codex\worktrees\special-equipment-v2\OpenCMMS'
C:/miniconda3/python.exe v2_server.py
~~~

采用本副本 cmms_project.v2_settings，数据库指向本副本.local/demo.sqlite3，前端不进行数据库读写。
Waitress仅监听127.0.0.1:8020，原8010/Cloudflare配置不变。
不要为V2运行继承的 start.py 或 preview_server.py。
前台用Ctrl+C停止。当前后台实例可先核对8020进程命令行，再仅停止该进程：

~~~powershell
$taskV2Pid = (Get-NetTCPConnection -LocalPort 8020 -State Listen).OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId = $taskV2Pid" | Select-Object ProcessId, CommandLine
# 仅确认命令是本副本 v2_server.py 后执行：
Stop-Process -Id $taskV2Pid
~~~

静态文件修改后重启V2服务（WhiteNoise缓存资源元数据），不要停止8010。

## 人工验收路线

1. 打开8020，确认系统名称、浅色菜单，切换锅炉/压力容器/电梯；无“工作桌面”。
2. 对照参考图08/09/10：锅炉燃料/蒸发量，容器用途/快开门，电梯保险/维保/梯龄各不相同。
3. 综合查询输入 DEMO-GL-003、DEMO-RQ-003、DEMO-DT-003，应各1条；重置恢复8条。
4. 专有字段及日期区间筛选，表头升降序；下一页3条，每页10条显示全部8条。
5. 详细展示虚构档案，检验信息明确模拟，监管码仅展示虚构编码。
6. 表格设置隐藏/恢复列，横向滚动；查询设置隐藏条件；高级查询匹配设备代码。
7. 选择记录导出（电梯在“更多 >>”中）；更改检验机构/使用标志提示未接通，不修改数据。
8. 其他菜单明确待开发，测试标签关闭、分类折叠与窄屏菜单。

## 资料与测试

- 16图索引：../references/special-equipment-ui/README.md
- 需求：requirements.md；设计及31列：design.md；六类计划：tasks.md。
- 验证与差异：verification.md；结果：test-results.json。
- 截图：screenshots/boiler-1920.png、vessel-1920.png、elevator-1920.png；另有1366三图及电梯768/390图。
- 复测命令：node tests/v2/ui.e2e.cjs；使用本机已有Playwright/Chrome，不访问公网。

## 快照与恢复

.local/p0-code-snapshot.zip：改版前P0当前源文件（不含Git、数据库、日志、凭据）。
.local/p0-demo-snapshot.sqlite3：P0演示库在线备份；.local/demo.sqlite3：V2隔离副本。
.local/p0-preservation.json：原P0 Git状态、原图名/哈希和源演示库哈希。
恢复仅在新的隔离目录解压或复制，核对SQLite完整性后使用；不得回写原P0或原始库。
""")
print('16 reference entries and 5 V2 documents written')

