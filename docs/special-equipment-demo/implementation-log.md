# P0 ledger — docs/special-equipment-demo/tasks.md
- T01: consistent backup and restore OK at D:/Projects/OpenCMMS/.local/backups/20261028-151711. Original unchanged during backup; assets93/users3/work_orders2/maintenance_plans3/audit_logs21/migrations51.
- Isolated worktree: C:/Users/willi/.codex/worktrees/special-equipment-p0/OpenCMMS; codex/special-equipment-p0. Original8000 left running.
- Development .local/development.sqlite3 (copy); pytest .local/test-p0.sqlite3; fictional Demo .local/demo.sqlite3.
- Ruling: isolated worktree protects user changes/server reload. No commits or automatic merge per user.
- Baseline: 30 passed/4 failed (.local/baseline-tests.xml): generated-code assertion mismatch plus 3 reproduced security defects.
- Preflight: unit scope before all APIs; events/state/stock atomic; only fictional confirmed profile permits simulated admission.

## 收尾结果
- 6份schema迁移+1份历史回填迁移；开发副本原列逐行一致，96条可证明历史事件；原库SHA保持备份时值。
- 中间完整回归49通过；最终受影响模块21通过；Node3通过；system check无问题；迁移check无差异。
- 一次整体只读审阅的8项Important均已补回归并修复。双向来源链接和XLSX下载后缀按实际可用性处理，未扩展P1。
- Ruling：内部评论只入技术审计/本单位评论列表，不将其正文写进公共设备时间线；避免用owner权限间接泄露供应商内部信息。
- Ruling：计划执行人变更只影响之后生成任务；既有任务仍由task.executor读取并执行。
- Ruling：授权按工单类型及单位能力校验，不以其他服务授权代替已撤销的授权。
- Ruling：用户要求收敛，不再全量复审/反复跑全链；完整E2E最后未等流水弹窗的历史失败保留，之后分段浏览器16项检查通过，等待逻辑已修订但未再整链运行。
- Deferred：干净机器安装/IIS部署、旧式.xls/高级导入导出边界、压力测试及P1/P2不实施；详见known-issues.md。
- 当前停止P0开发，保留8010本地Demo及所有联调数据/日志供人工验收。
