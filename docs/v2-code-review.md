# OpenCMMS V2 代码审查

基线 6a1d4a3，2026-11-12。范围为当前 V2 快照及 21 个入口，未访问原系统。严重度按当前演示环境和可证明影响划分：P0 为系统级阻断或重大安全事件；P1 为核心流程广泛不可用或高影响数据错误；P2 为可复现的局部功能、数据、可靠性或发布质量问题；P3 为局部一致性、可访问性或说明问题。

| P0 | P1 | P2 | P3 |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 5 | 6 |

采用 Matt Pocock 的 code-review 并行双轴，分别审查 Standards（实现与标准）和 Spec（行为与需求）。项目全量审计没有单一变更起点，采用当前快照、用户给定范围、现行代码和历史交付说明，未将旧说明等同于当前验收标准。两轴交叉确认的人员问题仅计一次。仓库及祖先路径未发现 AGENTS.md，跟踪文件中未发现独立 CONTRIBUTING 或 CODING_STANDARDS。使用 writing-for-agents 检查入口指向、按任务触发的资料和可验收的完成条件。使用 diagnosing-bugs 的最小可重复反馈方法验证导入等问题，修复及写入回归测试留待后续。

## Standards（实现与标准）

| 编号与级别 | 位置、触发和影响 | 依据及修复建议 |
| --- | --- | --- |
| S1 **P2** 工作簿解压资源上限缺失 | [excel-import.js](../static/v2/excel-import.js#L10)、[safety-valve.js](../static/v2/safety-valve.js#L207)。导入用户主动选取的高压缩比工作簿时，5 MiB 检查只限制压缩文件；SheetJS 在主线程解包，行数限制无法约束所有 ZIP 成员的展开。大文件可阻塞导入页。 | 将真实管道工程模板加入 24 MiB 的高重复闲置 ZIP 成员，压缩后约 233 KB，真实解析器接受且无错误；没有以大文件实测崩溃，拒绝上限缺失可验证。校验 ZIP 成员及实际解压预算，将解析置于可取消、有超时的 Worker，保留合法模板回归。 |
| S2 **P3** 安全阀接受不支持的工作簿 | [safety-valve.js](../static/v2/safety-valve.js#L207)只按 PK/OLE 容器识别，没有验证 XLSX 工作簿类型。 | 用安全阀模板表头和一条演示记录生成 ODS、XLSB，分别改名 .xlsx，实际解析均接受。复用[共享格式检查](../static/v2/excel-import.js#L24)，保留安全阀字段规则，增加两种假扩展名拒绝用例。 |
| S3 **P3** 畸形书签中止导航 | [app.js](../static/v2/app.js#L499)启动及 hashchange 直接解码；访问 /#% 会导致正文不渲染。 | Node VM 和本地 Chrome 均观察到 URIError（URI malformed）及空正文。集中解析 fragment，捕获无效编码，检查已注册路由的自有键并回退默认页，测试启动和页内切换。 |
| S4 **P3** 键盘操作后失焦 | [query-results.js](../static/v2/query-results.js#L47)共享表格在排序、翻页或勾选后整体 replaceWith，仅恢复横向滚动。 | Chrome 里聚焦锅炉设备代码排序，用 Enter 后 activeElement 为 BODY。保留按钮节点，或用表 ID、字段/记录 ID 和操作类型恢复焦点；检查排序、翻页及选中后继续按 Tab 的顺序。 |
| S5 **P2** 专项 E2E 的基线分裂 | [工作流](../.github/workflows/v2-pages.yml#L29)只运行 Pages E2E；多个专项脚本绑定 Windows 全局 Playwright 目录、8020、旧控件或 CSV，例如 [equipment-common](../tests/v2/equipment-common.e2e.cjs#L11)。一些单测也写历史报告，例如 [device-scope](../tests/v2/device-scope.test.cjs#L15)。 | 本轮 40 个 E2E 最终 20 过、20 失败，7 个首错把 XLSX 当 CSV。旧断言也掩盖脚本后续尚未执行的业务覆盖。统一 runner、依赖、base URL、产物目录和失败退出；先修确认过时的断言，再让可靠专项用例进入 CI。 |
| S6 **P3** V2 开发入口与验收说明过时 | [V2 README](special-equipment-v2/README.md#L1)有并列的“运行中／已停止”和九类标题，[测试 README](../tests/README.md#L15)主要描述原 CMMS。照此开发可能启动 P0 或误读旧验收。 | 与[导航注册](../static/v2/config.js#L532)、[工作流](../.github/workflows/v2-pages.yml#L29)及本轮启动依赖逐项比对。未来经确认后建立简短 V2 协作入口，按任务链接指南，写出可核对的完成标准。见下文建议。 |

## Spec（行为与需求）

| 编号与级别 | 位置、触发和影响 | 依据及修复建议 |
| --- | --- | --- |
| F1 **P2** 单位删除重排人员身份 | [inspection-unit.js](../static/v2/inspection-unit.js#L35)先恢复已删除单位后的数组，[personnel.js](../static/v2/personnel.js#L10)再用当前单位数组位置生成固定的人员 ID 和关联，[人员查询字典](../static/v2/query-dictionaries.js#L23)按同一人员 ID 分类。 | 浏览器删除 DEMO-ORG-001 后刷新，人员 001/002/003 分别改指 002/003/004，人员 004 消失；Node VM 独立复现。与[按 ID 关联的说明](special-equipment-v2/personnel/README.md#L25)冲突。将人员种子及单位 ID 从单位列表顺序分离，明确删除后显示缺失或阻止删除，验证刷新前后身份及人员组合查询。 |
| F2 **P2** 高级条件不可见但仍影响结果 | [app.js](../static/v2/app.js#L187)共享七类页面退出高级时只清 draft，不清已应用 filters；[通用路径](../static/v2/app.js#L472)另有一套切换行为。用户无法从可见控件解释结果。 | Chrome 中锅炉高级设备代码 DEMO-GL-001 得到 1 条，切换普通仍是 1 条，重新展开字段为空仍是 1 条。装置路径用无匹配代码后切换普通则回到 8 条。统一草稿和已应用条件的切换规则，选择明确保留且可见，或同时清理；覆盖普通、高级和导出的结果一致性。 |
| F3 **P2** 电梯历史详情丢失类别、性质 | [dossier.js](../static/v2/dossier.js#L355)生成既有演示值，[inspection-record-dialogs.js](../static/v2/inspection-record-dialogs.js#L34)只构建当前字典选项后设置历史值，字典外值变空。 | Chrome 中父表类别“演示检验记录”、性质“定期检验（模拟）”，打开详情两项均为空；[现有 E2E](../tests/v2/inspection-record-dialogs.e2e.cjs#L29)也在类别处失败。对历史字典外值插入只读显示选项，分别断言类别和性质；其他使用同一控件的历史类型可能受同样影响，未逐个验证。 |
| F4 **P3** 七类设备导出与显示配置分叉 | [表格设置](../static/v2/app.js#L170)已切换到独立持久化字段配置，旧导出仍取 st.columns 初始列和原始行顺序，[导出函数](../static/v2/app.js#L195)。排序或隐藏／重排列后，文件与当前显示不同。 | 锅炉 UI 按设备代码降序 008…001，XLSX 仍 001…008。以临时浏览器设置隐藏“智慧监管编码”，页面消失，实际 XLSX 仍首列输出。先确认七类的导出契约是显示视图还是完整台账；若须一致，统一列与排序投影并加带配置的导出测试。若全量是设计，明确提示隐藏列仍导出。产品全字段、全匹配导出的既有契约单独保留。 |
| F5 **P3** 管道汇总提示承诺打印 | [app.js](../static/v2/app.js#L377)工具栏写“打印”，[处理器](../static/v2/app.js#L430)只打开只读汇总预览，未生成打印内容。 | 查询装置、选择同使用单位同类别的装置，再点击汇总，代码只生成标题、数量、明细和弹窗，未调用打印。将入口提示改成预览，或由产品决定增加标明演示性质的打印。 |

## 其他核查与范围边界

- **安全与异常。** 非供应商 V2 JS 中检索到的 innerHTML 只用于[内置 SVG 常量](../static/v2/app.js#L47)。抽查导入、搜索、结果和弹窗数据渲染多使用 textContent 或控件 value，未发现已证实的动态 HTML 注入。XLSX 的编号字符串不强转数字，合法日期以 Excel 序列保存，业务列映射由调用方给出；若 Excel 源文件已把超长编号以数字存入，导出无法恢复原始精度。CSV 的公式前缀处理有实现，未做各 Excel 版本及控制字符变体的完整互操作验证。静态 Pages 没有本地预览的 CSP 响应头，未证实可利用链。
- **存储与事件。** 单位/人员问题已独立证实；单位及查询方案的跨标签页竞争属于设计风险，本轮未在浏览器复现丢失更新。已查到产品弹出菜单用 AbortController 清理监听和共享 modal 的关闭/溢出恢复；未做长期内存曲线或全部弹窗的焦点、滚动测试。S4 只统计实际确认的键盘焦点问题。
- **范围决策。** 导入人员可进入主档案；Chrome 验证录入一人后主表 4→5，人员综合查询两类各仍为 2。分类只覆盖固定演示人员 ID，现行模板缺少权威分类，不能把职务或无损属性猜成分类。应在说明中写清数据边界，或在另行确认分类规则后接入。[人员导入](../static/v2/personnel.js#L75) · [人员类型](../static/v2/query-dictionaries.js#L23)
- **历史差异。** 安全阀导出在 7716bb4 已有明确移除，旧 README 标明历史页面记录。当前功能清单按无导出记录，不计作意外回归。装置新增缺正式保存、真实认证及跨账号数据同步是范围限制，见[功能盘点](v2-feature-inventory.md)。

## 智能体协作说明审查

未找到现有 AGENTS.md。根 README、V2 历史 README、测试 README 的对象和时效不同。建议以后经确认建立一份短入口，放每次任务都需要知道的 V2/P0 分界、允许数据范围和编辑/部署限制。测试命令、启动前提和专项历史放在各自资料页，用明确触发语句链接，例如“修改 V2 导入/导出时，先读模板规则并在根路径和项目子路径核对文件”。完成标准建议要求记录构建的文件数、测试命令和通过/失败/未跑项，以及修改前后工作树差异。此次未新增或编辑智能体说明文件。

## 本轮验证

| 项目 | 实际结果 |
| --- | --- |
| 静态构建 | python -B scripts/build_v2_pages.py 及 --check 均返回 0，各验证 44 个公开文件。 |
| V2 单测 | node --test 'tests/v2/*.test.cjs'，16 个脚本全部通过，0 失败、0 跳过。脚本中的子断言不重复计为独立测试文件。 |
| Pages E2E | 首轮与专项并发时触及审计的外部 110 秒限时；单独重跑返回 0。Windows Chrome/Chromium 157.0.8103.39 在静态根、/special-equipment-v2-demo/、本地 8020 三种挂载各通过 21 个菜单、17 类 XLSX 文件名/列序/类型/行范围和主要交互。未重跑 Ubuntu GitHub Actions。 |
| 专项 E2E | 目录有 40 个 .e2e.cjs（含 Pages），全部尝试。合并 Pages 单独重跑后 20 通过、20 失败，0 未启动。每个失败脚本只归因到已观察到的第一个断言，其后未到达的用例不认定通过。 |
| 历史保全 | preservation.py 依赖项目外 P0、原数据库及参考图归档，并带有“V2 无 Git 元数据”的旧断言，本轮不执行。临时 8020 使用单独的文件存在哨兵供历史脚本比对，未把快照数据库完整性算作验证。 |

| 专项失败分类 | 脚本名去掉 .e2e.cjs | 实际现象 |
| --- | --- | --- |
| XLSX 被按 CSV 读取（7） | batch2-edges、boiler-alignment、boiler-product、equipment-common、personnel、pipe-products、product-batch3 | 读二进制为 UTF-8，再按逗号、换行或文本搜索断言；Pages 用 SheetJS 验证当前导出。 |
| 当前分页/编辑行为与历史断言不一致（3） | batch2、ui、vessel-product | 前两者断言 5 行，实得 8；后者断言无可编辑控件，现可改类别。 |
| 已确认业务缺陷（1） | inspection-record-dialogs | 电梯检验详情读取为空，见 F3。 |
| 结构、字段标签或定位不一致（9） | device-scope、dossier、empty-visibility、headers-state、inspection-unified、inspection-unit-info、inspection-unit、installation-detail、more-dialogs | 首错分别涉及档案分类代码、旧搜索 ID、空态 CSS、固定选择列、管线详情标签、地区控件、信用代码标签、子设置弹窗和分页按钮。不能仅凭定位超时推定全部是旧测试或全部是业务缺陷。 |

通过的 20 个脚本为 crane-refinement、elevator-more、elevator-refinement、inspection-unit-refinement、installation-refinement、more-dialogs-edges、pages、person-query、personnel-import、pipe-query-settings、pipeline-refinement、product-import、query-builder-refinement、query-domains、safety-valve、table-settings-dialogs、table-settings-editable-tables、table-settings-refinement、table-settings-regression、table-settings-subtables。浏览器脚本、截图和报告在临时副本运行，未覆盖仓库已有验收材料。

## 后续顺序

1. 先补 F1、F2、F3 的最小回归，再修当前缺陷。优先保护人员身份和业务关联。
2. 限制工作簿解压和解析时间，统一格式守卫。把实际工作簿、异常导入和跨模块重载写入专项验收。
3. 更新过时断言和统一测试入口。明确导出列与排序契约，补键盘操作及路由容错。
4. 经确认更新 V2 协作入口和当前状态索引，再按[架构评估](v2-architecture-review.md)逐项推进，避免先重写公共渲染。

## 第一批修复记录（F1、F2、F3）

本节记录基于 6a1d4a3 工作树的修复。上文的缺陷描述、分级和测试数据保留为原始审计记录。其余 2 个 P2 和 6 个 P3 继续保持原状态。

| 缺陷 | 状态与修复 | 修复前后的验证依据 |
| --- | --- | --- |
| F1 | **已修复。** [演示人员种子](../static/v2/personnel.js#L11)明确列出人员 ID 与原单位 ID，单位字段仍按 ID 实时查找。删除后缺失的关联字段保持为空，人员详情注明原单位 ID。既有人员导入、检验单位和组合查询存储格式保持兼容，未添加迁移或清理逻辑。 | [人员导入 E2E](../tests/v2/personnel-import.e2e.cjs)先用实际 Excel 导入两人，再通过单位列表排序、删除 DEMO-ORG-001。修复前刷新导致三个关联重排并丢失人员 004；修复后删除前、删除后和刷新后的记录数与稳定身份按预期，非被删单位关联及导入数据不变，原导入键内容逐字节相同。组合查询验证分类、关联和资格投影，并实际保存、执行查询方案核对结果。 |
| F2 | **已修复。** [共用查询页](../static/v2/app.js#L187)退出高级查询时仅保留普通字段，清理高级专属的草稿和已应用条件。有过查询时以当前有效普通值重算；初始空表保持。重算回到第一页并清除旧勾选，保留排序、每页数量及字段设置。普通字段或其高级区副本存在无效输入时仍可留在当前模式修正。 | [回归 E2E](../tests/v2/audit-fixes.e2e.cjs)在七类设备上均先复现切回后仍只有一条结果；修复后恢复八条，重新展开的高级设备代码为空。另覆盖未提交高级草稿、普通关键词、两处共享梯龄控件、无效数字和反向区间，以及锅炉重置、分页、排序、选择和 XLSX 实际行范围。装置、管线各验证切回普通时原有行为，未改其实现。 |
| F3 | **已修复。** [共享检验详情](../static/v2/inspection-record-dialogs.js#L34)把字典外原值加入当前禁用下拉框的本地选项。空值仍按原规则展示。字典、历史记录及检验结论的原始数据保持原样。 | [回归 E2E](../tests/v2/audit-fixes.e2e.cjs)修复前在电梯检验类别断言失败；修复后电梯历史类别、性质与起重机械的字典内类别、性质均正确显示。两类均比对结论、日期、机构和报告编号，两次打开/关闭后父表内容一致。旧综合脚本也通过电梯和其余六类设备的两个入口，再停在装置旧标签定位。 |

### 修复后的本地验证与审查

- V2 单测 16/16；静态构建及产物校验各确认 44 个公开文件。报告产物会落盘的旧单测和专项脚本在临时副本执行。
- Pages 核心 E2E 在 Windows Chrome（Chromium 157.0.8103.39）返回 0。静态根路径、项目子路径和本地 8020 各通过 21 个菜单、17 类 XLSX 及主要交互。未运行 Ubuntu GitHub Actions。
- 新增 F2/F3 浏览器测试 11/11。人员导入及关联专项在本地 8020 和静态项目子路径均通过。
- 既有受影响专项共运行 14 个脚本，10 个通过。equipment-common、boiler-alignment、personnel 三个脚本仍按 CSV 解析 XLSX，与原审计首错一致。inspection-record-dialogs 原先在电梯类别断言失败，本次已通过该断言，随后首次到达装置详情旧定位。当前装置详情只有“压力管道装置／压力管道管线”两个标签。未以改动断言掩盖上述失败。
- Standards 轴查出普通数值控件及高级区共享副本的原生校验漏洞，补充失败用例并修复；没有发现其他已证实的标准违规。Spec 轴复核了人员稳定关联、查询状态和只读历史值，建议补充未提交高级草稿的覆盖，已纳入回归。
- 既有人员导入模板不含权威人员分类，导入人员仍按原规则显示在主档案。七类设备按列配置导出以及导出行排序的契约差异仍归 F4。
