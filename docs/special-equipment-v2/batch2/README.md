# V2 第二批交付与验收

状态：设备管理九类页面均已完成可操作的纯前端演示，等待人工验收。其他基础档案分类仍只有菜单和明确待开发说明。

## 项目与访问

独立副本：C:/Users/willi/.codex/worktrees/special-equipment-v2/OpenCMMS（无Git元数据）。
预览：http://127.0.0.1:8020/ 。无需账号，仅显示前端虚构样本，不挂载业务API或管理员。
原P0：127.0.0.1:8010服务未修改；源代码与演示库核对不变。

## 六个新增页面与实际截图

|页面|专有字段/差异|1920真实截图|1366真实截图|
|---|---|---|---|
|起重机械|检验类别；额定起重量、跨度|[crane-1920](screenshots/crane-1920.png)|[crane-1366](screenshots/crane-1366.png)|
|场（厂）内机动车辆|厂牌编号；车辆型号、载荷、动力方式|[vehicle-1920](screenshots/vehicle-1920.png)|[vehicle-1366](screenshots/vehicle-1366.png)|
|大型游乐设施|设备识别码；额定乘员、运行高度|[amusement-1920](screenshots/amusement-1920.png)|[amusement-1366](screenshots/amusement-1366.png)|
|客运索道|索道型号、线路长度、速度、每小时运量|[ropeway-1920](screenshots/ropeway-1920.png)|[ropeway-1366](screenshots/ropeway-1366.png)|
|压力管道装置|社会信用代码、创建时间、告知单编号；装置/管线数量及长度、汇总预览|[installation-1920](screenshots/installation-1920.png)|[installation-1366](screenshots/installation-1366.png)|
|压力管道管线|管道名称/级别、重要管道、长度区间；严格31列、全部字段导出|[pipeline-1920](screenshots/pipeline-1920.png)|[pipeline-1366](screenshots/pipeline-1366.png)|

每类8条虚构样本。共同支持组合筛选/重置、区间、分页、排序、详情、列设置及CSV。六页行操作提供模拟检验信息、预置修改记录、虚构监管编码。新增/更改检验机构等需要后端的操作明确未接通，不返回业务成功。

## 测试结果

- 小批次A：45项通过。
- 最终六页与九类导航：83项通过，包含完整31列表头、详情、CSV、固定列、装置关联、1366/1920及768/390布局交互。
- 第一批回归：42项通过；其中41项保留原行为断言，原“管线占位页”一项按本轮要求改为“已完成31列”。
- 补充边界：13项通过，含前三页CSV实际下载、汇总未选/跨单位/停用排除及正确长度、锅炉/容器768与390窄屏查询详情。
- 系统检查和JS语法检查通过；无控制台错误。失败及修复经过见 verification.md。

结果文件：stage-a-results.json、test-results.json、edge-results.json；第一批回归结果在上级test-results.json。

## 启动/关闭

PowerShell：

~~~powershell
Set-Location 'C:/Users/willi/.codex/worktrees/special-equipment-v2/OpenCMMS'
C:/miniconda3/python.exe v2_server.py
~~~

服务已运行时不要重复启动。前台启动用Ctrl+C停止；后台停止需先核对8020所属进程命令行为本副本v2_server.py，再仅停止该进程。静态文件变更后需重启V2（WhiteNoise缓存）；不得停止8010。

## 人工验收步骤

1. 从设备管理依次打开九类，确认均为查询表格页；核对新增六类查询排列及专有字段。
2. 综合查询分别用 DEMO-QZ-003、DEMO-CC-003、DEMO-YL-003、DEMO-SD-003、DEMO-ZZ-003、DEMO-GX-003，各剩1条；重置回8条。
3. 用类别、日期范围和多条件查询；管线长度200–400应剩2条。无匹配时显示空结果。
4. 点击表头两次核对升降序，下一页3条；每页10条显示8条；详情关闭后保留筛选。
5. 各类设置隐藏列、滚动宽表、实际下载CSV；管线隐藏“管道止点”后导出仍有完整31个表头。
6. 管线横向滚动到右端，桌面序号/操作固定；详情可见完整字段，修改记录明确虚构。
7. 装置页勾选DEMO-ZZ-002，汇总应为1条在用管线、220m；混选不同单位/类别应给出条件提示；新增提示未接通。
8. 切换顶部标签、缩至768/390测试导航与查询；其他基础档案分类仍明确待开发。

## 数据与范围

所有记录来自static/v2/fixtures.js，均虚构且不写SQLite。管线通过installationId关联装置，单位、地区、名称、信用代码一致；下检日期、全面检验日期、检验日期为独立预置样本，没有法定周期推算。

配置明细见[fields.md](fields.md)，视觉差异见[differences.md](differences.md)，后续清单见[remaining-modules.md](remaining-modules.md)。
没有新模型、迁移、P1/P2业务、Git提交/推送或公网部署。完成本批后停止，等待人工验收。
