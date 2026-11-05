# P0 验证结果与限制

日期：2026-10-28。所有写入测试均在隔离工作树；未操作原始库。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 原库在线备份及恢复副本 | 完整性ok、外键无异常，备份期间原库SHA不变 | D:/Projects/OpenCMMS/.local/backups/20261028-151711/manifest.json |
| 修复前原31例+3安全例 | 30通过、4失败 | .local/baseline-tests.xml/log |
| 初次完整迁移后回归 | 26失败、14通过；主要为旧测试无单位/绕过新接单规则 | .local/full-first.xml/log |
| 修正用例业务前提后的完整回归 | 49通过 | .local/regression.xml/log（审阅最终修复前版本） |
| 审阅问题回归 | 先分别4失败，修复后4通过；边界/额外审阅同样先失败后通过 | .local/boundary-red/green.log、review-red/green.log、review-additional-red/green.log |
| 最终针对性核心回归 | 21通过，未跳过 | .local/final-targeted.xml/log |
| Node API单元测试 | 3通过：204、刷新后保留PATCH/body、字段错误提示 | tests/frontend/api.test.cjs |
| 全部前端JS语法检查 | 通过；最终变更再针对相关文件检查 | node --check |
| Django system check | 0问题 | 最终终端输出 |
| makemigrations --check --dry-run | No changes detected | .local/migration-check.log |
| 开发副本迁移 | 7份新增迁移应用完成；原列逐行对比一致 | .local/development-migration.log、development-final-migration.log、final-data-safety.json |
| 虚构Demo seed | 连续两次成功，无重复初始建档、不重置密码或业务状态 | .local/demo-migration.log及终端输出 |
| 核心真实浏览器交互 | 设备→维护→点检异常→维修→独立复核复用→时间线→报表已执行 | .local/e2e.log；最后全脚本因未等流水弹窗导致行数断言失败 |
| 最终限定浏览器验收 | 16检查通过、页面脚本错误0；七页/时间线/报表/流水/四尺寸/单位隔离 | .local/final-browser.json/log |
| 原始数据库保护 | 当前SHA与本轮备份时完全一致；原记录未动 | .local/final-data-safety.json |

## 迁移与数据核对

原库SHA-256：1391ec130fb6beba13350d3dd716660cd0a645b3d6055cc9fcaa786dc5641f64。
开发副本原列对比：assets、users、work_orders、maintenance_plans、audit_logs全部一致；integrity_check=ok，foreign_key_check为空；原始93设备/3用户/2工单/3保养/21审计保留。增补96条可证明的历史生命周期事件，未虚构缺失动作。

原库只读连接用于备份与比对；未迁移、清理或seed。测试配置将数据库固定到.local/test-p0.sqlite3；Demo使用.local/demo.sqlite3，开发使用.local/development.sqlite3。

## 如实保留的失败及未执行项

- 初始安全失败均为真实缺陷；通过新增权限/单位scope和受控服务修复，未为旧测试重新开放漏洞。
- 浏览器初始失败分别发现空计数默认值、默认受托下拉异步竞争；已修复。账号切换、关联工单/记录跳转和时间线/流水断言的等待时序已修订。
- 最后完整E2E在主要业务链、时间线、报表断言均成功后，因流水弹窗加载等待缺失而失败；之后只按用户收敛要求补做范围限定smoke，16项通过，未再次运行全链。
- 未执行requests旧localhost写入脚本、未运行生产并发压测、未做公网安全审计、未验证干净机器重装及IIS部署、未执行P1/P2测试。
- XLSX/CSV旧导入导出保留；CSV工单映射问题有专项回归，所有导出格式和旧式.xls未做全面浏览器验收。
