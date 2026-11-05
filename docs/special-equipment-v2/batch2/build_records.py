"""Generate second-batch delivery records from the final UI schema."""
from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parents[3]
DOC=ROOT/'docs/special-equipment-v2'
OUT=DOC/'batch2'
schema=json.loads((DOC/'schema.json').read_text(encoding='utf-8-sig'))
def write(name,text):(OUT/name).write_text(text.strip()+'\n',encoding='utf-8')
titles={k:t['title'] for k,t in schema['types'].items()}
new=['crane','vehicle','amusement','ropeway','installation','pipeline']
fields=['# 九类设备最终字段清单','',
'本文件由当前 static/v2/config.js 的 schema.json 生成。前三类配置与已验收版本完全一致；新增六类按参考图11–16分别配置。',
'表格“选择框”是非业务控件；除管线把选择框嵌入序号外，其他页单独显示选择框。数据列顺序如下，不把选择框算作业务字段。所有内容仅用于虚构样本演示。','',
'|设备|查询条件数|业务表格列数（含序号/操作）|样本数|','|---|---:|---:|---:|']
for k,t in schema['types'].items():fields.append(f"|{t['title']}|{len(t['queries'])}|{len(t['columns'])+2}|8|")
for k,t in schema['types'].items():
 fields.extend(['',f"## {t['title']}",'',f"参考图：{t['reference']:02}；数据来源：fictional-browser-fixtures；API：未接入。",'',
 '|位置|查询字段|组件类型|下拉示例选项|','|---|---|---|---|'])
 for i,f in enumerate(t['queries'],1):
  kind={'text':'文本','select':'下拉','dateRange':'日期范围','numberRange':'数值区间'}[f['type']]
  fields.append(f"|{(i-1)//3+1}行{(i-1)%3+1}列|{f['label']}|{kind}|{'、'.join(f.get('options',[])) or '—'}|")
 fields.extend(['','|序号|表格字段|字段类型|列宽px|固定|','|---|---|---|---:|---|'])
 cols=t['fixedColumns']+t['columns']
 for i,c in enumerate(cols,1):fields.append(f"|{i}|{c['label']}|{c.get('type','展示/操作')}|{c['width']}|{'左侧' if c.get('fixed') else '—'}|")
 fields.extend(['','详情字段：'+'、'.join(c['label'] for c in t['detailFields'])+'。','',
 '工具栏：'+'、'.join(t['actions'])+'。'])
 if k in new:fields.append('行操作：详细、检验信息、修改记录、智慧监管码；均为只读虚构演示。')
 if k=='pipeline':fields.append('管线表格恰31列；全部29个数据列始终参与CSV导出，另含序号及操作说明，即使已隐藏列仍保留。三个编码和三个日期分别存储，不计算法定周期。')
write('fields.md','\n'.join(fields))
readme=['# V2 第二批交付与验收','',
'状态：设备管理九类页面均已完成可操作的纯前端演示，等待人工验收。其他基础档案分类仍只有菜单和明确待开发说明。',
'','## 项目与访问','',
'独立副本：C:/Users/willi/.codex/worktrees/special-equipment-v2/OpenCMMS（无Git元数据）。',
'预览：http://127.0.0.1:8020/ 。无需账号，仅显示前端虚构样本，不挂载业务API或管理员。',
'原P0：127.0.0.1:8010服务未修改；源代码与演示库核对不变。',
'','## 六个新增页面与实际截图','',
'|页面|专有字段/差异|1920真实截图|1366真实截图|','|---|---|---|---|']
specific={
'crane':'检验类别；额定起重量、跨度',
'vehicle':'厂牌编号；车辆型号、载荷、动力方式',
'amusement':'设备识别码；额定乘员、运行高度',
'ropeway':'索道型号、线路长度、速度、每小时运量',
'installation':'社会信用代码、创建时间、告知单编号；装置/管线数量及长度、汇总预览',
'pipeline':'管道名称/级别、重要管道、长度区间；严格31列、全部字段导出'
}
for k in new:readme.append(f"|{titles[k]}|{specific[k]}|[{k}-1920](screenshots/{k}-1920.png)|[{k}-1366](screenshots/{k}-1366.png)|")
readme.extend(['',
'每类8条虚构样本。共同支持组合筛选/重置、区间、分页、排序、详情、列设置及CSV。六页行操作提供模拟检验信息、预置修改记录、虚构监管编码。新增/更改检验机构等需要后端的操作明确未接通，不返回业务成功。',
'','## 测试结果','',
'- 小批次A：45项通过。',
'- 最终六页与九类导航：83项通过，包含完整31列表头、详情、CSV、固定列、装置关联、1366/1920及768/390布局交互。',
'- 第一批回归：42项通过；其中41项保留原行为断言，原“管线占位页”一项按本轮要求改为“已完成31列”。',
'- 补充边界：13项通过，含前三页CSV实际下载、汇总未选/跨单位/停用排除及正确长度、锅炉/容器768与390窄屏查询详情。',
'- 系统检查和JS语法检查通过；无控制台错误。失败及修复经过见 verification.md。',
'',
'结果文件：stage-a-results.json、test-results.json、edge-results.json；第一批回归结果在上级test-results.json。',
'','## 启动/关闭','',
'PowerShell：','',
'~~~powershell',
"Set-Location 'C:/Users/willi/.codex/worktrees/special-equipment-v2/OpenCMMS'",
'C:/miniconda3/python.exe v2_server.py','~~~','',
'服务已运行时不要重复启动。前台启动用Ctrl+C停止；后台停止需先核对8020所属进程命令行为本副本v2_server.py，再仅停止该进程。静态文件变更后需重启V2（WhiteNoise缓存）；不得停止8010。',
'','## 人工验收步骤','',
'1. 从设备管理依次打开九类，确认均为查询表格页；核对新增六类查询排列及专有字段。',
'2. 综合查询分别用 DEMO-QZ-003、DEMO-CC-003、DEMO-YL-003、DEMO-SD-003、DEMO-ZZ-003、DEMO-GX-003，各剩1条；重置回8条。',
'3. 用类别、日期范围和多条件查询；管线长度200–400应剩2条。无匹配时显示空结果。',
'4. 点击表头两次核对升降序，下一页3条；每页10条显示8条；详情关闭后保留筛选。',
'5. 各类设置隐藏列、滚动宽表、实际下载CSV；管线隐藏“管道止点”后导出仍有完整31个表头。',
'6. 管线横向滚动到右端，桌面序号/操作固定；详情可见完整字段，修改记录明确虚构。',
'7. 装置页勾选DEMO-ZZ-002，汇总应为1条在用管线、220m；混选不同单位/类别应给出条件提示；新增提示未接通。',
'8. 切换顶部标签、缩至768/390测试导航与查询；其他基础档案分类仍明确待开发。',
'','## 数据与范围','',
'所有记录来自static/v2/fixtures.js，均虚构且不写SQLite。管线通过installationId关联装置，单位、地区、名称、信用代码一致；下检日期、全面检验日期、检验日期为独立预置样本，没有法定周期推算。',
'',
'配置明细见[fields.md](fields.md)，视觉差异见[differences.md](differences.md)，后续清单见[remaining-modules.md](remaining-modules.md)。',
'没有新模型、迁移、P1/P2业务、Git提交/推送或公网部署。完成本批后停止，等待人工验收。'])
write('README.md','\n'.join(readme))
write('differences.md',"""
# 参考图差异与待确认项

已读取保留的16张原图与索引，重点逐页核对图11–16；未删除或替换原图。

## 已匹配

浅色侧栏、蓝色选中、多级展开、顶部标签、三列查询及字段顺序、居中查询/重置、设置/高级查询入口、独立表格区域。
新增四类查询分别15/16/15/15项，装置11项，管线16项；不是仅更换标题。
参考图中的设备识别码、厂牌编号、社会信用代码、告知单编号、管道级别、重要管道、管道长度均独立配置。

## 仍存在的差异

- 沿用第一批已验收的系统标题和演示标记，顶部比参考图多一条标题栏；没有工作桌面标签。
- 原图多数表格为空，本批展示8条虚构样本、分页和数据来源说明。
- 原生日期/下拉控件及本地字符图标与参考系统不同；字体、像素间距未做到逐像素一致。
- 参考图未展示右侧全部表头。新增六类除管线完整31列外，右侧为合理演示补充，不能称为完整还原。具体补充列见fields.md。
- 起重补充额定起重量/跨度；场车补充型号/载荷/动力；游乐补充乘员/运行高度；索道补充型号/长度/速度/运量。前三类配置不变。
- 新增六页增加只读“修改记录”“智慧监管码”入口；预置记录不是实际审计日志，也没有生成真实监管二维码。
- 管线将复选框嵌入序号列以满足严格31列；桌面固定序号/操作，窄屏取消固定以保证数据可滚动访问。
- 装置“管道汇总表”提供勾选同单位同类别的在用虚构管线预览，不提供正式打印。原图红色打印说明由弹窗规则说明代替。
- 新增、更改检验机构及使用标志等需后端动作仍明确未接通；没有假“操作成功”。
- 管线CSV始终完整31列，列隐藏仅影响界面；其他页面沿用第一批规则，导出当前可见列，选中记录时仅导出当前筛选内的选中记录。
- 地区、单位、电话、编码及下拉选项均为虚构示例，不代表真实监管目录。压力值字段样本以MPa、温度以℃表示，表头严格保持用户要求，不擅自增加单位文字。
- 没有真实API、权限业务或数据库持久化。页面刷新恢复样本；设置状态仅在当前页面会话内保留。

本批无已知阻塞演示的遗留问题；上述差异及正式右侧字段、打印模板、正式选项需产品部后续确认。
""")
write('remaining-modules.md',"""
# 其他基础档案模块后续清单（未授权实施）

当前这些12个叶子页面只保留菜单和待开发说明，不提供业务CRUD。

|分类|页面|后续需确认与实现|
|---|---|---|
|单位管理|检验单位|单位资质字段、组织关联、查询表格/详情、虚构样本；真实资质不得模拟为已核验|
|人员管理|人员信息管理|人员/任职/单位关系、查询字段与隐私展示范围|
|产品管理|锅炉产品管理|产品型号、制造单位、产品参数及设备关联|
|产品管理|压力容器产品管理|容器产品结构/参数、制造编号与档案关联|
|产品管理|电梯产品管理|梯型/制造型号/参数及设备关联|
|产品管理|起重机械产品管理|机型/起重量/跨度及制造单位字段|
|产品管理|管道元件产品管理|元件类别/规格/材料与装置关系|
|产品管理|管道工程产品管理|工程、装置、管线关联与汇总口径|
|安全附件|安全阀管理|附件型号、所属设备与校验记录的独立语义|
|查询统计|人员综合查询|人员跨字段查询及最小可见数据|
|查询统计|单位综合查询|单位类型、关联设备和聚合口径|
|查询统计|设备综合查询|九类跨类别查询、列映射及统计口径|

每个模块顺序：产品部提供并确认字段/参考图 → 确认模拟或真实API范围 → 独立配置与样本 → 交互与响应式测试 → 人工验收。
真实持久化、用户鉴权、多单位权限、审批或旧P0生命周期P1/P2必须另行授权；本轮不执行。
""")
write('verification.md',"""
# 第二批真实验证与变更记录

## 完成与范围

起重机械、场（厂）内机动车辆、大型游乐设施、客运索道、压力管道装置、压力管道管线全部完成。
九类合计72条虚构样本。其他12个菜单未开发业务。不新增模型/迁移，不写数据库。

## 通过结果

- tests/v2/batch2.e2e.cjs --stage-a：45项通过。
- tests/v2/batch2.e2e.cjs：83项通过、0最终失败。
- tests/v2/ui.e2e.cjs：42项通过、0最终失败。其中仅“管线占位”断言因需求变化替换为31列完成断言，另外41项保留。
- tests/v2/batch2-edges.e2e.cjs：13项通过、0失败。
- node --check：config.js、fixtures.js、app.js通过。
- Django check：0 issues。
- tests/v2/preservation.py：通过。P0源码相对快照无变化；演示库哈希不变，隔离库/恢复副本完整性ok、外键错误0；16图哈希匹配。
- 通过逐项JSON核对，前三类配置与.local/v2-batch1-accepted.zip完全相同；前三类fixtures和原CSS按统一换行符比较保持原前缀。
- 8010原进程168428持续监听，登录页200；8020独立进程152376监听，首页200。进程号仅供本次交付记录，不应写死到启动脚本。

## 管线专项

浏览器直接读取thead得到恰31个th，逐个与用户清单严格比较。全部列默认显示；序号/操作固定在左。
CSV真实下载后解析，表头31列/顺序一致，每行31格，8条数据；隐藏“管道止点”后仍导出该列。
详情逐一包含全部31个标签及扩展查询字段。三个编码、三个日期均分开存储；8条管线与对应装置名称、单位、地区一致，长度/压力为正数。
下检日期为人工预置虚构值，不据设备类别计算法定周期。

## 交互与布局

六页分别核对参考字段排列、文本/下拉/日期、组合查询及空结果、重置、升降序、分页/每页数、详情关闭后保留筛选、列隐藏恢复、CSV下载和模拟行操作。
1366、768、390检查整页无水平溢出、宽表内部可滚动，并实际操作查询与详情。1920保存默认布局截图。
顶部标签切换保留筛选；装置汇总验证未选引导、跨单位/类别拒绝、停用排除、在用1条220m正确计算。
三页旧页面除42项回归外分别实际下载CSV。浏览器无致命JS或控制台错误。

## 失败与处理经过

1. A首次在同文档URL只改变hash时仍显示上一页，字段断言失败。原因是入口只在初始化渲染。补充hashchange监听后，A45项及最终83项通过；记录保留failure-a.json。
2. B配置预检曾发现新增for块缺少闭括号，node --check失败。补全后语法检查通过；没有启动错误版服务。
3. 快照前缀检查首次把ZIP的CRLF与read_text归一化的LF直接比较导致断言失败；统一换行后通过。这是验证脚本差异，不是已验收内容被替换。
4. 资料核对统一了同一虚构单位的信用代码；针对性9项边界验证通过。
5. 第一批历史失败记录仍保留于上级目录；不计作本次最终失败。没有隐藏跳过项。

没有执行数据库迁移或全量P0写入测试，没有公网部署或Git操作。

## 文件改动

修改：static/v2/config.js、fixtures.js、app.js、styles.css；tests/v2/ui.e2e.cjs（仅占位断言升级）；schema.json及交付文档。
新增：tests/v2/batch2.e2e.cjs、batch2-edges.e2e.cjs；batch2目录内字段/差异/后续清单、测试结果、CSV与真实截图。
未修改：static/v2.html、v2_server.py、Django模型/迁移、P0工作树及数据库。

限定只读复核未发现阻塞问题；提出的导出覆盖和汇总边界已明确范围并补测。
""")
# Preserve prior narratives and make the entry points current.
history=OUT/'history';history.mkdir(exist_ok=True)
for name in ['README.md','requirements.md','tasks.md','design.md']:
 p=DOC/name
 if not (history/name).exists():shutil.copy2(p,history/name)
(DOC/'README.md').write_text('# 特种设备综合管理系统 V2 · 九类设备 Demo\n\n当前第二批已完成，等待人工验收。\n\n- 访问：http://127.0.0.1:8020/\n- 项目：C:/Users/willi/.codex/worktrees/special-equipment-v2/OpenCMMS\n- [第二批交付与验收](batch2/README.md)\n- [九类查询/表格/详情完整字段](batch2/fields.md)\n- [测试结果及失败经过](batch2/verification.md)\n- [参考图差异](batch2/differences.md)\n- [后续其他模块清单](batch2/remaining-modules.md)\n- [16张原图索引](../references/special-equipment-ui/README.md)\n\n每类8条前端虚构样本，不写数据库，不需要账号。原8010 P0不变。\n\n启动：在本项目目录执行 C:/miniconda3/python.exe v2_server.py；前台Ctrl+C关闭。后台停止前核对8020所属命令行为本项目v2_server.py，勿停止8010。\n\n第一批历史说明保留在batch2/history，已验收三类配置与样本保留。\n',encoding='utf-8')
(DOC/'tasks.md').write_text('# V2 当前任务状态\n\n- [x] 第一批锅炉/压力容器/电梯人工验收通过。\n- [x] 小批次A起重/场车/游乐/索道，45项检查通过。\n- [x] 小批次B装置/管线，31列完整实现。\n- [x] 六类各8条样本、独立查询/表格/详情、模拟记录查看。\n- [x] 九类统一验证83项，第一批回归42项，边界补测13项通过。\n- [x] 六页1920/1366截图及管线768/390、滚动和详情截图。\n- [x] 字段清单、差异、启动/验收和其他模块清单。\n- [x] P0代码/数据库/服务及16原图保护核对。\n- [ ] 本批人工验收。\n- [ ] 其他12个菜单业务开发（未授权）。\n\n已停止扩展；不实施旧P0 P1/P2。详情见[第二批交付](batch2/README.md)与[后续清单](batch2/remaining-modules.md)。\n',encoding='utf-8')
for name in ['requirements.md','design.md']:
 p=DOC/name
 p.write_text('> 当前状态：第二批九类设备已完成。以下保留第一批历史需求/设计；其中“未来/不渲染”描述已由[第二批交付](batch2/README.md)及[完整字段清单](batch2/fields.md)更新。\n\n'+(history/name).read_text(encoding='utf-8-sig'),encoding='utf-8')
write('screenshots/README.md','# 第二批真实浏览器截图\n\n'+'\n'.join(f"- [{titles[k]} 1920]({k}-1920.png) · [1366]({k}-1366.png)" for k in new)+'\n\n- [管线768](pipeline-768.png) · [390](pipeline-390.png)\n- [管线右端滚动](pipeline-scrolled-right.png) · [完整详情](pipeline-detail.png)\n\n图片来自本地Chrome实际渲染，截图时仅隐藏临时状态提示。')
print('Batch2 field matrix, delivery/test/difference records and current entry documents generated')

