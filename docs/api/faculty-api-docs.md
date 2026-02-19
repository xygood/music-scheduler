---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022078439273aee38e5f48e9662da1ca664ad27da9fdaf810caec30c3d0fdfee7d50022100ee71fbf4be4570bfbf67a04f05992cc8c82500fddcc92e251a4bbbc477f86936
    ReservedCode2: 3046022100d0ae6cf42aa15c67009192c5009686265c2ddcc57446fde269b4f6cbc72937e4022100aba7a9f9bb33974b5cc57f0067f48f5d01af3aaeb2ff52a325148e6fe0df5f96
---

# 教研室管理 API 文档

本文档描述了音乐学校课程排课系统中教研室管理功能的 REST API 接口。

## 基础信息

- **Base URL**: `/api`
- **认证方式**: JWT Token (Bearer Token)
- **Content-Type**: application/json

## 教研室接口

### 获取所有教研室列表

获取系统中所有教研室的基本信息。

**Endpoint**: `GET /api/faculty/list`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "faculty_id": "faculty-piano",
      "faculty_code": "PIANO",
      "faculty_name": "钢琴专业",
      "description": "钢琴教学和研究",
      "instrument_count": 3,
      "teacher_count": 15,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "faculty_id": "faculty-vocal",
      "faculty_code": "VOCAL",
      "faculty_name": "声乐专业",
      "description": "声乐演唱教学和研究",
      "instrument_count": 1,
      "teacher_count": 10,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "faculty_id": "faculty-instrument",
      "faculty_code": "INSTRUMENT",
      "faculty_name": "器乐专业",
      "description": "各类乐器教学和研究",
      "instrument_count": 8,
      "teacher_count": 20,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 获取教研室详情

获取特定教研室的详细信息，包括教师列表、乐器配置等。

**Endpoint**: `GET /api/faculty/{faculty_code}`

**Path Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| faculty_code | string | 是 | 教研室代码 (PIANO, VOCAL, INSTRUMENT) |

**Response**:
```json
{
  "success": true,
  "data": {
    "faculty_id": "faculty-piano",
    "faculty_code": "PIANO",
    "faculty_name": "钢琴专业",
    "description": "钢琴教学和研究",
    "instruments": [
      {
        "instrument_id": "inst-piano",
        "instrument_name": "钢琴",
        "max_students_per_class": 5,
        "duration_coefficient": 0.5
      },
      {
        "instrument_id": "inst-piano-ensemble",
        "instrument_name": "钢琴合奏",
        "max_students_per_class": 8,
        "duration_coefficient": 0.5
      },
      {
        "instrument_id": "inst-accompany",
        "instrument_name": "钢琴伴奏",
        "max_students_per_class": 5,
        "duration_coefficient": 0.5
      }
    ],
    "teachers": [
      {
        "teacher_id": "teacher-001",
        "name": "张老师",
        "email": "zhang@music.edu",
        "status": "active",
        "workload_today": 4
      }
    ],
    "statistics": {
      "total_teachers": 15,
      "active_teachers": 14,
      "total_courses": 45,
      "weekly_hours": 180
    }
  }
}
```

---

### 获取教研室的教师列表

获取特定教研室的所有教师。

**Endpoint**: `GET /api/faculty/{faculty_code}/teachers`

**Query Parameters**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | string | 否 | all | 筛选状态 (active, inactive, all) |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页数量 |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "teacher_id": "teacher-001",
      "name": "张老师",
      "email": "zhang@music.edu",
      "primary_instrument": "钢琴",
      "can_teach_instruments": ["钢琴", "钢琴合奏"],
      "status": "active",
      "qualification_level": "primary",
      "workload": {
        "today": 4,
        "this_week": 18
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 15,
    "total_pages": 1
  }
}
```

---

### 获取教研室的乐器列表

获取特定教研室支持的所有乐器。

**Endpoint**: `GET /api/faculty/{faculty_code}/instruments`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "instrument_id": "inst-piano",
      "instrument_name": "钢琴",
      "category": "keyboard",
      "max_students_per_class": 5,
      "duration_coefficient": {
        "major_duration": 0.5,
        "minor_duration": 0.25
      },
      "available_rooms": ["room-101", "room-102", "room-103"]
    }
  ]
}
```

---

### 获取教研室工作量统计

获取特定教研室的工作量统计信息。

**Endpoint**: `GET /api/faculty/{faculty_code}/workload`

**Query Parameters**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| period | string | 否 | week | 统计周期 (day, week, month) |
| start_date | string | 否 | - | 开始日期 (YYYY-MM-DD) |
| end_date | string | 否 | - | 结束日期 (YYYY-MM-DD) |

**Response**:
```json
{
  "success": true,
  "data": {
    "faculty_code": "PIANO",
    "faculty_name": "钢琴专业",
    "period": "week",
    "total_classes": 156,
    "total_hours": 78,
    "teacher_stats": {
      "total_teachers": 15,
      "avg_workload": 10.4,
      "max_workload": 16,
      "min_workload": 4,
      "teachers_overload": 2
    },
    "daily_distribution": {
      "1": 22,
      "2": 24,
      "3": 20,
      "4": 26,
      "5": 28,
      "6": 20,
      "7": 16
    },
    "period_distribution": {
      "1": 18,
      "2": 22,
      "3": 24,
      "4": 20,
      "5": 18,
      "6": 16,
      "7": 14,
      "8": 12,
      "9": 8,
      "10": 4
    }
  }
}
```

---

## 教师资质接口

### 获取教师资质列表

获取当前登录教师的所有资质。

**Endpoint**: `GET /api/teacher/{teacher_id}/qualifications`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "instrument_name": "钢琴",
      "proficiency_level": "primary",
      "granted_at": "2024-01-15T10:30:00Z",
      "granted_by": "admin-001",
      "status": "active"
    },
    {
      "instrument_name": "声乐",
      "proficiency_level": "secondary",
      "granted_at": "2024-01-20T14:20:00Z",
      "granted_by": "admin-001",
      "status": "active"
    }
  ]
}
```

---

### 申请教师资质

教师申请新的教学资质。

**Endpoint**: `POST /api/teacher/{teacher_id}/qualification/grant`

**Request Body**:
```json
{
  "instrument_name": "古筝",
  "proficiency_level": "secondary",
  "reason": "通过古筝专业培训并获得证书"
}
```

**Response**:
```json
{
  "success": true,
  "message": "资质申请已提交，等待管理员审核",
  "data": {
    "qualification_id": "qual-001",
    "instrument_name": "古筝",
    "proficiency_level": "secondary",
    "status": "pending",
    "created_at": "2024-01-25T10:00:00Z"
  }
}
```

---

### 撤销教师资质

管理员撤销教师的教学资质。

**Endpoint**: `DELETE /api/teacher/{teacher_id}/qualification/{instrument_name}`

**Path Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacher_id | string | 是 | 教师ID |
| instrument_name | string | 是 | 乐器名称 |

**Response**:
```json
{
  "success": true,
  "message": "资质已撤销"
}
```

---

### 验证教师资质

验证教师是否有资格教授特定乐器。

**Endpoint**: `POST /api/teacher/qualification/validate`

**Request Body**:
```json
{
  "teacher_id": "teacher-001",
  "instrument_name": "钢琴",
  "faculty_code": "PIANO"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "qualification": {
      "instrument_name": "钢琴",
      "proficiency_level": "primary",
      "can_teach": true
    },
    "message": "教师具备钢琴教学资质"
  }
}
```

---

## 排课接口

### 安排单节课（带教研室验证）

安排单节课时进行完整的教研室验证。

**Endpoint**: `POST /api/schedule/arrange-single`

**Request Body**:
```json
{
  "teacher_id": "teacher-001",
  "student_id": "student-001",
  "course_id": "course-001",
  "day_of_week": 1,
  "period": 1,
  "room_id": "room-101",
  "validate_faculty": true,
  "validate_qualification": true,
  "validate_conflict": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "排课成功",
  "data": {
    "schedule_id": "schedule-001",
    "faculty_code": "PIANO",
    "validation": {
      "faculty_match": true,
      "qualification_valid": true,
      "no_conflict": true,
      "class_not_full": true
    }
  }
}
```

**错误 Response**:
```json
{
  "success": false,
  "error_code": "FACULTY_MISMATCH",
  "message": "教研室不匹配：教师属于声乐专业，无法教授钢琴课程",
  "data": {
    "teacher_faculty": "VOCAL",
    "required_faculty": "PIANO"
  }
}
```

---

### 安排课程（带完整教研室检查）

安排课程时进行完整的教研室和工作量检查。

**Endpoint**: `POST /api/schedule/arrange-with-faculty-check`

**Request Body**:
```json
{
  "teacher_id": "teacher-001",
  "course_template_id": "template-001",
  "student_ids": ["student-001", "student-002", "student-003"],
  "schedule_slots": [
    {
      "day_of_week": 1,
      "period": 1,
      "room_id": "room-101"
    }
  ],
  "options": {
    "auto_assign_room": true,
    "check_teacher_workload": true,
    "allow_cross_faculty": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "课程安排成功",
  "data": {
    "course_id": "course-001",
    "schedules": [
      {
        "schedule_id": "schedule-001",
        "day_of_week": 1,
        "period": 1,
        "room_id": "room-101"
      }
    ],
    "faculty_code": "PIANO",
    "student_count": 3,
    "class_type": "钢琴",
    "workload_check": {
      "teacher_daily_load": 4,
      "teacher_weekly_load": 16,
      "within_limit": true
    }
  }
}
```

---

### 获取教师可排课时段

获取教师可用的排课时段，考虑教研室约束。

**Endpoint**: `GET /api/schedule/available-slots`

**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacher_id | string | 是 | 教师ID |
| instrument | string | 否 | 乐器类型 |
| start_date | string | 是 | 开始日期 |
| end_date | string | 是 | 结束日期 |

**Response**:
```json
{
  "success": true,
  "data": {
    "teacher_id": "teacher-001",
    "available_slots": [
      {
        "date": "2024-01-08",
        "day_of_week": 1,
        "available_periods": [1, 2, 3, 5, 6, 7, 8],
        "conflicts": []
      }
    ],
    "faculty_code": "PIANO",
    "constraints": {
      "max_daily_classes": 8,
      "current_daily_load": 2
    }
  }
}
```

---

### 获取工作量警告

获取教师工作量警告信息。

**Endpoint**: `GET /api/schedule/workload-warnings`

**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teacher_id | string | 是 | 教师ID |
| threshold | int | 否 | 警告阈值（默认8节/天） |

**Response**:
```json
{
  "success": true,
  "data": {
    "has_warning": true,
    "warnings": [
      {
        "date": "2024-01-08",
        "day_of_week": 1,
        "current_load": 9,
        "threshold": 8,
        "message": "2024-01-08 工作量偏高（9节课），建议调整"
      }
    ],
    "suggestions": [
      "考虑将部分课程调整到工作量较低的时段",
      "可安排其他教研室教师协助分担"
    ]
  }
}
```

---

## 统计接口

### 获取教研室工作量汇总

获取所有教研室的工作量汇总。

**Endpoint**: `GET /api/faculty/workload-summary`

**Query Parameters**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| period | string | 否 | week | 统计周期 (day, week, month) |

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "week",
    "generated_at": "2024-01-08T10:00:00Z",
    "faculties": [
      {
        "faculty_code": "PIANO",
        "faculty_name": "钢琴专业",
        "total_classes": 156,
        "total_hours": 78,
        "teacher_count": 15,
        "avg_daily_classes": 22.3,
        "utilization_rate": 85.5,
        "daily_distribution": [22, 24, 20, 26, 28, 20, 16]
      },
      {
        "faculty_code": "VOCAL",
        "faculty_name": "声乐专业",
        "total_classes": 98,
        "total_hours": 49,
        "teacher_count": 10,
        "avg_daily_classes": 14.0,
        "utilization_rate": 72.3,
        "daily_distribution": [14, 16, 12, 18, 16, 12, 10]
      },
      {
        "faculty_code": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "total_classes": 186,
        "total_hours": 93,
        "teacher_count": 20,
        "avg_daily_classes": 26.6,
        "utilization_rate": 88.2,
        "daily_distribution": [26, 28, 24, 32, 30, 26, 20]
      }
    ],
    "overall": {
      "total_classes": 440,
      "total_hours": 220,
      "total_teachers": 45,
      "avg_utilization": 82.0
    }
  }
}
```

---

### 获取热门课程排名

获取各教研室的热门课程排名。

**Endpoint**: `GET /api/faculty/popular-courses`

**Query Parameters**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| faculty_code | string | 否 | - | 教研室代码 |
| period | string | 否 | week | 统计周期 |
| limit | int | 否 | 10 | 返回数量 |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "course_name": "钢琴基础训练",
      "faculty_code": "PIANO",
      "student_count": 45,
      "class_count": 25,
      "trend": "+15%"
    },
    {
      "rank": 2,
      "course_name": "声乐技巧训练",
      "faculty_code": "VOCAL",
      "student_count": 32,
      "class_count": 18,
      "trend": "+8%"
    }
  ]
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| FACULTY_MISMATCH | 教研室不匹配 |
| QUALIFICATION_REQUIRED | 需要相应资质 |
| TIME_CONFLICT | 时间冲突 |
| CLASS_FULL | 班级已满 |
| TEACHER_NOT_FOUND | 教师不存在 |
| INVALID_TIME_SLOT | 无效时间段 |
| WORKLOAD_EXCEEDED | 工作量超限 |
| PERMISSION_DENIED | 权限不足 |

## 认证示例

```bash
# 获取教研室列表
curl -X GET "http://localhost:3000/api/faculty/list" \
  -H "Authorization: Bearer {JWT_TOKEN}"

# 申请资质
curl -X POST "http://localhost:3000/api/teacher/teacher-001/qualification/grant" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "instrument_name": "古筝",
    "proficiency_level": "secondary"
  }'

# 安排课程（带教研室验证）
curl -X POST "http://localhost:3000/api/schedule/arrange-with-faculty-check" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": "teacher-001",
    "student_ids": ["student-001"],
    "schedule_slots": [{"day_of_week": 1, "period": 1}]
  }'
```
