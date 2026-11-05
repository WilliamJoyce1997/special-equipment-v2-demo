# 历史检验组件统一与滚动修复

本轮仅调整 V2。未操作 P0、数据库、迁移、Git 提交或公网部署，未保存用户参考图。

## 实现

- 新增 static/v2/inspection-history.js，提供 V2InspectionHistory.create，共用当前设备上下文、V2Dossier.histories、latestHistories 与 recordTable。
- 设备检验子标签页和“更多 → 检验信息”使用同一个三表组件。全部子标签页自然沿用该组件。
- 三表：已完成检验信息、正在检验流程、延期检验申请。两入口共享查询类别、最新筛选、禁用工具栏、四个记录操作、分页、选择和统计逻辑。
- 详情为只读记录；报告、附件、意见书仍显示暂无演示文件。新增、删除、登记保持禁用。未新增检验样本。
- 每个视图保留自身筛选/分页状态，不同步两个入口的临时筛选状态；相同条件的结果完全一致。
- 检验弹窗采用 flex 列布局，标题和底部不收缩，仅 #dialog-body 纵向滚动。三表独立横向滚动，无额外表格纵向滚动。
- 其他六个详情子标签页、精简档案及九类设备列配置未改动。

## 修改文件

- static/v2/inspection-history.js（新增共享组件）
- static/v2/dossier.js（仅替换检验三表入口）
- static/v2/more-dialogs.js（移除重复实现，调用共享组件）
- static/v2/styles.css（限定检验弹窗和共享表格）
- static/v2.html（加载共享脚本）
- v2_server.py（静态资源白名单增加共享脚本，无业务后端变更）
- tests/v2/inspection-unified.e2e.cjs（新增针对性验证）
- tests/v2/more-dialogs.e2e.cjs（旧检验表选择器适配共享组件）

## 实际验证

- node --check：三个修改的 JS 文件通过。
- node tests/v2/inspection-unified.e2e.cjs：32 通过，0 失败，0 跳过。
- node tests/v2/more-dialogs.e2e.cjs：59 通过，0 失败，0 跳过。
- 合计 91 项检查通过，无浏览器 JS/console 错误。
- 九类设备两入口记录、字段、类别、筛选结果、工具栏、操作与三表结构一致。
- 检验记录详情与文件提示可返回，列表查询/排序/分页/选择状态在弹窗关闭后保留。
- 1366、1920、768、390px 验证弹窗只有正文纵向滚动，标题及底部位于视口内、表格可横向滚动；桌面冻结列无重叠。
- 只运行上述针对性验证，未重新执行全量 Django 或全部列表测试。
- 一次非提权 PowerShell HTTP 检查被沙箱套接字权限阻止；浏览器测试访问正常，最终服务检查使用授权环境执行。

## 实际浏览器截图

- [弹窗桌面](screenshots/modal-1366.png)
- [详情桌面](screenshots/detail-1366.png)
- [弹窗窄屏](screenshots/modal-390.png)
- [详情窄屏](screenshots/detail-390.png)

## 交付与限制

本地预览 http://127.0.0.1:8020 。本轮完成后保留服务运行，等待人工验收。
当前数据仍为前端虚构样本，无真实法定检验效力；正在检验流程、延期申请保持空表。
无本轮已知阻塞问题。CSV、重置等未改动功能未单独重新跑完整测试，不据此宣称全量回归已完成。

