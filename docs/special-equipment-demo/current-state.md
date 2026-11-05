# OpenCMMS 源码与数据现状核查

> 核查日期：2026-10-28。根目录 D:\Projects\OpenCMMS；分支 main；HEAD fc1e0e8。本稿区分源码存在、端到端可用和设计目标。

## 1. 方法、证据和限制

实际读取七个业务 app 的 models/serializers（存在者）/views/urls、配置与 Celery、静态页面及 JS/CSS、requirements.txt、manage.py、启动及部署脚本、迁移与测试文件。通过 Python 标准库 sqlite3 的 mode=ro 与 PRAGMA query_only=ON 查询表结构、计数、迁移登记、完整性和外键；没有导出账号密码、Token 或业务明细。

未执行 start.py/start.bat、Django migration、测试脚本、安装或写 API。原因是启动脚本会安装/迁移，tests/backend 的多份脚本直接向 localhost 发送 POST/DELETE，可能污染现有库。未执行 Django 初始化以避免日志或缓存写入。API 缺陷结论以源码静态证据为主，尚未通过写入请求复现。

本执行环境对 http://127.0.0.1:8000 的无认证 GET（静态页、assets、inspections、reports）均得到 URLError，无法验证本机浏览器会话；用户已说明浏览器可访问，不能据此断言项目停机。布局评估基于 HTML/CSS，不冒充截图或交互验收。

远程项目主页已只读查看：[GitHub 仓库](https://github.com/shenqiang3332314/OpenCMMS)。本地实际源码优先；没有 fetch/pull，也没有证明本地与远程当前版本完全一致。

## 2. 源码结构与严格分级

“已实现”仅指所列源码链路存在，未表示本次运行测试通过。“部分实现”表示存在关键层但流程/契约/权限有缺口。

| 路径 | 实际内容 | 分级 |
| --- | --- | --- |
| assets/ | Asset 模型、列表/详情序列化器、CRUD、筛选、树/子设备、保养逾期、Excel/CSV 导入及 Excel 输出、admin | 通用台账主体已实现；特种设备档案部分实现 |
| workorders/ | WorkOrder、评论、用料；CRUD、assign/start/complete/close/my_orders/overdue、导入导出、审计与 UI | 基础工单主体已实现；协同权限与严谨状态机部分实现 |
| maintenance/ | 时间/计数保养计划、工单模板、CRUD、启停、手动生成 PM 工单、频次判断方法及 UI | 部分实现；自动调度未形成业务链路 |
| inspections/ | InspectionRecord/Template/Route、迁移、admin；views.py 为默认模板，urls.py 空列表，无 serializers.py | 模型部分实现；业务页面占位，API 完全缺失 |
| reports/ | ScheduledReport/ReportRun、迁移、admin；views.py 默认模板，urls.py 空列表，无 serializers.py | 配置模型部分实现；统计页面占位，聚合 API/任务缺失 |
| spareparts/ | SparePart/PartTransaction/PurchaseRequest 模型、备件 CRUD/低库存和出入库 action | 部分实现；字段契约及前端操作不完整 |
| users/ | AbstractUser 扩展、五种 role、JWT 登录/刷新、用户 CRUD/注册/me、AuditLog/admin | 认证链路已实现；业务权限部分实现，多单位隔离完全缺失 |
| cmms_project/ | SQLite、JWT、静态文件、七 app API 挂载、Celery 初始化/调试任务 | 项目骨架已实现，开发配置待收敛 |
| static/ | login.html、index.html、common.css、api/assets/workorders/maintenance/index.js 和调试页 | 既有前端已实现；点检/报表为占位 |
| templates/ | settings 声明目录，但本地目录不存在 | 当前应用模板完全缺失；主 UI 实际由 static 提供 |
| tests/ | 31 个 pytest 风格用例（认证9、设备12、工单10）、API 脚本、手工 HTML 测试 | 部分实现；未运行，不能认定通过 |

七个 app 的 tests.py 均为 Django 默认空模板。未发现项目级 pytest.ini/pyproject 测试配置；后续应显式配置 DJANGO_SETTINGS_MODULE 并隔离 script tests。tests/frontend 是人工调试页面，不是自动浏览器测试。tests/backend 含 requests 写入当前 8000 服务的脚本，不能在现有库上直接跑。没有现成的点检、报表、多单位、检测检验或报废自动回归套件。

## 3. 两个页面为什么显示“功能开发中”

1. static/js/index.js:901 的 loadInspections() 直接向 page-inspections 写入“功能开发中”；:1000 的 loadReports() 做同样处理，没有发起实际查询。
2. inspections/views.py、reports/views.py 只有默认 render 导入和注释；各自 urls.py 的 urlpatterns=[]。主项目 include 路径存在不代表端点已实现。
3. 两模块没有 serializer，也没有专门的 inspections.js/reports.js。
4. api.js 虽声明 getInspections/createInspection 及几个报表调用，但后端没有承接路由；不能因封装函数存在判为可用。
5. 点检模型 save() 仅依据 items[].ok 汇总 pass/fail，未比较数值阈值，未创建异常工单；warning 也会在有 items 时被汇总覆盖。triggered_work_order 只是外键。模板 frequency_days、路线 JSON 不是具备执行实例和完成率分母的点检计划。
6. 报表模型只保存定时报表配置/运行历史，没有聚合计算、图表 API、业务任务或输出生成器。admin 可维护配置，不代表调度已可用。
7. 设备页现有简单统计弹窗与工作台统计只能算局部统计，不能替代报表统计模块。

## 4. 设备与业务关系

Asset 实际表名 assets。已有 code 唯一编号、name、model/specification、vendor/serial_number、equipment_id、process/machine_name、location_path 与 factory/workshop/line/station、start_date/warranty_expiry、价值/寿命/重要性/成本中心、计数读数、最近/下次保养日期、notes、created_by 和时间字段。不能把 created_by 当设备负责人，也不能把 factory 文本当使用单位隔离标识。缺设备法定类别、使用单位/负责人、安装单位、使用登记、最近/下次检验日期和规则来源。

Asset.status 当前只有 active/inactive/retired/maintenance；没有从建档、安装、待验收到恢复使用的完整状态约束。parent 自关联为 CASCADE；仅防直接自父，未防间接循环，level/tree 递归有风险。

- WorkOrder.equipment → Asset，PROTECT，反向 work_orders；maintenance_plan → MaintenancePlan，SET_NULL。
- MaintenancePlan.equipment → Asset，CASCADE，反向 maintenance_plans。
- InspectionRecord.equipment → Asset，PROTECT；inspector → User，PROTECT；triggered_work_order → WorkOrder，SET_NULL。
- 点检路线存设备/模板 ID 于 JSON，缺数据库外键约束；点检记录没有计划/执行实例/真实执行时间/模板版本外键。
- 工单已有申请人、指派人、执行人、完工/关闭人、计划实际时间、根因、处理、用料费用、JSON 检查表和附件路径。
- AuditLog 是通用操作审计，不是按设备归并的完整生命周期事件；设备 CRUD 等操作未统一记录。

## 5. 用户、权限和安全缺陷

| 编号 | 证据与问题 | 影响/规划 |
| --- | --- | --- |
| R01 | users/views.py 对 create/register 返回 AllowAny；两 serializer 均接收 role | 匿名可申请 admin 业务角色；先关闭开放提权路径，不实际尝试注册 |
| R02 | 用户修改使用 IsAdminUser（is_staff），设备写权限用 role=admin | 两套管理员定义不一致；库中确有一个 admin 角色但非 staff 用户 |
| R03 | workorders/views.py 四个流转 action 只要求 IsAuthenticated | 任意认证用户可尝试分派/启动/完工/关闭别人工单，无受托单位或执行人约束 |
| R04 | WorkOrderSerializer 允许普通更新 status/assignee/assigned_by/completed_by/closed_by 等 | 可绕过动作状态机；设为受控只读，专用 action 服务校验 |
| R05 | 所有业务 queryset 缺单位过滤；用户列表对全部认证用户开放；评论/用料仅认证 | 数据隔离、PII、外键引用及内部评论权限均需补齐 |
| R06 | 默认 SECRET_KEY、DEBUG=True、ALLOWED_HOSTS=*、CORS 全开放且允许 credentials | 开发默认值不宜外网演示；后续配置环境变量和来源白名单 |
| R07 | start.bat 和登录页公开弱演示账号；本次未验证密码有效性 | 演示前轮换，账号受限，不在新文档复制密码 |
| R08 | JS 多处将设备名称/工单摘要等直接插入 innerHTML；JWT 在 localStorage | 存储型 XSS 风险，可能影响 Token；统一 textContent/转义，移除敏感调试输出 |
| R09 | 仓库跟踪 db.sqlite3、日志、pyc；static 有大量调试页 | 发布数据泄露及重复文件风险；先人工确认数据，再规划发布排除与历史治理 |
| R10 | 删除设备/工单存在物理删除与 CASCADE，缺统一留档策略 | 新生命周期对象归档/PROTECT，禁止报废等同删除；补测试 |

上述是源码风险，未做攻击验证，也未证明存在真实密钥泄露或真实企业数据。不要因 DEFAULT_PERMISSION_CLASSES=IsAuthenticated 便认定 action 和对象权限安全。

## 6. 前端与 API 契约缺陷

| 编号 | 实际证据 | 影响与建议 |
| --- | --- | --- |
| R11 | api.js 刷新路径 /auth/token/refresh/，后端 /auth/refresh/；me 调 /auth/me/，后端 /auth/users/me/；logout 无后端路由 | 统一路径；明确 Demo 本地注销与服务端撤销的差别 |
| R12 | 401 重试依赖 response.init，但 fetch Response 不保存原 init；handleResponse 对 DELETE 204 直接 json() | 写请求重试可能丢 method/body，删除成功仍报错；封装保存请求上下文并处理空响应 |
| R13 | assets.js 与最后加载的 index.js 重复定义 searchAssets、showAssetStatistics、applyAdvancedFilter 等全局函数 | 以后加载者覆盖，名称/筛选/详情返回 DOM 恢复需逐项回归，不推倒 UI |
| R14 | api.js stock-in/stock-out，与 DRF 默认 action 路径 stock_in/stock_out 不一致 | 备件按钮调用链失败；统一契约 |
| R15 | PartTransaction 模型为 operator/remark/stock_before/stock_after；视图传 created_by/notes，serializer 引用不存在的 unit_cost/total_cost/created_by/notes | 出入库在库存 save 后才建流水，且无事务，失败可能只改库存；属于阻断缺陷 |
| R16 | 主页面引用 showSparePartModal/stockInPart/stockOutPart/editSparePart，static 下未找到定义 | 备件列表有，关键操作前端缺失；不能声称完整备件管理 |
| R17 | 工作台取工单一页再 filter 计算进行中/待处理；设备总量只查 active；最近工单使用 wo.type 而 API 为 wo_type | 指标口径错误/截断；改后端聚合并统一字段 |
| R18 | assets 轻量列表缺 model/vendor/start_date/process 等，表格/高级筛选会使用；高级筛选传 vendor/start_date_after/before 后端未声明 | 列表空字段、筛选无效；扩展必要列表字段并增加 FilterSet |
| R19 | 设备同步按钮请求 /assets/sync_from_external/，未发现对应后端；批量编辑明确占位 | 演示前标明不可用或明确禁用，不伪造同步完成 |
| R20 | workorders router 先注册空前缀再 comments/parts | 通用 detail 的字符串 pk 可能遮蔽集合路由，后续解析测试确认并先注册固定前缀 |
| R21 | 计划手动生成未调用 check_should_generate，编号 count+1，无业务周期幂等；未发现业务 Celery tasks | 频繁点击/并发可能重复或冲突；P0 采用同步显式生成+唯一键，不依赖 Redis |
| R22 | AssetSerializer 声明 is_overdue，但模型为 is_overdue_for_maintenance() | 字段可能被跳过；明确只读映射，不能混为检验逾期 |

## 7. 数据库与迁移现状

| 表/指标 | 只读结果 |
| --- | --- |
| assets | 93，全部 active |
| work_orders | 2，其中 open 1、completed 1 |
| maintenance_plans | 3 |
| users | 3，全部 role=admin；2 个 staff/superuser，1 个非 staff/非 superuser，均 active |
| audit_logs | 21 |
| work_order_templates、work_order_comments、work_order_parts | 各 0 |
| inspection_records、inspection_templates、inspection_routes | 各 0 |
| scheduled_reports、report_runs | 各 0 |
| spare_parts、part_transactions、purchase_requests | 各 0 |
| django_migrations | 共 51 条登记；本地七 app 的 12 份编号迁移均已登记应用 |
| PRAGMA quick_check / foreign_key_check | ok / 无异常行 |

对核心表进行了 PRAGMA table_info，与读取到的核心字段相符；没有运行 makemigrations --check，不能仅凭迁移登记认定所有模型与迁移状态绝对无差异。旧数据必须备份、确定单位归属、保留 ID/外键；不得清库重建。数据库是否在用户其他会话继续变化尚不可控，计数是核查时快照。

## 8. 依赖与启动问题

实际可用解释器 C:\miniconda3\python.exe，Python 3.10.18；metadata 检查安装了 Django 5.2.18、DRF 3.18.3、django-filter 26.1、django-celery-beat 2.9.0、pytest-django 4.14.0、openpyxl 3.1.5。只证明本次解释器包存在，未证明正运行服务用同一解释器。

requirements.txt 未声明直接 import 的 django-filter、python-dateutil，以及测试脚本 requests；前两者可能当前由环境/间接依赖提供，干净安装不可据此保证。所有版本仅下限无锁定，需编码阶段验证兼容矩阵再记录已验证版本，不在本阶段升级。

start.py 用 djangorestframework 当 import 名称，会误判（正确模块 rest_framework），未完整检查 simplejwt/beat/filter；create_superuser 调 print_step(end=...) 但函数不接收 end，存在 TypeError；脚本自动执行 migrate。
start.bat 的安装分支会 makemigrations/migrate/创建弱密码管理员/collectstatic，已安装分支又跳过迁移；依赖当前目录，不保证 cd 到项目；提示 Python 3.8 与实际 Django 5.x/Python 3.10 环境不一致；绑定 0.0.0.0 增加暴露范围。当前阶段严禁使用两脚本。
Celery 有基础配置、autodiscover 和 debug_task，未发现生产业务任务，不可宣称计划自动派单/定时报表已工作。deploy 脚本以 deploy 目录为根配置 PYTHONPATH 等，IIS 路径与 wfastcgi 依赖需另行核实，不属于本次新增部署。

## 9. 视觉与组件

common.css 使用 --primary-color:#2563eb、深灰侧栏、灰阶背景、成功/告警/危险色；系统字体，卡片圆角 8px、按钮/输入 4px、内容区 24px、卡片内边距 20px；240px 侧栏，内联 SVG 描边图标。复用 card/card-header/card-body、btn、form、table-container、badge、modal、pagination 和消息提示。

768px 以下侧栏移至屏外，.sidebar.show 展开，统计卡单列、搜索纵排；需补验是否有可用的展开入口和键盘/触屏可达性。表格容器横向滚动，模态框宽90%/最大600px，部分动态表单使用内联网格，需真实浏览器验证窄屏。index.js 负责七页 active 切换及工单/保养/备件页面动态 HTML；assets 主结构在 index.html；全局函数复用而非组件框架，不引入 Vue/React。

## 10. Git 与本阶段操作

初始 git status：多项已跟踪 pyc 修改，另 staticfiles/ 未跟踪；没有初始业务源码文本修改。没有清理/覆盖这些用户运行产物，未提交、切分支或拉取。本阶段主动写入范围仅为本目录五份文档。完成复核时，127份源码/配置/测试/数据库哈希中126份一致，db.sqlite3发生变化；初始数据库SHA-256为80aad383902e3bfa46ec6cd58358ae2b89ad762fa846e2a19b6dda49d52745d4（与Git HEAD库相同），复核为1391ec130fb6beba13350d3dd716660cd0a645b3d6055cc9fcaa786dc5641f64。最终Git也新增显示db.sqlite3修改，不能宣称数据库文件未变。

本轮所有原库连接均mode=ro/query_only，未调用Django初始化、登录、写API或写库操作；运行进程/其他会话变化来源未证实，也未回滚覆盖。复核核心业务计数仍为93设备/2工单/3计划/3用户/21审计、点检0、迁移51，quick_check及外键检查仍正常。当前解释器不支持SQLite内存deserialize，本轮没有为追差异另建数据库副本，故未确定具体字段差异。后续编码前应重新备份并确认并发会话，不能拿本轮哈希作为锁定的交付库。

业务源码未改不代表已有缺陷已修复。


## 第二阶段A交付补记（2026-10-28）
以上为第一阶段审计快照，保留作对照。当前P0实际实现和测试已更新到delivery.md、test-results.md、tasks.md及demo-script.md；点检与报表已替换占位，其他P1/P2仍未实现。业务代码交付在隔离工作树，不覆盖原项目。原库SHA与本轮备份时一致，迁移/seed/写测试均作用于隔离库。
