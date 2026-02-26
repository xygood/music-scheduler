# 项目深度代码审查报告（安全 / 稳定性 / 业务 / 性能）

> 生成时间：2026-02-27  
> 覆盖范围：后端 `server/`（Flask + SQLAlchemy + Socket.IO），前端 `src/`（React/Vite）  
> 审查目标：按清单扫描安全漏洞、严重 Bug、业务逻辑风险、性能与架构隐患，并给出可落地修复示例。

---

## 快速结论（必须优先修的 Top 风险）

- **P0（立刻修）鉴权/权限缺失（越权）**：后端几乎所有 API 都未验证身份与权限，任何人可增删改排课/师生/同步全量数据。
- **P0（立刻修）XSS 注入点存在**：前端存在 `dangerouslySetInnerHTML`，可导致账号接管（配合当前把口令/Token 放在 `localStorage`）。
- **P0（立刻修）认证实现不安全**：管理员“工号=110”硬编码 + 明文密码分支；全体使用 SHA256（无盐、弱）且前端存口令。
- **P0（立刻修）CORS 过宽**：API 和 Socket.IO 允许任意来源，放大攻击面。
- **P1（尽快修）生产弱配置**：`SECRET_KEY`、`MYSQL_PASSWORD` 有硬编码默认值，生产忘配将直接暴露。
- **P1（尽快修）WebSocket 运行时错误**：Socket handler 使用 `request.sid` 但未导入 `request`，可能导致断线/加入房间异常。

---

## 1. 安全漏洞扫描

### 1.1 SQL 注入（SQLi）

#### 结论
- **未发现明显的 SQL 字符串拼接注入点**。后端主要通过 SQLAlchemy ORM 查询，迁移脚本使用 `text()` + 命名参数（参数化）。

#### 证据
- `server/migrate_to_mysql.py` 使用参数化：

```80:103:server/migrate_to_mysql.py
conn.execute(text("""
    INSERT INTO users (...)
    VALUES (:id, :teacher_id, ...)
"""), { ... })
```

#### 建议
- 后续新增 raw SQL 时坚持 `text()` + 参数，不要 `f""` / `format()` 拼接 SQL。

---

### 1.2 XSS 跨站脚本

#### 问题 A：使用 `dangerouslySetInnerHTML` 输出不可信 HTML（高危）
- **位置**：`src/pages/ArrangeClass.tsx`

```6570:6623:src/pages/ArrangeClass.tsx
<td ... dangerouslySetInnerHTML={{ __html: result.scheduleTime }}></td>
```

```6800:6807:src/pages/ArrangeClass.tsx
<p ... dangerouslySetInnerHTML={{ __html: selectedTimeSlots.length > 0 ? formatScheduleTime(...) : '未选择时间' }}></p>
```

#### 为什么是问题
- 如果 `result.scheduleTime` 或 `formatScheduleTime(...)` 的内容可被导入数据/用户输入污染，则可注入脚本，进而读取 `localStorage`/`sessionStorage` 内的凭证，造成**账号接管**与**数据篡改**。

#### 修复示例（优先：改为纯文本渲染）

```tsx
<td className="px-4 py-2 text-sm text-gray-500 font-mono whitespace-pre-wrap">
  {String(result.scheduleTime ?? '')}
</td>
```

#### 修复示例（如必须渲染少量富文本：使用白名单净化）

```tsx
import DOMPurify from 'dompurify';

const safeHtml = DOMPurify.sanitize(result.scheduleTime ?? '', {
  ALLOWED_TAGS: ['br', 'b', 'strong', 'i', 'em', 'span'],
  ALLOWED_ATTR: ['class'],
});

<td dangerouslySetInnerHTML={{ __html: safeHtml }} />
```

---

### 1.3 CSRF 防护

#### 结论
- **当前未发现 CSRF 防护机制**（未见 CSRF token 校验 / SameSite Cookie 策略结合）。

#### 为什么是问题
- 目前你前端用的是 `Authorization` header（Basic），CSRF 风险相对低；但一旦未来改为 Cookie 会话/JWT Cookie，且 CORS/Origin 未收紧，CSRF 风险会显著上升。

#### 修复建议（两种路线）
- **路线 1（推荐）**：采用 Bearer Token（短期 access token）放在 `Authorization: Bearer`，服务端做严格鉴权 + 收紧 CORS。
- **路线 2**：采用 HttpOnly Cookie 会话，并启用 CSRF（双提交 cookie 或 Flask-WTF CSRF）。

---

### 1.4 敏感信息泄露（硬编码密钥/口令/令牌）

#### 问题 A：`SECRET_KEY` 和 `MYSQL_PASSWORD` 提供硬编码默认值（高危）
- **位置**：`server/config.py`

```6:25:server/config.py
SECRET_KEY = os.environ.get('SECRET_KEY', 'music-scheduler-secret-key-2026')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'Scheduler@2026')
```

#### 为什么是问题
- 生产环境如果忘配环境变量，会直接用弱/已知默认值，导致会话签名/数据库泄露风险。

#### 修复示例（生产环境强制要求 env）

```python
def must_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing required env: {name}")
    return v

class ProductionConfig(Config):
    DEBUG = False
    USE_MYSQL = True
    SECRET_KEY = must_env("SECRET_KEY")
    MYSQL_PASSWORD = must_env("MYSQL_PASSWORD")
    SQLALCHEMY_DATABASE_URI = Config.MYSQL_SQLALCHEMY_URI
```

#### 问题 B：部署脚本/文档中出现“看起来可用”的固定口令（建议清理）
- **位置示例**：`deploy/deploy.sh`、部分 docs（示例环境变量）。
- **建议**：示例统一使用占位符（例如 `SECRET_KEY=__CHANGE_ME__`），避免误部署。

---

### 1.5 文件上传安全

#### 结论
- 后端未发现上传接口；前端 `src/components/EnhancedFileUpload.tsx` 做了大小/MIME/扩展名校验，但这**不能替代服务端安全**。

#### 为什么是问题
- 未来一旦接入后端上传，攻击者可伪造 MIME/扩展名上传恶意文件；必须在服务端做“内容级校验/隔离存储/下载鉴权”。

#### 修复建议（若未来加入上传 API）
- 服务端校验：文件魔数、大小上限、允许类型白名单、存储到非 Web Root、病毒扫描/隔离区、下载走鉴权接口。

---

### 1.6 权限校验（越权漏洞 / IDOR）（最高危）

#### 问题：后端路由缺少统一鉴权与权限控制
- **示例位置**（仅举例，实际覆盖几乎所有资源路由）：
  - `server/routes/schedule.py`（POST/PUT/DELETE）
  - `server/routes/teachers.py`（POST/PUT/DELETE）
  - `server/routes/students.py`（POST/PUT/DELETE）
  - `server/routes/sync.py`（GET 全量数据 / POST 导入）

#### 证据（任意人可直接创建/删除资源）

```38:75:server/routes/schedule.py
@api_bp.route('/schedules', methods=['POST'])
def create_schedule():
    ...
```

```31:112:server/routes/teachers.py
@api_bp.route('/teachers', methods=['POST'])
def create_teacher():
    ...
```

```27:95:server/routes/students.py
@api_bp.route('/students', methods=['POST'])
def create_student():
    ...
```

```21:39:server/routes/sync.py
@api_bp.route('/sync/all', methods=['GET'])
def get_all_data():
    data = { ... 'users': [u.to_dict() for u in db.query(User).all()], ... }
```

#### 为什么是问题
- 任何能访问服务端端口的人，都能**读全量数据**、**写入/删除排课**、**篡改教师/学生信息**。

#### 修复建议（最小可落地：统一 Basic 鉴权 + admin 权限）
> 备注：你的前端目前在请求头里拼了 `Authorization: Basic base64(teacher_id:password)`（见 `src/services/api.ts`），但后端目前并未校验。

**新增** `server/authz.py`（示例：兼容现有 sha256 存储，后续应升级为 bcrypt/argon2）：

```python
import base64
from functools import wraps
from flask import request, jsonify, g
from models.database import get_db
from models.user import User
import hashlib

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def require_auth(admin: bool = False):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Basic "):
                return jsonify({"error": "Unauthorized"}), 401

            try:
                raw = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
                teacher_id, password = raw.split(":", 1)
            except Exception:
                return jsonify({"error": "Unauthorized"}), 401

            db = next(get_db())
            try:
                user = db.query(User).filter(User.teacher_id == teacher_id).first()
                if not user:
                    return jsonify({"error": "Unauthorized"}), 401
                if user.password != _hash_password(password):
                    return jsonify({"error": "Unauthorized"}), 401
                if admin and not user.is_admin:
                    return jsonify({"error": "Forbidden"}), 403
                g.current_user = user
                return fn(*args, **kwargs)
            finally:
                db.close()
        return wrapper
    return deco
```

**在写接口和敏感读接口加装饰器**（举例）：

```python
from authz import require_auth

@api_bp.route('/sync/all', methods=['GET'])
@require_auth(admin=True)
def get_all_data():
    ...

@api_bp.route('/teachers', methods=['POST'])
@require_auth(admin=True)
def create_teacher():
    ...

@api_bp.route('/schedules', methods=['POST'])
@require_auth()
def create_schedule():
    ...
```

---

## 2. 严重 Bug 排查

### 2.1 WebSocket 运行时错误：`request` 未导入
- **位置**：`server/websocket_handlers/handlers.py`

```19:34:server/websocket_handlers/handlers.py
if sid == request.sid:
    del connected_users[user_id]
```

#### 为什么是问题
- `request` 未导入时会抛异常，导致 disconnect/join_room 相关逻辑不稳定，影响实时同步。

#### 修复示例

```python
from flask import request
```

并建议对每个 socket 事件增加异常捕获与鉴权（至少校验 user_id 与当前连接身份一致）。

---

### 2.2 异步/资源释放

#### 结论
- 后端路由普遍使用 `finally: db.close()`，数据库会话释放整体较规范（例如 `server/routes/schedule.py`、`teachers.py`、`students.py` 等）。
- 迁移脚本使用 `with engine.connect()`，连接释放也相对规范。

---

## 3. 业务逻辑错误与风险

### 3.1 认证/账号体系逻辑不安全（高危）

#### 问题 A：管理员逻辑硬编码 + 明文分支
- **位置**：`server/routes/auth.py`

```26:33:server/routes/auth.py
is_admin = teacher_id == '110'
if is_admin:
    if user.password != password:
        ...
```

#### 为什么是问题
- 这是“后门式”角色判断，且明文比较会在数据泄露时极其脆弱。

#### 修复建议
- 管理员只由 `user.is_admin` 决定；全体统一强哈希（bcrypt/argon2）；登录成功返回短期 token。

---

### 3.2 同步导入默认密码 = 工号（极易被撞库）
- **位置**：`server/routes/sync.py`

```86:103:server/routes/sync.py
password=hash_password(teacher_id),  # 默认密码为工号
```

#### 为什么是问题
- 工号往往是可猜/可枚举的，等同“弱默认密码”，会导致批量被撞库。

#### 修复建议
- 导入后强制首次登录改密，或使用一次性激活码/随机初始密码并通过安全渠道发放。

---

## 4. 性能与架构隐患

### 4.1 全表 `all()` 接口较多（可扩展性风险）
- **位置示例**：`server/routes/teachers.py`、`server/routes/students.py`、`server/routes/sync.py`

```9:16:server/routes/teachers.py
teachers = db.query(Teacher).all()
```

#### 风险
- 数据量上来后响应变慢、内存飙升、超时；也更难做权限裁剪。

#### 修复建议
- 加分页（`limit/offset`）、条件过滤、并确保高频字段建索引（例如 `teacher_id`、`student_id`、`week_number`）。

---

## 附：与前端当前实现直接相关的安全问题（重要）

### A) 前端存储凭证方式极不安全（配合 XSS = 账号接管）
- `src/services/authService.ts` 把 `btoa(teacherId:password)` 存入 `localStorage`：

```32:34:src/services/authService.ts
localStorage.setItem('music_scheduler_auth_token', btoa(`${teacherId}:${password}`));
```

- `src/services/api.ts` 会从存储中拼 `Authorization: Basic ...`：

```1:21:src/services/api.ts
return btoa(`${user.teacher_id}:${user.password || ''}`);
```

#### 建议落地方向
- 后端：实现真实鉴权（至少 Basic 校验）→ 逐步升级为 JWT/Session。
- 前端：不要存密码；改存短期 token；并优先使用 HttpOnly Cookie（需要配套 CSRF 和 CORS 白名单）。

---

## 建议整改路线图（最小改动 → 标准化）

### 阶段 1（最小可落地，立即止血）
- 后端实现 `require_auth()`，给所有写接口/敏感读接口加鉴权；`/sync/*` 仅 admin。
- 移除或净化 `dangerouslySetInnerHTML`。
- 收紧 CORS（至少生产环境白名单）。
- 生产环境强制要求 `SECRET_KEY`/DB 密码来自环境变量。

### 阶段 2（标准化安全方案）
- 密码哈希升级为 bcrypt/argon2（含盐、合理 cost）。
- 登录改为 JWT（短期 access + refresh）或服务端 session（HttpOnly Cookie + CSRF）。
- 增加速率限制（登录/写接口）、审计日志、最小权限模型（教师只能改自己的数据，管理员才能做全局写入）。

