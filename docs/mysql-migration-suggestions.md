---
title: MySQL 迁移可行性评审与优化建议
version: 1.0.0
date: 2026-02-27
scope: music225
related:
  - docs/mysql-migration-plan.md
  - server/init_mysql.sql
  - server/migrate_to_mysql.py
---

## 一、结论（可行性）

本项目从 localStorage/SQLite 迁移到 MySQL 的整体方案**可行**。原因是：

- **前端数据形状可保持不变**：后端 `Teacher.to_dict()` / `Student.to_dict()` 已将 `id` 字段映射为工号/学号，符合前端各页面长期以来使用 `teacher.id`、`student.id` 的约定。
- **MySQL 表设计与 SQLAlchemy 模型、API 路由基本一致**：`users/teachers/students/classes/courses/rooms/scheduled_classes/blocked_slots/semester_week_configs/...` 等实体的字段与接口返回能对齐，前端通过 `VITE_USE_DATABASE=true` 切换到 API 模式后，大部分页面不需要改字段。
- **迁移与校验路径明确**：`server/init_mysql.sql` 建表，`server/migrate_to_mysql.py` 可批量导入并统计校验；后端 `/api/sync/all`、`/api/sync/import` 提供 JSON 级备份/恢复（适合更复杂的“旧数据修复”场景）。

## 二、关键风险点（必须关注）

### 2.1 “ID 统一策略”文档与实现存在偏差

文档（`docs/mysql-migration-plan.md`）中强调 “`teachers.id = teacher_id` / `students.id = student_id`”，但当前实际实现更接近：

- **数据库主键仍可能是 UUID（或历史 id）**，业务唯一键是 `teacher_id` / `student_id`
- **对前端是透明的**：因为后端 `to_dict()` 把 `id` 返回为工号/学号

风险不在功能，而在**团队认知与后续维护**：运维/排障/写 SQL 时可能误以为主键就是工号/学号。

**建议（两条路线二选一并固化）**：

- **路线 A（推荐，改动小）**：接受“PK=UUID、业务 ID=工号/学号”的现状，**修正文档表述**，明确：
  - 表主键 `id` 为内部标识（UUID/历史 id）
  - 业务标识统一使用 `teacher_id` / `student_id`
  - API 返回 `id=teacher_id/student_id` 仅为兼容前端
- **路线 B（严格按文档落地）**：统一将教师/学生表主键强制写成工号/学号（需要调整迁移脚本/导入逻辑，并确保历史数据不冲突）。

### 2.2 并发排课缺少“数据库级”硬约束

前端排课页（`ArrangeClass.tsx`）做了大量冲突检测，但在多人同时保存的情况下，仍可能出现竞态条件。

文档建议的两条唯一约束（防止同一时间重复排课/重复占用琴房）**目前未在 `init_mysql.sql` 中落地**：

- `(teacher_id, day_of_week, period, semester_label)` 唯一
- `(room_id, day_of_week, period, semester_label)` 唯一

**建议**：

- 在 MySQL 层真正添加唯一索引（或后续迁移 SQL），并在 `/api/schedules`、`/api/schedules/batch` 对唯一冲突返回可读的业务错误（便于前端提示用户重试/换时间）。

### 2.3 外键约束未落地（短期可接受，长期建议分阶段启用）

文档中提到可选外键（排课记录关联教师/学生/琴房），但当前 `init_mysql.sql` 未创建 FK。

- **短期**：依赖应用层（导入/删除顺序、逻辑校验）可运行
- **长期**：建议数据稳定后再启用 FK，并先用文档中的 SQL 检查并清理孤儿数据

### 2.4 “大课/优先级禁排”的云端化不完整

虽然 MySQL 已建 `large_class_schedules` / `priority_blocked_times` 表，但当前前端在 DB 模式下对大课相关服务可能直接返回空数组，且部分禁排仍读取 localStorage（如 `music_scheduler_imported_blocked_times`）。

**建议**：

- 若目标是完全云端化：补齐 “大课表入库 → 后端生成禁排 → 前端只读 API 禁排” 的链路
- 若短期只是迁移核心排课：可保持现状，但要在文档中明确“仍依赖 localStorage 的部分数据来源”

### 2.5 备份/恢复入口目前存在“localStorage 与 API 混用”

例如部分页面的备份/恢复仍直接写 localStorage，而迁移方案主路径更推荐 `/api/sync/all` + `/api/sync/import`。

**建议**：在 DB 模式下统一走后端 `/sync`，减少两套备份模型并存带来的误操作风险。

## 三、建议优化清单（按优先级）

### P0（上线前必须做）

- **P0-1：统一 ID 策略并写进文档**
  - 选择路线 A 或路线 B，并在 `docs/mysql-migration-plan.md` 中明确写死（避免口径漂移）
- **P0-2：为 `scheduled_classes` 增加数据库唯一约束**
  - 教师时间唯一 + 琴房时间唯一
  - API 对唯一冲突做友好错误返回
- **P0-3：迁移路径明确化**
  - 若存在旧 UUID/混合数据：优先用 `/api/sync/import`（该路由已有旧 ID 映射与修复逻辑）
  - `migrate_to_mysql.py` 建议定位为“标准 localStorage 导出文件的快速导入工具”

### P1（上线后尽快做）

- **P1-1：备份/恢复统一入口**
  - DB 模式下前端备份/恢复统一调用 `/api/sync/all`、`/api/sync/import`
- **P1-2：禁排/大课数据来源梳理**
  - 明确哪些数据来自 MySQL，哪些仍来自 localStorage
  - 逐步把“禁排生成/大课解析”迁到后端

### P2（有余力再做）

- **P2-1：分阶段启用外键约束**
  - 先做孤儿数据检查与修复
  - 再启用 FK（并确认删除策略：`SET NULL` / `RESTRICT` / 级联）
- **P2-2：迁移脚本数据类型规范化**
  - 统一 `created_at`/`updated_at` 写入格式
  - JSON 字段避免重复编码（字符串与对象混入时要清洗）

## 四、推荐实施与验证步骤（建议最小化风险）

### 4.1 迁移前

- 准备三份备份（至少两份）：
  - SQLite 数据库备份（如仍在用）
  - `/api/sync/all` 导出的 JSON（建议）
  - 浏览器 localStorage 导出的 JSON（文档已有脚本）

### 4.2 建表与初始化

- 执行 `server/init_mysql.sql`
-（若实施 P0-2）补充执行唯一索引 SQL

### 4.3 导入数据（推荐顺序）

- **优先**：使用 `/api/sync/import` 导入（对旧 id/映射更鲁棒）
- **备选**：`python server/migrate_to_mysql.py <localStorage_export.json>`（适合结构规整的新导出）

### 4.4 验证（必须覆盖）

- **数量验证**：对比导出 JSON 与 MySQL 各表 count
- **字段验证**：
  - 教师：`can_teach_instruments`、`fixed_rooms` JSON 是否可被前端直接渲染
  - 学生：`secondary_instruments`、`assigned_teachers` 结构是否保持
  - 排课：`teacher_id/student_id` 是否为工号/学号（前端依赖）
- **核心页面回归**：
  - 登录
  - 教师管理：增删改查、导入、分配琴房
  - 学生管理：导入、增删改查、筛选
  - 排课页：创建/删除/编辑排课、冲突检测、WebSocket 实时更新

## 五、备注

本建议文档旨在把“迁移方案的设计”与“当前仓库实现状态”对齐，避免上线时出现口径不一致与并发冲突类问题。

