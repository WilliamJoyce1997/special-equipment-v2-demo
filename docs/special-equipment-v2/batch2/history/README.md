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
