# ArrangeClass 专业小课排课流程检查与优化方案

## 一、专业小课排课流程与逻辑关系总结

### 1.1 整体流程概览

```
教师登录 → 进入排课页 → 加载基础数据（学生/课程/排课/禁排/周次配置等）
    → 选教师（管理员）→ 选学生入小组 → 选课程 → 选时间（时间网格）
    → 保存前校验（教师冲突/学生冲突/禁排/课时）→ 批量创建排课 → 刷新缓存 → WebSocket 广播
```

### 1.2 关键环节与数据流

| 环节 | 触发/依赖 | 主要动作 | 使用的禁排/冲突数据 |
|------|-----------|----------|----------------------|
| 页面初载 | useEffect | **方案 A**：每次进页调用 `refreshBlockedTimes()`，未就绪前禁用时间网格/保存 | BlockedTimeContext 的 allData（导入禁排，单一来源） |
| 初始数据加载 | 选教师后 / 依赖 targetTeacher 等 | Promise.all(courses, schedules, rooms, classes, largeClass)；**不再**调用 getBlockedSlots | 仅导入禁排（getBlockedTimesFromCache）+ largeClassEntries |
| 时间网格展示 | selectedWeek / groupStudents / getBlockedTimesFromCache | `timeGridCellData` useMemo：导入禁排 + 教师/学生已排 + 大课 | 单一来源：导入禁排 + 全量排课（allSchedulesCache） |
| 点击格子选时间 | handleTimeSlotClick | 单选/范围/批量：isSlotAvailableSync 或 isSlotAvailable | 同上 |
| 已选时间展示与提交 | effectiveSelectedTimeSlots | 排除禁排后的 selectedTimeSlots；保存时只用 effectiveSelectedTimeSlots | 同上 |
| 保存 | handleSaveSchedule | 16 节次校验 → 刷新 getAll → 建 Map → 教师/学生/禁排校验（day_of_week+全班级）→ **P1 最后一刻 getAll 再校验** → createMany → 刷新缓存 + WebSocket | 仅 getBlockedTimesFromCache()；禁排字段统一为 day_of_week ?? day，支持全班级 |

### 1.3 禁排数据来源（已改为单一来源）

- **导入禁排（BlockedTimeContext）**  
  - 接口：`GET /api/imported-blocked-times`。  
  - 缓存：localStorage `blockedTimesCache` + 兼容 `music_scheduler_imported_blocked_times`。  
  - 使用：排课页**仅使用此来源**——时间网格、isSlotAvailableSync、effectiveSelectedTimeSlots、保存前禁排冲突、冲突检测等均用 `getBlockedTimesFromCache()`。  
- **周次配置（blockedSlots）**  
  - 已确认与「禁排时间模块导入」为同一批数据，排课页**不再**请求 blockedSlotService，不再使用 blockedSlots。

---

## 二、可能影响排课时间安排的逻辑问题

### 2.1 禁排未完整加载即排课（重点）

- **现象**：教师登录后直接进排课页，BlockedTimeContext 仅从 localStorage 读缓存；若缓存为空或过期，`loadBlockedTimes()` 在 useEffect 里才触发，且 Context 里 `loadBlockedTimes` 有 `if (hasLoaded) return`，首次可能只走一次服务器拉取。  
- **风险**：若网络慢或接口失败，时间网格和 isSlotAvailableSync 会在一段时间内使用空或旧禁排，导致可点选禁排时段，保存时才用 getBlockedTimesFromCache 校验（若此时已加载则能拦住；若仍为空则可能保存到禁排时段）。  
- **结论**：存在“禁排未加载完整就排课”的窗口，可能造成时间网格禁排不准确或误排。

### 2.2 导入禁排“全班级”与保存前校验字段不一致

- **现象**：保存前禁排冲突用 `bt.class_name && ... bt.day === slot.day`；而 getBlockedTimesFromCache/BlockedTimeContext 新格式为 `day_of_week`，旧格式为 `day`。若缓存是新格式，`bt.day` 可能为 undefined，导致禁排冲突漏检。  
- **结论**：保存前应统一用 `(bt.day_of_week !== undefined ? bt.day_of_week : bt.day) === slot.day`，并与“全班级”逻辑一致（无 class_associations 视为全班级禁排）。

### 2.3 保存前未对 blockedSlots（周次配置）做二次校验

- **原结论**：保存时只用了 getBlockedTimesFromCache() 做禁排冲突，没有再用 blockedSlots 校验一遍。  
- **现状**：已改为**单一来源**，排课页不再使用 blockedSlots，保存前仅用 getBlockedTimesFromCache() 并已统一 day_of_week 与全班级逻辑，此项已满足。

### 2.4 多人同时排课的竞态

- **现象**：保存开始时 `freshSchedules = await scheduleService.getAll()` 建 Map，之后到 createMany 之间另一教师可能已保存，当前客户端仍用旧快照校验。  
- **结论**：存在理论竞态。可选：createMany 前再拉一次 getAll() 做“提交前最后一刻”冲突检查，或服务端 create 时按 (student_id, day_of_week, period, start_week) 唯一约束/业务校验拒绝冲突。

### 2.5 initializeTimeGrid 与 timeGridCellData 双重逻辑

- **现象**：initializeTimeGrid 里用 getBlockedSlots()、getBlockedTimesFromCache()、scheduledClasses 等写“网格状态”；timeGridCellData 的 useMemo 也有一套完整的 blockCheck/remainingWeeks 计算。两处若不一致会导致“展示”与“点击/已选”行为不一致。  
- **结论**：当前展示以 timeGridCellData 为准，initializeTimeGrid 更多是“同步到统一格式”等；需确认是否仍有 UI 直接读 initializeTimeGrid 的结果，若有应统一到 timeGridCellData，避免双重来源。

### 2.6 大课禁排（largeClassEntries）与周次/导入禁排的优先级

- **现象**：timeGridCellData 中 isBlockedByLargeClass、blockedSlots、导入禁排、教师/学生占用 等是并列判断，无明确优先级说明。  
- **结论**：逻辑上“任一命中即禁排”即可；需确认 largeClassEntries 的 week/day/period 与当前学期、周次一致，且与 blockedSlots 无重复或冲突定义。

---

## 三、禁排时间加载流程与“教师登录后强制加载完整”方案

### 3.1 当前加载链（已按方案 A 实施）

1. BlockedTimeProvider 挂载 → 从 localStorage 读 `blockedTimesCache`（及旧 key），有则 setAllData 并 setHasLoaded(true)。  
2. **ArrangeClass 内 useEffect**：每次进排课页调用 `refreshBlockedTimes()`，不依赖 hasLoaded；完成后设置 `blockedTimesSchedulingReady = true`。  
3. 禁排未就绪前：显示「正在加载禁排时间…」并禁用时间网格与保存按钮。  
4. 时间网格与保存仅依赖 getBlockedTimesFromCache()（**单一来源**，不再拉取 blockedSlots）。

### 3.2 问题归纳

- 教师首次进入排课页时，若缓存为空，hasLoaded 为 false，会调 loadBlockedTimes()，但**没有“必须等加载完成再允许操作”**的约束，时间网格可能先用空数组算一遍。  
- 没有“进入排课页强制从服务器刷新一次”的选项，依赖缓存可能过期或未同步。

### 3.3 建议：教师进入排课页后“强制加载完整禁排”

- **方案 A（推荐）**  
  - 进入 ArrangeClass 时（或教师身份就绪时）：  
    - 调用 `loadBlockedTimes()`（或 Context 提供的 `refreshBlockedTimes()`），**不依赖 hasLoaded**，即每次进排课页都从服务器拉一次最新导入禁排。  
  - 在禁排未就绪前：  
    - 可选：短时显示“正在加载禁排时间…”或禁用时间网格/保存按钮，直到 `hasLoaded === true` 且本次请求完成；  
    - 或：保留当前行为，但保证 loadBlockedTimes 在首屏就触发且不因 hasLoaded 提前 return（例如进排课页用 refreshBlockedTimes 强制刷新）。  
- **方案 B**  
  - 保持“仅无缓存时加载”，但：  
    - 在 BlockedTimeContext 增加“排课页强制刷新”接口（如 `ensureLoadedForScheduling(): Promise<void>`），在 ArrangeClass 的 useEffect 里调用并 await，再允许时间网格使用 getBlockedTimesFromCache()；  
    - 时间网格首次渲染若 `!hasLoaded`，可显示占位或禁用，避免用空数据算成“全部可排”。

### 3.4 周次配置 blockedSlots（已取消）

- **现状**：业务已确认周次配置与禁排时间模块导入为同一批数据，排课页已改为**仅使用导入禁排**，不再调用 getBlockedSlots/getBySemester，无 blockedSlots 状态。

---

## 四、排课流程环节优化建议（保证不冲突 + 加快加载）

### 4.1 冲突与正确性（绝对不能冲突）

- **保存前最后一刻校验**  
  - 在 createMany 之前，再执行一次：  
    - 用**当前** effectiveSelectedTimeSlots；  
    - 再拉一次 `scheduleService.getAll()`（或至少用 allSchedulesCache 若刚刷新过）；  
    - 对每个 (student_id, day, period, week) 检查：教师占用、学生占用、导入禁排、**blockedSlots（周次配置）**；  
  - 任一项冲突即中止保存并提示，不调用 createMany。

- **统一禁排字段**  
  - 所有使用“导入禁排”的地方统一：`day = bt.day_of_week ?? bt.day`；保存前禁排冲突同样使用该字段，并支持“全班级”（无 class_associations 即匹配所有班级）。

- **服务端兜底**  
  - 若尚未实现：在创建排课 API 内按 (student_id, day_of_week, period, start_week)（或等价唯一键）做唯一约束或业务校验，拒绝重复/冲突插入，返回明确错误码，前端提示“该时段已被占用或为禁排”。

### 4.2 页面加载速度

- **首屏并行与分步**  
  - 首屏必须：当前教师/学期、学生列表、课程列表、排课列表、blockedSlots（当前学期）、导入禁排（loadBlockedTimes/refresh）。  
  - 可并行：Promise.all([scheduleService.getAll(), courseService.getAll(), getBlockedSlots(), loadBlockedTimes(), ...])，再 set 各 state；避免串行多次 await。  
  - 大课、琴房等可次屏或按需加载（如切到对应 Tab 再拉）。

- **减少重复请求**  
  - getBlockedSlots/getBySemester 在排课页内统一一次拉取，存 state，多处复用；避免 initializeTimeGrid、isSlotAvailable 内多次 await getBlockedSlots()。  
  - allSchedulesCache 已由 refreshCache + WebSocket 更新，时间网格和 isSlotAvailableSync 尽量只用缓存，少在热路径里再调 getAll()。

- **timeGridCellData 与 initializeTimeGrid**  
  - 时间网格展示与“是否可点”只依赖 timeGridCellData（及 effectiveSelectedTimeSlots）；  
  - initializeTimeGrid 若仅用于“同步到统一格式”等，可考虑只保留必要副作用，或与 timeGridCellData 共用一套数据源，避免两套逻辑重复计算。

### 4.3 多教师同时排课与实时广播

- **当前**  
  - 保存成功后 `scheduleService.getAll()` 然后 `websocketService.sendCourseUpdate(allSchedules)`；  
  - 其他端监听 `schedule_created/updated/deleted` → handleScheduleChange → getAll() → setAllSchedulesCache。

- **建议**  
  - 服务端：在创建/更新/删除排课记录后，向房间内所有客户端广播对应事件（schedule_created / schedule_updated / schedule_deleted），payload 可带变更的 id 或整条记录，减少客户端全量拉取次数（可选）。  
  - 客户端：收到 schedule_* 后刷新 allSchedulesCache（当前已做）；若 payload 含增量，可先合并再 setAllSchedulesCache，再重算 timeGridCellData 和 effectiveSelectedTimeSlots，保证各端“可选时间”一致，避免学生时间冲突。  
  - 保存前：始终用“当前”全量排课（刚刷新的 allSchedulesCache 或保存前再 get 一次）做冲突检测，避免用旧快照。

---

## 补充说明（回应后续四点）

### 1. 周次配置与 blockedTimesCache 的关系：是否还需单独加载？是否更改使用来源？

- **当前代码里的两套数据**  
  - **blockedTimesCache / 导入禁排**：来自「数据统计页面 → 禁排时间模块」中**导入**的禁排时间，接口 `GET /api/imported-blocked-times`，存 localStorage `blockedTimesCache`，BlockedTimeContext 的 `allData`。  
  - **blockedSlots（周次配置）**：来自**周次配置页面**（WeekConfig）维护的后端表 `blocked_slots`，接口 `blockedSlotService.getAll()` / `getBySemester()`，与 `imported_blocked_times` 表**独立**（见 `server/models/imported_blocked_time.py` 注释）。

- **您说的情况**  
  「周次配置的数据在 blockedTimesCache 里（即数据统计页面禁排时间模块导入的禁排时间），里边是所有的固定的禁排时间数据。」

- **结论与建议**  
  - 若业务上**所有**固定禁排（含原“周次配置”里那部分）都已在「禁排时间模块」里导入，并保存在 **blockedTimesCache / imported-blocked-times API** 中，则：  
    - **不需要再单独加载**后端 `blocked_slots`（周次配置）用于排课页禁排判断。  
    - **可以改为单一来源**：排课页的时间网格、isSlotAvailableSync、effectiveSelectedTimeSlots、保存前禁排校验，**只使用** BlockedTimeContext / getBlockedTimesFromCache()（即导入禁排），不再依赖 blockedSlots。  
  - 若业务上仍存在**两套**数据（例如：周次配置页单独维护、未全部同步到导入禁排），则仍需两套都加载并在时间网格与保存前同时校验；此时不能改为单一来源。  
  - **建议**：与业务确认「周次配置」与「禁排时间模块导入」是否已统一为同一批数据。若已统一，则**更改使用来源**为仅用导入禁排（blockedTimesCache），并去掉排课页对 blockedSlots 的依赖，可减少重复加载与双源不一致风险。

### 2. 课程最多 16 节次，超出禁止保存

- **含义**：专业小课每门课每学生最多 16 节；已选时间槽数（effectiveSelectedTimeSlots.length）即“该小组为本课程选的节次数”，不应超过 16。  
- **实现建议**：在 `handleSaveSchedule` 中，在现有校验之后、创建排课之前增加：  
  - 若 `effectiveSelectedTimeSlots.length > 16`，则 `showToast('error', '该课程最多排 16 节，当前已选 ' + effectiveSelectedTimeSlots.length + ' 节，请减少后再保存')` 并 `return`，不调用 createMany。  
- 这样从保存入口保证「课程最多 16 节次，超出禁止保存」。

### 3. 按方案进行优化的风险

| 风险类型 | 说明 | 缓解方式 |
|----------|------|----------|
| **回归** | 改加载顺序、统一 day 字段、增加 16 节校验等，可能影响其他依赖“旧行为”的页面或场景 | 仅改排课页与 BlockedTimeContext；保存前校验加严格不放松；上线前在排课页完整走一遍：选人→选课→选时→保存、编辑、删除 |
| **性能** | 进排课页强制刷新禁排（方案 A）会多一次请求；若禁用网格直到加载完成，首屏略慢 | 接口做缓存（如 ETag/304）；或采用方案 B 仅首次/无缓存时强制加载，减少重复请求 |
| **体验** | “禁排未就绪前禁用时间网格或保存”可能让用户短时无法操作 | 明确提示“正在加载禁排时间…”并限制仅在排课区域；加载完成后自动恢复 |
| **数据源统一** | 若改为只使用导入禁排、停用 blockedSlots，需确认周次配置页是否已不再单独维护禁排，否则会漏禁排 | 先确认业务：固定禁排是否全部来自导入；若是再切单一来源 |
| **多人竞态** | 保存前“最后一刻”再 getAll() 会多一次请求，且极端情况下仍可能被其他端抢先 | 服务端对 (student_id, day_of_week, period, start_week) 做唯一或业务校验兜底，冲突时返回 4xx 并提示 |

整体上，按方案优化后**排课结果更安全、禁排更准确**，主要风险在于“改动面”和“数据源统一”的确认，通过上述缓解和业务确认即可控。

### 4. 方案 A 与 方案 B 的优缺点（目的：准确加载所有禁排，确保不影响排课）

- **方案 A**  
  - **做法**：每次进入排课页都从服务器拉一次导入禁排（如调用 refreshBlockedTimes），不依赖 hasLoaded；可选在禁排未就绪前显示“正在加载禁排时间…”或禁用时间网格/保存。  
  - **优点**：数据最新，多端、多设备一致；不会因本地缓存过期或空而误把禁排当可排；容易满足“准确加载出所有禁排时间数据，确保不影响排课”。  
  - **缺点**：每次进排课页多一次网络请求，弱网或接口慢时首屏略慢；若在加载完成前禁用网格，会有短时不可操作。

- **方案 B**  
  - **做法**：仅无缓存或未加载过时才从服务器拉取；增加 ensureLoadedForScheduling()，进排课页 await 该调用后再用 getBlockedTimesFromCache()；时间网格在 !hasLoaded 时占位或禁用。  
  - **优点**：有缓存时不再重复请求，首屏更快；仍能保证“使用前至少已加载过一次”，避免用空数据算成全部可排。  
  - **缺点**：有缓存时不会自动刷新，若管理员刚在别处更新了禁排，当前教师可能仍看到旧数据，直到清缓存或下次无缓存时再拉；对“始终用最新禁排”的保证弱于方案 A。

- **针对您的目的（准确加载所有禁排，确保不影响排课）**  
  - **更推荐方案 A**：每次进排课页都强制从服务器拉一次，并在未就绪前限制时间网格/保存，能最大程度保证“看到的禁排 = 服务器上的禁排”，避免因缓存导致误排。  
  - 若非常在意进页速度，可折中：**默认用方案 A**，但在 Context 里对“本次会话已刷新过”做标记，同一会话内再次进入排课页可跳过刷新（仍保证至少一次从服务器加载）。

**实施记录**：已按方案 A 实施（进页 refreshBlockedTimes，未就绪前禁用时间网格与保存）；周次配置与导入已统一为单一来源并已上线。

---

## 五、建议修复项汇总（按优先级）

| 优先级 | 项 | 说明 | 实施状态 |
|--------|----|------|----------|
| P0 | 教师进入排课页强制加载完整禁排 | 进页调用 refreshBlockedTimes；禁排未就绪前禁用时间网格或保存。 | ✅ 已实施（方案 A） |
| P0 | 保存前禁排冲突使用 day_of_week 并支持全班级 | 统一 `day = bt.day_of_week ?? bt.day`；无 class_associations 视为全班级禁排。 | ✅ 已实施 |
| P0 | 保存前对 blockedSlots 做二次校验（或改为单一来源后取消） | 已改为仅用导入禁排，此项已取消。 | ✅ 已改为单一来源 |
| P0 | 课程最多 16 节次，超出禁止保存 | handleSaveSchedule 中若 effectiveSelectedTimeSlots.length > 16 则 toast 提示并 return。 | ✅ 已实施 |
| P1 | 保存前“最后一刻”冲突检查 | createMany 前再 getAll() 一次，用最新数据重建 Map 再校验教师/学生冲突。 | ✅ 已实施 |
| P1 | blockedSlots 一次拉取、多处复用 | 已改为单一来源，不再使用 blockedSlots。 | — 不适用 |
| P2 | 首屏并行请求 | 学生/课程/排课/禁排等用 Promise.all 并行，减少首屏等待。 | 待实施 |
| P2 | WebSocket 增量更新（可选） | 服务端广播带变更内容，前端合并后更新 allSchedulesCache。 | 待实施 |
| P3 | 统一时间网格数据源 | 确认 initializeTimeGrid 与 timeGridCellData 职责划分。 | 待实施 |

---

## 六、小结

- **流程**：选教师 → 选学生/课程 → 时间网格选时间（**仅依赖导入禁排** + 全量排课 + 大课）→ 已选时间用 effectiveSelectedTimeSlots 排除禁排 → 保存前校验（16 节次、教师/学生/禁排，day_of_week+全班级）→ **最后一刻 getAll 再校验** → 批量创建 → 刷新缓存并 WebSocket 广播。  
- **禁排**：已改为**单一来源**（BlockedTimeContext / getBlockedTimesFromCache）；保存前统一 `day_of_week ?? day` 并支持全班级；不再使用 blockedSlots。  
- **禁排加载**：已按**方案 A** 实施——每次进排课页 refreshBlockedTimes()，未就绪前禁用时间网格与保存。  
- **冲突与竞态**：P1 保存前最后一刻再 getAll 并校验教师/学生冲突已实施；可进一步依赖服务端唯一约束兜底。  
- **后续可选**：P2 首屏并行、WebSocket 增量更新；P3 统一时间网格数据源。
