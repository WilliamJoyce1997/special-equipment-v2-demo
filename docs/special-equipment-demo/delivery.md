# P0 交付说明

日期：2026-10-28。第二阶段A收敛完成，等待人工验收，不进入P1/P2。

## 运行位置与访问
- 工作树：C:/Users/willi/.codex/worktrees/special-equipment-p0/OpenCMMS
- 分支：codex/special-equipment-p0，HEAD仍为fc1e0e8；所有代码为可审查的工作区改动，未commit/push/merge。
- Demo：http://127.0.0.1:8010/static/login.html （只监听本机）。
- 用户原8000实例、原checkout业务源码与原始数据库保留。
- 本地终端在工作树执行 python start.py --show-accounts 查看虚构账号随机密码；凭据在.local/demo-accounts.json且限制ACL，不入Git。
- 正常重启 python start.py --port 8010；首次准备副本才使用 --prepare-demo，不会使用原始db.sqlite3。

## 已完成
单位/角色/服务授权和数据隔离，特种设备台账、受控模拟准入、生命周期时间线、维护维修任务流转、点检计划/任务/执行/异常维修/独立复核、备件库存流水、实际数据报表及七菜单响应式UI。检验日期为人工模拟，检测检验结果明确未实现。

模型新增/扩展：Organization、Membership、IdempotencyReceipt；Asset及服务授权、DemoAdmissionProfile、LifecycleEvent；WorkOrder及过程字段、MaintenancePlan默认单位/执行人；InspectionPlan/Task/Issue及Record/Template扩展；SparePart归属和PurchaseRequest归属。未创建P1检测/检验/报废模型。

## 数据安全与验证
原库备份：D:/Projects/OpenCMMS/.local/backups/20261028-151711，完整性和恢复副本检查通过。
开发.local/development.sqlite3、测试.local/test-p0.sqlite3、演示.local/demo.sqlite3物理分离。
原库SHA与备份时一致；开发副本assets/users/work_orders/maintenance_plans/audit_logs原列逐行一致，integrity_check=ok、外键无异常，历史回填96事件。
最终针对性测试21通过、Node3通过、限定浏览器16项通过；中间完整回归49通过。完整E2E最后时序失败与分段验收见test-results.md；不声称未重跑的完整脚本已最终通过。

## 新增迁移
- assets/migrations/0003_asset_archived_at_asset_equipment_category_and_more.py
- assets/migrations/0004_backfill_lifecycle.py
- inspections/migrations/0003_inspectionrecord_idempotency_key_and_more.py
- maintenance/migrations/0003_maintenanceplan_default_assignee_and_more.py
- spareparts/migrations/0003_purchaserequest_requesting_org_and_more.py
- users/migrations/0002_organization_membership_idempotencyreceipt.py
- workorders/migrations/0002_workorder_accepted_at_workorder_accepted_by_and_more.py

## 实际修改文件
- assets/admin.py
- assets/models.py
- assets/serializers.py
- assets/views.py
- cmms_project/settings.py
- cmms_project/urls.py
- inspections/admin.py
- inspections/models.py
- inspections/urls.py
- inspections/views.py
- maintenance/admin.py
- maintenance/models.py
- maintenance/serializers.py
- maintenance/views.py
- reports/admin.py
- reports/urls.py
- reports/views.py
- requirements.txt
- spareparts/admin.py
- spareparts/models.py
- spareparts/serializers.py
- spareparts/views.py
- start.bat
- start.py
- static/css/common.css
- static/index.html
- static/js/api.js
- static/js/assets.js
- static/js/index.js
- static/js/maintenance.js
- static/js/workorders.js
- static/login.html
- tests/conftest.py
- tests/test_assets.py
- tests/test_auth.py
- tests/test_workorders.py
- users/admin.py
- users/models.py
- users/serializers.py
- users/urls.py
- users/views.py
- workorders/admin.py
- workorders/models.py
- workorders/serializers.py
- workorders/urls.py
- workorders/views.py

## 实际新增文件
- .gitignore
- assets/lifecycle_models.py
- assets/migrations/0003_asset_archived_at_asset_equipment_category_and_more.py
- assets/migrations/0004_backfill_lifecycle.py
- assets/services.py
- cmms_project/exceptions.py
- cmms_project/test_settings.py
- docs/special-equipment-demo/current-state.md
- docs/special-equipment-demo/demo-script.md
- docs/special-equipment-demo/design.md
- docs/special-equipment-demo/implementation-log.md
- docs/special-equipment-demo/known-issues.md
- docs/special-equipment-demo/requirements.md
- docs/special-equipment-demo/tasks.md
- docs/special-equipment-demo/test-results.md
- inspections/migrations/0003_inspectionrecord_idempotency_key_and_more.py
- inspections/planning_models.py
- inspections/serializers.py
- inspections/services.py
- maintenance/migrations/0003_maintenanceplan_default_assignee_and_more.py
- pytest.ini
- reports/services.py
- spareparts/migrations/0003_purchaserequest_requesting_org_and_more.py
- spareparts/services.py
- static/js/inspections.js
- static/js/reports.js
- static/js/spareparts.js
- static/js/ui.js
- tests/frontend/api.test.cjs
- tests/frontend/p0.e2e.cjs
- tests/frontend/p0.smoke.cjs
- tests/test_boundary_regressions.py
- tests/test_p0.py
- tests/test_p0_edges.py
- tests/test_review_additional.py
- tests/test_review_regressions.py
- tests/test_security_initial.py
- users/access.py
- users/admin_security.py
- users/management/commands/seed_special_equipment_demo.py
- users/migrations/0002_organization_membership_idempotencyreceipt.py
- users/unit_models.py
- workorders/migrations/0002_workorder_accepted_at_workorder_accepted_by_and_more.py
- workorders/services.py

## 人工验收
1. 访问8010，按本地受控方式获取账号。
2. 先用demo_manager查看台账、点检记录、报表和已有成功样本时间线。
3. 按demo-script.md新建唯一DEMO-SE-LIVE编号，切换维护/点检/维修/使用方账号走完整闭环。
4. 报表筛选本次设备核对2次点检/1条异常/1个维修完成，切到demo_other确认不可见。
5. 审核known-issues.md及测试限制；本轮停止，不会自动推进P1。

