# 特种设备全生命周期 Demo 技术设计

> 2026-10-28｜待审核提案。所有新增字段、接口、动作、状态和页面均未实现。保留 Django/DRF/SQLite/原生前端；不引入新应用框架。现状证据见 [current-state.md](current-state.md)，实施顺序见 [tasks.md](tasks.md)。

## 1. 方案选择

| 方案 | 收益 | 代价/判断 |
| --- | --- | --- |
| 推荐：扩展 Asset/WorkOrder/InspectionRecord，新增必要关联表 | 保持 ID、既有 API 和页面风格，增量验收 | 需收敛旧权限、旧状态写入口和重复 JS |
| 全部生命周期业务塞入工单 JSON | 初期表少 | 结果、单位隔离、统计和约束不清；不采用 |
| 新建平行设备系统或独立角色前端 | 边界独立 | 数据重复、迁移重、违背保留现有 UI 与技术栈要求；不采用 |

推荐项是技术负责人建议，尚非用户批准决定。采用同步业务动作，P0 不依赖 Redis/Celery；保留现有配置但不以定时任务作为演示前提。新增 services.py/permissions.py/filters.py 等仅用于集中状态、事务和授权，不做无关重构。

## 2. 数据模型

通用原则：业务表有 created_at/updated_at、操作者与单位归属；外键默认 PROTECT，历史用归档替代删除；新增表 BigAutoField，JSON 只用于项目快照和摘要，关系使用外键。日期 unknown 用 NULL，不虚构默认日期。

### 2.1 users：多单位基础（P0 最小/P1 完整）

- Organization：code 唯一、name、capabilities（使用/安装/维护/维修/检测/检验的受控枚举列表）、is_active、is_demo。capabilities 非法值拒绝。
- Membership：user FK、organization FK、business_role（manager/operator/technician/tester/examiner/approver）、is_active；唯一(user,organization,business_role)。有效角色同时受单位能力限制，检测员不能替检验员提交。
- AssetServiceAuthorization（置于 assets）：asset、service_org、service_kind、valid_from/valid_until、is_active。唯一(asset,service_org,service_kind)，撤销及有效期有审计。安装、维保、维修等授权范围可分别配置。
- 保留 User.role 与 Django is_staff/is_superuser；平台管理权限统一用明确的后端判定，不允许客户端提交 role 提权。业务角色不依赖 JWT 旧 role 声明，实时检查有效 Membership。
- 多单位用户显式选择当前单位；请求 X-Organization-ID 只是上下文，后端必须验证成员关系。平台管理员跨单位访问显式指定上下文并审计。
- P0 可通过受限 Django admin 配置单位、成员、授权；完整管理界面放 P1。绝不以管理员账号切换外观冒充真实单位隔离。

### 2.2 assets：扩展现有台账（P0）

保留 assets 表、主键、唯一 code、原位置/价值/保养/计数等全部字段。新增：

| 字段/实体 | 类型和约束 | 用途 |
| --- | --- | --- |
| equipment_category/subcategory | 可空受控 code | 特种设备类别与细分，旧设备未分类 |
| using_organization | 可空 FK Organization，PROTECT | 资产归属、所有业务过滤的根 |
| responsible_person | 可空 FK User，PROTECT | 必须属于使用单位的有效成员 |
| installation_organization | 可空 FK Organization，PROTECT | 需安装能力，P0 可留空 |
| installation_location | 可空文本 | 特种设备安装位置，保留原工厂层级字段 |
| lifecycle_stage | 可空受控枚举 | 建档、安装、待验收、在用、停用、报废 |
| last_examination_date/next_examination_date | 可空 Date | 最近/下次“检验”日期，不复用保养或点检日期 |
| examination_due_source | manual_demo/result | P0 人工模拟录入，P1 来自最终结果 |
| rule_reference/rule_version/rule_confirmation | 文本/枚举 | 适用规则来源与审核状态；未知不自动放行 |
| is_demo/archived_at/version | bool/可空时间/整数 | 虚构标识、留档、并发检查 |

category 与 subcategory 使用服务端受控配置，首批可只演示电梯，预留其他类别；不得仅凭类别推算统一检验周期。P1 可将规则扩展为有类别/版本/适用范围的 ReviewRuleProfile，未审核规则不产生准用判断。

AssetRegistration（P1）：asset FK、registration_number/date、registration_status（unknown/recorded/simulated）、登记信息来源与说明、is_demo；保留版本/变更记录，编号不臆定全国唯一。

InstallationRecord（P1）：asset、installation_org、location、installed_at、executor、测试项目快照/过程/结果、recorded_by、is_demo。迁移已有 location 文本不凭空认定真实安装测试。

### 2.3 inspections：只承载日常点检（P0）

复用 InspectionTemplate、InspectionRecord、InspectionRoute；保留旧表与结果 pass/fail/warning 兼容值，页面使用“正常/异常/需关注”，不称法定检验。

- InspectionPlan 新表：code 唯一、equipment、template、using_org、executor、frequency_days 或明确起止日期、start_date/end_date、is_active、created_by。频次仅日常业务配置。
- InspectionTask 新表：plan、scheduled_date、due_at、executor、template_snapshot、status（pending/completed/canceled）、completed_at。唯一(plan,scheduled_date)，不通过“记录条数”推算应检次数。
- InspectionRecord 增 task 可空 OneToOne（历史记录无 task）、performed_at、template_snapshot、submitted_by、using_org、version、is_demo。equipment 与 task.equipment 必须相同；inspector 从当前用户取，performed_at 不再用 created_at 冒充。
- items 校验 schema：item_code/name、required、result(normal/abnormal/attention)、value/unit/note；不接受空数组或缺必检项；保留 ok 字段映射以兼容历史。
- 模板项目增加 severity(info/warning/blocking) 和 blocks_release 布尔标记，由主管在经确认的日常演示模板中配置并写入任务快照，执行人不可临时降低。缺配置的异常默认 unresolved/review_required，不自动判断可用。
- 增 InspectionIssue：record FK、item_code、severity/blocks_release 快照、status(open/pending_verification/resolved)、work_order 可空FK、resolved_by/at、resolution_note；唯一(record,item_code)。工单完工/关闭只把问题转 pending_verification；使用单位授权复核人填写复查依据后才 resolved。复用检查查询该设备所有未resolved的blocking或review_required问题，不只检查本次工单。P0支持人工模拟复查，P1按适用规则增加必要检测/检验条件；所有动作留事件。
- 新提交服务统一汇总结果，调整原 save 的覆盖行为；异常项明细保留。阈值比较只有在模板明确配置并确认单位/数值类型后执行，不从任意字符串推断。
- 问题上报复用 triggered_work_order：每条记录默认最多一张汇总 CM。异常记录与建单在事务中绑定，重复上报返回已有工单；正常记录不能建异常单。复杂多问题拆单 P2。
- submitted record 默认不可直接改删；纠错以更正记录或受控审计动作处理。InspectionRoute 暂保留，P0 不把路线 JSON 升级为复杂巡检引擎。

### 2.4 workorders 与 maintenance：复用任务流转（P0）

WorkOrder 原 wo_type PM/CM/inspection 不删除；inspection 旧值仅兼容，不当作 P1 检验类型。新增 requesting_org（创建时由设备归属确定）、service_org、accepted_by/at、version、is_demo；执行单位需有相应服务授权及能力。assignee 必须为该受托单位成员。

复用 WorkOrderComment 作处理过程记录，增加 event_kind（accept/entry/progress/feedback）、performed_at、actor_org；author 由服务端写。is_internal 只对指定内部范围可见。工单指派、接单、进场、完工、关闭分开保存，完工仍需 actions_taken。

保留原六状态；accepted 用 accepted_at 表示，避免大改旧状态枚举：
open → assigned → in_progress → completed → closed；允许受控取消到 canceled。
assigned 状态先 accept，才可 start；entry 是进场过程事件；PM 可按场景记录进场或远程维护方式。
维护计划生成 PM，维修创建 CM；频次检查与手动强制生成分别定义，强制生成需主管权限及原因；唯一(plan,period_key) 或生成键避免重复。本地 Demo 使用唯一约束+事务+有限重试分配编号，不能依赖 SQLite 的 select_for_update 行锁。

MaintenancePlan 新增 default_service_org/default_assignee（均可空FK），生成 PM 时复制到 WorkOrder；复制前重新校验单位能力、授权有效期和成员身份，失效则拒绝生成并提示重新选择。计划仅存默认值，不替代工单独立的分配/接单审计；既有计划空值仍能生成待分配工单。

备件最小隔离：SparePart 新增 owning_organization（可空FK，PROTECT），PartTransaction 的单位从 part 继承且不可由客户端指定；PurchaseRequest 增 requesting_org，申请/审批人员须为该单位成员。P0仅允许同单位库存服务本单位工单；跨单位领料默认拒绝，P2再设计显式委托和结算。历史无归属库存仅平台可见，不自动授予任何演示单位。保留现有 part_code 全局唯一，不在此阶段重编既有编号。

修复原 PartTransaction 字段与 serializer/view 契约；库存变动与流水写入同一事务，使用条件更新防负库存，数值用 Decimal、校验正数/上限。不另造备件系统。

### 2.5 检测、检验、验收（P1）

放在 inspections app 中以明确命名的独立实体，和 InspectionRecord 的日常点检语义分开：

- AssessmentTask：kind(testing/examination)、equipment、requesting_org、assigned_org、assignee、purpose/rule_reference、scheduled_at、status(open/assigned/accepted/in_progress/submitted/closed/canceled)、version、is_demo。检测与检验使用不同能力和动作权限。
- AssessmentProcess：task、executor、performed_at、项目/方法/过程记录、actor_org。保留过程，不能只存最终结论。
- AssessmentResult：task、revision、result(passed/failed/conditional/incomplete)、过程摘要、问题与条件、performed_at、rule_reference/version、next_due_date 可空、submitted_by/at、finalized_at、is_demo=True。唯一(task,revision)；最终结果不可原地覆盖。
- AcceptanceRecord：asset、结果 FK、accepted_by/at、accepted/pending/rejected、意见、前置条件快照、is_demo。使用单位业务验收不是检验单位的结果签署。
- ReleaseReview：asset、关联验收/检验/检测结果、适用条件快照、reviewer、decision、reason、reviewed_at。恢复使用是独立授权动作，记录准入判断过程。

有些情形不需要先检测再检验，或需其他条件：用经专家确认的规则配置 required_steps，不能把演示顺序当通用法律流程。缺规则/规则未确认默认待确认。passed 不等于允许运行，conditional 默认不放行；到期日期/登记/遗留异常等由对应规则审核；示例无需条件也必须解释“演示规则”。不生成真实证书、许可或对外法定证明。

### 2.6 停用、报废和处置（P1）

AssetStateChange：asset、from/to、reason、actor/org、effective_at、source；停用原因必填。
RetirementApplication：asset、reason、disposal_type(natural_retirement/dismantle/disassembly/other)、applicant、申请时间、status(draft/submitted/approved/rejected)、approver/decision_at/opinion。
DisposalRecord：application、disposal_org、disposed_at、method、过程/结果、recorded_by。审批通过才可处置；报废与处置分别留事件，历史不删。
最低审批一层，默认申请人与审批人分离；多级审批在 P2。报废不可恢复，通过专门更正流程处理误操作。

### 2.7 生命周期（P0 核心/P1 扩展）

LifecycleEvent：asset FK(PROTECT)、event_type、occurred_at（业务时间）、recorded_at（入库时间）、actor 可空 FK、actor_org、source_type/source_id、source_action、summary、payload_snapshot、is_demo、is_historical。
唯一(source_type,source_id,source_action)，列表索引(asset,occurred_at,id)。更正/再提交以稳定版本后缀区分，不以时间戳随机生成唯一键。源类型受控映射，不允许客户端任意模型名查询。

业务服务在 transaction.atomic 中同时写源对象、状态、审计和事件，失败整体回滚；不允许前端直接创建时间线事件；后台/admin 写入口也必须走服务或拒绝受控字段更改，避免旁路。事件不可普通修改/删除，更正追加事件。

历史回填仅依据可证明的 created/completed/closed 等时间生成，缺失动作不补造；标“历史数据导入/发生时间未知”。保留快照以在用户/单位名称变化后解释历史。AuditLog 保留作技术审计，不能替代事件表。

### 2.8 报表（P0/P1）

P0 使用 QuerySet 聚合，无需为图表新增存储表；ScheduledReport/ReportRun 留存，P2 才接定时报表与文件。所有聚合先按资产归属/任务授权过滤。

## 3. API 契约

沿用 /api、JWT Bearer 和 DRF 分页 {count,next,previous,results}。以下是目标接口，除明确复用现有动作外均需实现，不代表当前已可调用。

| 方法与路径 | 功能/关键输入 |
| --- | --- |
| GET /auth/users/me/，POST /auth/refresh/ | 修正前端至现有路由，me 返回有效单位成员关系 |
| GET /auth/organizations/，GET /auth/memberships/ | 当前用户可见单位/成员；P1 管理写入口受平台/单位管理员限制 |
| GET/POST /assets/，GET/PATCH /assets/{id}/ | 台账；分类/状态/单位/检验日期范围筛选，受控状态不能通用 PATCH |
| GET /assets/{id}/timeline/ | 分页；event_type/from/to，按 occurred_at,id 稳定排序 |
| POST /assets/{id}/state-transitions/ | action/reason/version；状态与事件事务提交 |
| GET/POST /inspections/plans/；PATCH /inspections/plans/{id}/ | 点检计划 |
| POST /inspections/plans/{id}/generate_tasks/ | 指定日期范围，限制最大范围，幂等 |
| GET /inspections/tasks/ | equipment/executor/status/date 筛选 |
| GET/POST /inspections/；GET /inspections/{id}/ | 兼容 api.js 记录入口；提交 task/items/performed_at/idempotency_key |
| POST /inspections/issues/{id}/verify_resolution/ | 使用单位授权复核人确认异常已解决，记录依据；不能由维修完工自动代替 |
| POST /inspections/{id}/report_issue/ | 单条异常汇总为唯一 CM，返回工单 ID 和创建与否 |
| GET/POST /inspections/templates/ | 点检模板受控维护 |
| POST /workorders/{id}/assign/ | 扩展现有动作 assignee_id/service_org/version |
| POST /workorders/{id}/accept/ | 新增接单，检查受托单位和有效执行人 |
| POST /workorders/{id}/start/、complete/、close/ | 复用现有路径，补授权/状态/版本/审计 |
| GET/POST /workorders/comments/ | 工单过程，需固定前缀路由优先且父对象权限校验 |
| POST /maintenance/plans/{id}/generate_work_order/ | 复用，增加 period_key/防重复和单位信息 |
| GET /reports/overview/ | 设备总量、分类/状态、维修、点检及检验摘要 |
| GET /reports/workorders/、/reports/downtime/、/reports/spareparts-usage/ | 承接 api.js 已声明的统计路径；后两项详细分析可 P2，P0 不展示无数据接口 |
| GET /reports/inspections/、/reports/examinations/ | 任务完成率/异常、到期及结果明细 |
| GET/POST /inspections/assessment-tasks/ | P1 检测/检验任务，kind 区分 |
| POST /inspections/assessment-tasks/{id}/{assign,accept,start,submit,finalize}/ | P1 专用动作；结果 body 需 revision/result/items/rule/source |
| POST /assets/{id}/acceptances/、/release-reviews/ | P1 业务验收、恢复使用审核 |
| GET/POST /assets/{id}/installations/、/registrations/ | P1 安装测试、使用登记 |
| GET/POST /assets/{id}/retirement-applications/ | P1 报废申请 |
| POST /assets/retirement-applications/{id}/{submit,approve,reject,dispose}/ | P1 审批/处置，路径固定前缀优先注册 |

每个写接口使用专用 serializer 校验，不信任客户端 actor/org/status。响应新增对象用201、动作200、无内容204；400 表单错误、401 未认证、403 有范围但无操作能力、404 范围外或不存在、409 状态/版本冲突。统一错误形态 {code,message,fields}；前端兼容 DRF 旧 detail/字段错误并显示具体原因。

幂等键按(当前单位、操作者、动作、client_key) 唯一；同键不同内容409，同内容重放返回原结果；计划生成、异常报修有业务唯一约束兜底。SQLite 用乐观 version 条件更新和短事务；不宣称支持高并发生产部署。

## 4. 报表计算口径

共同参数 using_org/equipment_category/from/to/as_of/window_days，组织过滤只可缩小已授权范围；Asia/Shanghai 自然日边界转换为 UTC 查询，区间统一 [from,to)。返回 filters、generated_at、as_of、scope、分子/分母及缺失数据量。window_days 默认30只是可配置提醒窗口，不是检验周期。

| 指标 | 定义 |
| --- | --- |
| 总量/分类/状态 | as_of 时点范围内未归档资产，包含报废并单列；若尚无历史重建能力，仅支持当前快照，历史 as_of 明确拒绝 |
| 待维修/维修完成 | wo_type=CM；按 created_at 选队列。待修 open/assigned/in_progress；完工 completed/closed；canceled 单列，不能计完成 |
| 点检完成率 | scheduled_date 在区间、非 canceled 任务为分母；截至 as_of 有有效完成记录的任务为分子；无计划返回 null 并显示“无计划” |
| 点检异常数 | performed_at 在区间、有效记录 result=fail 的记录数；项目异常数单列，不能混加 |
| 检验到期 | next_examination_date < 本地今日为逾期；今日到今日+window_days 为临期（含边界）；空日期为未知，不算正常 |
| 检验结果 | P1 按 performed_at 和最终版本，kind=examination 聚合；检测另列；P0 返回未接入/无数据，不假造合格记录 |
| 维修停机/备件消耗 | 仅在相应已验证数据链路上统计，详细费用/绩效分析 P2 |

P0 允许人工维护最近/下次“模拟检验日期”，报表显示来源。任务漏做、晚做、撤销、跨天、重复提交、跨单位均需有统计验收样本；图表按后端数值渲染，不用当前页长度计算总量。

## 5. 生命周期与任务状态机

设备 lifecycle_stage 与原运行 status 分开，但只能由服务同步维护，禁止两个字段独立编辑：

| 生命周期 | 原 status 投影 | 可进入的下一阶段与条件 |
| --- | --- | --- |
| registered 建档 | inactive | installing（记录安装）或 pending_acceptance（适用无需安装场景说明） |
| installing 安装中 | inactive | pending_acceptance（安装测试资料已提交） |
| pending_acceptance 待验收 | inactive | in_service（规则确认、要求的结果/登记/业务验收/审核满足）；或 suspended |
| in_service 在用 | active；维修期间可 maintenance | suspended（原因）；retired（审批通过）；维修完工不自动恢复 active |
| suspended 停用 | inactive 或维修期间 maintenance | pending_acceptance（申请复用）；retired（审批通过） |
| retired 报废 | retired | 仅追加拆除/解体/处置；禁止正常恢复 |

P0模拟准入独立契约：仅 is_demo=True 且编号为DEMO-SE-前缀的虚构样本允许使用；普通/历史设备不得调用该快捷演示入口。T05/T13前置准备经演示负责人确认的 DemoAdmissionProfile，记录确认人/时间/条件版本和“未验证法定适用性”。它只允许registered→pending_acceptance→in_service或suspended→pending_acceptance→in_service的模拟路径（首次投入与停用后复用执行相同的条件校验和审计），要求类别、使用单位、负责人完整、无未解决阻断/待审异常、授权使用单位主管逐次填写原因，页面始终标“模拟准入，无真实准用效力”。与P1真实类别适用规则确认分开，不以T20未完成为理由绕过非演示设备限制；模板未确认就拒绝模拟准入。

P0 新建默认 registered/inactive；旧设备原 active 保留，lifecycle_stage 先空，显示“历史在用数据/状态待确认”，不倒推其满足法定条件。维修期间 status=maintenance，具体生命周期保留或按安全原因停用；关闭工单后进入待复用确认，P0 只做使用单位的模拟人工确认（reason 必填、明确无准用效力），P1 由 ReleaseReview 替代并统一入口。

日常点检 pending→completed，不强行给全部异常都自动停机：按已确认模板的阻断等级决定；未知安全影响提示待审核，不能自动放行。检测检验任务的 submitted/finalized 只冻结结果，不自行让设备变 active。报废申请通过即 retired，处置记录独立，留存所有任务历史。

## 6. 单位和角色权限

| 操作 | 使用单位主管 | 使用单位点检员 | 维护/维修执行人 | 检测人员 | 检验人员 | 平台管理员 |
| --- | --- | --- | --- | --- | --- | --- |
| 本单位台账编辑/委托 | 是 | 否 | 否 | 否 | 否 | 显式授权 |
| 日常点检/上报 | 可授权 | 本人授权任务 | 仅明确委托点检时 | 否 | 否 | 审计操作 |
| PM/CM 创建/指派/关闭 | 是 | 仅问题上报 | 否 | 否 | 否 | 审计操作 |
| 接单/进场/完工 | 否，除非同时为有效受托成员 | 否 | 本单位本人任务 | 仅检测任务 | 仅检验任务 | 例外原因必填 |
| 检测结果提交 | 否 | 否 | 否 | 本单位指派任务 | 否 | 不能静默冒签 |
| 检验结果提交 | 否 | 否 | 否 | 否 | 本单位指派任务 | 不能静默冒签 |
| 验收/复用审核 | 有审批能力且满足前置条件 | 否 | 否 | 否 | 只交结果 | 有记录的受控操作 |
| 报废审批 | 指定审批人，默认非申请人 | 否 | 否 | 否 | 否 | 例外可追溯 |
| 报表 | 本单位全部 | 授权只读范围 | 本单位任务相关数据 | 本单位检测 | 本单位检验 | 显式跨单位范围 |

查询设计：归属单位可见全部本单位设备；外委单位默认只见“有效服务授权且与本单位任务相关”的最小设备档案和本单位任务/过程/结果，不默认开放其他供应商报价、内部评论和全生命周期敏感信息。合同期结束后只保留本单位已执行任务的必要快照访问。是否允许长期读取完整历史为人工决策项。

同一 scope 函数必须用于列表、详情、聚合、timeline、外键 queryset、评论/用料子表、导入导出及 admin。只验证 has_permission 或只隐藏按钮均不足。外委上传结果必须反查父任务归属，不能由 payload 提交任意 asset_id。

## 7. 前端修改边界

- static/index.html：保留七菜单和壳；补点检/报表容器内容、台账表单分组；标题调整为产品名需审核，不动图标体系。
- static/js/index.js：loadInspections/loadReports 接入专门模块，保留导航和工作台；工作台改用统计 API；重复全局函数保留单一入口，删除前验证现有 onclick 引用，不顺手整体重构。
- static/js/api.js：统一真实路径、保存请求上下文、401 刷新单飞与最多一次重试、204/表单错误处理；补新业务 API，文件上传按原方式。
- static/js/assets.js：扩展列表及编辑字段；详情保留原基本信息，新增“安装与登记”“点检与维保”“检测与检验”“生命周期”“停用与报废”页签；P1 未实现页签隐藏或明确规划，不当作功能完成。
- static/js/workorders.js、maintenance.js：增加单位/执行人筛选、接单、过程、完工/确认权限与版本冲突提示；复用既有列表、模态框。
- 新增 static/js/inspections.js、reports.js；P1 可新增 assessment/retirement 小模块。备件操作缺失可新增 spareparts.js，修复时沿用已有 CSS。
- common.css：只补时间线、页签、图表容器、窄屏适配等类；沿用蓝色变量、深灰侧栏、灰底白卡、8px 卡片圆角、24px 内容内距和 SVG。
- 图表使用现有 CSS 条形图模式或原生 SVG，附数字/明细；不引入图表框架。键盘焦点、文本溢出、模态框滚动及侧栏展开需验证。
- 不改变部署技术栈；staticfiles 是收集产物，禁止当源文件编辑；templates 当前不存在，无需为了本次规划凭空重写模板体系。

## 8. 数据迁移与兼容

编码阶段按次序实施，本阶段不执行：
1. 备份 sqlite 与任何附件，记录文件哈希、表计数、主外键和迁移清单；先在副本验证可恢复。
2. 新表及可空字段 migration；保留旧字段/状态、ID、资产 code 及旧外键。不要先加 non-null 或重建数据库。
3. 单独数据迁移以历史模型 apps.get_model 处理。用户确认归属后映射；无法确认的旧设备保留未分配，仅平台可读，不能自动公开归入任意演示单位。
4. 为旧记录填 org 从设备推导，执行人不符时标需人工处理，不凭空创建成员授权；历史生命周期按证据回填，幂等。
5. 新样本 DEMO-SE- 前缀/is_demo，虚构单位、账号和设备；seed 管理命令默认新增或幂等维护自身样本，禁止覆盖旧设备；不得默认删除。
6. API 先兼容可空值和旧结果枚举，再发布页面；旧客户端的受控状态直接写入从此拒绝并返回明确提示，这是必要安全修复，应记录兼容变化。
7. 核对前后数据计数/字段/外键、模拟失败回滚、重复迁移安全与备份恢复。SQLite 可能由 Django 为 AlterField 内部重建表，须副本验证；这不同于手工删库重建，仍需评估锁库时段。
8. P0/P1 分批迁移；只在第二阶段获准后执行。任何破坏性字段删除延期，不以 --fake 掩盖不一致。

## 9. 风险及待审核决定

- 当前缺少真实多单位数据，P0 必须先封提权/越权与最小隔离，不能等到 P1 才保护数据。
- 首批按电梯示例，不制定真实法定周期；规则文本、检验/检测分工、复用前置条件需设备类别专家审核。没有本地规则实现就不显示真实“准用”。
- 历史 active 数据不代表检验合格；现有资料的真实性、归属、是否可展示必须由用户确认。
- 维护与维修可由同单位承担，默认多能力组织；若业务要求严格分立需调整授权约束。
- 默认报废审批自审禁止；确认是否允许 Demo 用同账号兼任但显式审计。推荐至少两个账号操作。
- 外委可见范围默认最小化，完整生命周期和费用共享需明确授权。
- 演示环境是否离线、是否局域网公开影响资源打包/账号和部署配置；默认本机、无外部集成。
- 工作量为粗估人日，受新环境依赖、旧 UI 冲突和规则确认影响；没有宣称任何新增功能已经完成。

