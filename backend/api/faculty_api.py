"""
音乐学校课程排课系统 - 教研室管理API
RESTful API接口，提供教研室管理、教师资格、排课等完整功能

API Version: 1.0
Author: Matrix Agent
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
import sys
import os

# 添加父目录到路径，导入核心模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from teacher_management import TeacherManagement, FACULTY_CONFIG, FACULTY_MAPPING, INSTRUMENT_CONFIGS
from faculty_constraint_validator import FacultyConstraintValidator

# 创建蓝图
faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')
teacher_bp = Blueprint('teacher', __name__, url_prefix='/api/teacher')
schedule_bp = Blueprint('schedule', __name__, url_prefix='/api/schedule')

# 存储（实际项目中应使用数据库）
# 这里使用内存存储作为演示
teachers_db = {}
courses_db = {}
schedule_db = {}
teacher_instruments_db = {}  # teacher_id -> List[instrument_name, proficiency_level]


# =====================================================
# 工具函数
# =====================================================

def success_response(data=None, message="Success", status_code=200):
    """统一成功响应格式"""
    return jsonify({
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }), status_code


def error_response(message, status_code=400, errors=None):
    """统一错误响应格式"""
    return jsonify({
        "success": False,
        "message": message,
        "errors": errors or [],
        "timestamp": datetime.now().isoformat()
    }), status_code


def pagination_params():
    """提取分页参数"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    return page, per_page


# =====================================================
# 教研室管理API
# =====================================================

@faculty_bp.route('/list', methods=['GET'])
def list_faculties():
    """
    获取所有教研室列表

    Query Parameters:
        - include_stats (bool): 是否包含工作量统计

    Response:
        {
            "success": true,
            "data": [
                {
                    "id": "uuid",
                    "faculty_name": "钢琴专业",
                    "faculty_code": "PIANO",
                    "description": "负责所有钢琴课程教学",
                    "teacher_count": 10,
                    "course_count": 50,
                    "class_count": 200
                }
            ]
        }
    """
    include_stats = request.args.get('include_stats', 'false').lower() == 'true'

    faculties = []
    for code, config in FACULTY_CONFIG.items():
        faculty_data = {
            "id": str(uuid.uuid4()),
            "faculty_name": config['faculty_name'],
            "faculty_code": config['code'],
            "description": config['description']
        }

        if include_stats:
            # 统计各教研室数据
            teacher_count = sum(1 for t in teachers_db.values()
                              if t.get('faculty_code') == code)
            course_count = sum(1 for c in courses_db.values()
                             if c.get('faculty_code') == code)
            class_count = sum(1 for s in schedule_db.values()
                            if s.get('faculty_code') == code)

            faculty_data.update({
                "teacher_count": teacher_count,
                "course_count": course_count,
                "class_count": class_count
            })

        faculties.append(faculty_data)

    return success_response(faculties, "获取教研室列表成功")


@faculty_bp.route('/<faculty_name>/teachers', methods=['GET'])
def get_faculty_teachers(faculty_name: str):
    """
    获取指定教研室的教师列表

    Path Parameters:
        - faculty_name: 教研室名称（钢琴专业、声乐专业、器乐专业）

    Query Parameters:
        - page (int): 页码，默认1
        - per_page (int): 每页数量，默认20
        - instrument (str): 按可教授乐器筛选

    Response:
        {
            "success": true,
            "data": {
                "teachers": [...],
                "pagination": {
                    "page": 1,
                    "per_page": 20,
                    "total": 50
                }
            }
        }
    """
    page, per_page = pagination_params()
    instrument_filter = request.args.get('instrument')

    # 获取教研室代码
    faculty_code = None
    for code, config in FACULTY_CONFIG.items():
        if config['faculty_name'] == faculty_name or code == faculty_name:
            faculty_code = code
            break

    if not faculty_code:
        return error_response(f"教研室 '{faculty_name}' 不存在", 404)

    # 筛选教师
    teachers = []
    for teacher_id, teacher in teachers_db.items():
        if teacher.get('faculty_code') != faculty_code:
            continue

        if instrument_filter:
            # 检查教师是否可教授该乐器
            instruments = teacher.get('can_teach_instruments', [])
            if instrument_filter not in instruments:
                continue

        teacher_data = {
            "id": teacher_id,
            "full_name": teacher.get('full_name'),
            "email": teacher.get('email'),
            "faculty_code": teacher.get('faculty_code'),
            "primary_instrument": teacher.get('primary_instrument'),
            "can_teach_instruments": teacher.get('can_teach_instruments', []),
            "course_count": sum(1 for c in courses_db.values()
                              if c.get('teacher_id') == teacher_id),
            "class_count": sum(1 for s in schedule_db.values()
                             if s.get('teacher_id') == teacher_id)
        }
        teachers.append(teacher_data)

    # 分页
    start = (page - 1) * per_page
    end = start + per_page
    paginated_teachers = teachers[start:end]

    return success_response({
        "teachers": paginated_teachers,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": len(teachers)
        }
    }, f"获取{faculty_name}教师列表成功")


@faculty_bp.route('/<faculty_name>/instruments', methods=['GET'])
def get_faculty_instruments(faculty_name: str):
    """
    获取教研室的乐器配置

    Path Parameters:
        - faculty_name: 教研室名称

    Response:
        {
            "success": true,
            "data": {
                "faculty_name": "钢琴专业",
                "faculty_code": "PIANO",
                "instruments": [
                    {
                        "instrument_name": "钢琴",
                        "max_students_per_class": 5,
                        "duration_coefficient": {...}
                    }
                ]
            }
        }
    """
    # 获取教研室代码
    faculty_code = None
    target_faculty_name = None
    for code, config in FACULTY_CONFIG.items():
        if config['faculty_name'] == faculty_name or code == faculty_name:
            faculty_code = code
            target_faculty_name = config['faculty_name']
            break

    if not faculty_code:
        return error_response(f"教研室 '{faculty_name}' 不存在", 404)

    # 获取该教研室的乐器
    instruments = []
    for name, config in INSTRUMENT_CONFIGS.items():
        if config['faculty'] == faculty_code:
            instruments.append({
                "instrument_name": name,
                "max_students_per_class": config['max_students'],
                "duration_coefficient": {
                    "major_duration": 0.5,
                    "minor_duration": 0.25
                }
            })

    return success_response({
        "faculty_name": target_faculty_name,
        "faculty_code": faculty_code,
        "instruments": instruments
    }, f"获取{faculty_name}乐器配置成功")


@faculty_bp.route('/workload-summary', methods=['GET'])
def get_faculty_workload_summary():
    """
    获取教研室工作量统计摘要

    Query Parameters:
        - start_date (str): 开始日期，YYYY-MM-DD格式
        - end_date (str): 结束日期，YYYY-MM-DD格式

    Response:
        {
            "success": true,
            "data": {
                "period": {"start": "2024-01-01", "end": "2024-01-07"},
                "faculties": [
                    {
                        "faculty_name": "钢琴专业",
                        "total_classes": 100,
                        "daily_avg": 14.3,
                        "teacher_count": 10,
                        "class_distribution": {...}
                    }
                ]
            }
        }
    """
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))

    faculties_summary = []

    for code, config in FACULTY_CONFIG.items():
        # 统计该教研室的工作量
        faculty_classes = [s for s in schedule_db.values()
                         if s.get('faculty_code') == code]

        # 按日期分组统计
        daily_distribution = {}
        for cls in faculty_classes:
            date = cls.get('date', cls.get('day_of_week'))
            if date not in daily_distribution:
                daily_distribution[date] = 0
            daily_distribution[date] += 1

        total_classes = len(faculty_classes)
        daily_avg = total_classes / max(1, len(daily_distribution))

        faculties_summary.append({
            "faculty_name": config['faculty_name'],
            "faculty_code": code,
            "total_classes": total_classes,
            "daily_avg": round(daily_avg, 1),
            "teacher_count": sum(1 for t in teachers_db.values()
                               if t.get('faculty_code') == code),
            "class_distribution": daily_distribution
        })

    return success_response({
        "period": {
            "start": start_date,
            "end": end_date
        },
        "faculties": faculties_summary
    }, "获取教研室工作量统计成功")


# =====================================================
# 教师资格管理API
# =====================================================

@teacher_bp.route('/<teacher_id>/qualifications', methods=['GET'])
def get_teacher_qualifications(teacher_id: str):
    """
    获取教师的教学资格列表

    Path Parameters:
        - teacher_id: 教师ID

    Response:
        {
            "success": true,
            "data": {
                "teacher": {
                    "id": "uuid",
                    "full_name": "张三",
                    "faculty_name": "钢琴专业",
                    "primary_instrument": "钢琴"
                },
                "qualifications": [
                    {
                        "instrument_name": "钢琴",
                        "proficiency_level": "primary",
                        "granted_at": "2024-01-01T00:00:00"
                    }
                ]
            }
        }
    """
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    # 获取资格列表
    qualifications = teacher_instruments_db.get(teacher_id, [])

    return success_response({
        "teacher": {
            "id": teacher_id,
            "full_name": teacher.get('full_name'),
            "faculty_name": FACULTY_CONFIG.get(teacher.get('faculty_code'), {}).get('faculty_name'),
            "faculty_code": teacher.get('faculty_code'),
            "primary_instrument": teacher.get('primary_instrument')
        },
        "qualifications": qualifications
    }, "获取教师资格列表成功")


@teacher_bp.route('/<teacher_id>/qualification/grant', methods=['POST'])
def grant_teacher_qualification(teacher_id: str):
    """
    授予教师教学资格

    Path Parameters:
        - teacher_id: 教师ID

    Request Body:
        {
            "instrument_name": "钢琴",
            "proficiency_level": "primary"  // primary, secondary, assistant
        }

    Response:
        {
            "success": true,
            "data": {
                "teacher_id": "uuid",
                "instrument_name": "钢琴",
                "proficiency_level": "primary"
            }
        }
    """
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    data = request.json
    instrument_name = data.get('instrument_name')
    proficiency_level = data.get('proficiency_level', 'secondary')

    if not instrument_name:
        return error_response("请指定乐器名称")

    # 验证乐器是否存在
    if instrument_name not in INSTRUMENT_CONFIGS:
        return error_response(f"乐器 '{instrument_name}' 不在配置中")

    # 验证熟练程度
    if proficiency_level not in ['primary', 'secondary', 'assistant']:
        return error_response("熟练程度必须是 primary, secondary 或 assistant")

    # 检查教研室是否匹配
    instrument_faculty = INSTRUMENT_CONFIGS[instrument_name]['faculty']
    teacher_faculty = teacher.get('faculty_code')

    if teacher_faculty and instrument_faculty != teacher_faculty:
        return error_response(
            f"教师属于{FACULTY_CONFIG.get(teacher_faculty, {}).get('faculty_name')}，"
            f"不能授予{instrument_name}（{FACULTY_CONFIG.get(instrument_faculty, {}).get('faculty_name')}）的资格",
            403
        )

    # 添加资格
    if teacher_id not in teacher_instruments_db:
        teacher_instruments_db[teacher_id] = []

    # 检查是否已存在
    existing = next(
        (q for q in teacher_instruments_db[teacher_id]
         if q['instrument_name'] == instrument_name),
        None
    )

    if existing:
        # 更新熟练程度
        existing['proficiency_level'] = proficiency_level
        existing['updated_at'] = datetime.now().isoformat()
    else:
        # 添加新资格
        teacher_instruments_db[teacher_id].append({
            "instrument_name": instrument_name,
            "proficiency_level": proficiency_level,
            "granted_at": datetime.now().isoformat()
        })

        # 更新教师可教授乐器列表
        instruments = teacher.get('can_teach_instruments', [])
        if instrument_name not in instruments:
            instruments.append(instrument_name)
            teacher['can_teach_instruments'] = instruments

    return success_response({
        "teacher_id": teacher_id,
        "instrument_name": instrument_name,
        "proficiency_level": proficiency_level
    }, f"成功授予{instrument_name}教学资格")


@teacher_bp.route('/<teacher_id>/qualification/<instrument_name>', methods=['DELETE'])
def revoke_teacher_qualification(teacher_id: str, instrument_name: str):
    """
    撤销教师教学资格

    Path Parameters:
        - teacher_id: 教师ID
        - instrument_name: 乐器名称

    Response:
        {
            "success": true,
            "message": "成功撤销钢琴教学资格"
        }
    """
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    if teacher_id not in teacher_instruments_db:
        return error_response("该教师没有任何教学资格", 404)

    # 查找并删除资格
    qualifications = teacher_instruments_db[teacher_id]
    qualification = next(
        (q for q in qualifications if q['instrument_name'] == instrument_name),
        None
    )

    if not qualification:
        return error_response(f"该教师没有{instrument_name}的教学资格", 404)

    qualifications.remove(qualification)

    # 更新教师可教授乐器列表
    instruments = teacher.get('can_teach_instruments', [])
    if instrument_name in instruments:
        instruments.remove(instrument_name)

    return success_response(None, f"成功撤销{instrument_name}教学资格")


@teacher_bp.route('/<teacher_id>/qualification/validate', methods=['POST'])
def validate_teacher_qualification(teacher_id: str):
    """
    验证教师是否有资格教授指定乐器

    Path Parameters:
        - teacher_id: 教师ID

    Request Body:
        {
            "instrument_name": "钢琴"
        }

    Response:
        {
            "success": true,
            "data": {
                "valid": true,
                "faculty_match": true,
                "qualification_exists": true,
                "message": "教师有资格教授钢琴"
            }
        }
    """
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    data = request.json
    instrument_name = data.get('instrument_name')

    if not instrument_name:
        return error_response("请指定要验证的乐器")

    # 检查教研室匹配
    instrument_faculty = INSTRUMENT_CONFIGS.get(instrument_name, {}).get('faculty')
    teacher_faculty = teacher.get('faculty_code')

    faculty_match = teacher_faculty == instrument_faculty

    # 检查资格是否存在
    qualifications = teacher_instruments_db.get(teacher_id, [])
    qualification = next(
        (q for q in qualifications if q['instrument_name'] == instrument_name),
        None
    )
    qualification_exists = qualification is not None

    # 综合判断
    valid = faculty_match and qualification_exists

    if not valid:
        reasons = []
        if not faculty_match:
            faculty_name = FACULTY_CONFIG.get(teacher_faculty, {}).get('faculty_name', '未知')
            instrument_faculty_name = FACULTY_CONFIG.get(instrument_faculty, {}).get('faculty_name', '未知')
            reasons.append(f"教师属于{faculty_name}，无法教授{instrument_faculty_name}的课程")
        if not qualification_exists:
            reasons.append(f"教师未被授权教授{instrument_name}")

        message = "；".join(reasons)
    else:
        message = f"教师有资格教授{instrument_name}"

    return success_response({
        "valid": valid,
        "faculty_match": faculty_match,
        "qualification_exists": qualification_exists,
        "message": message
    }, "资格验证完成")


@teacher_bp.route('/<teacher_id>/faculty-workload', methods=['GET'])
def get_teacher_faculty_workload(teacher_id: str):
    """
    获取教师在各教研室的工作量

    Path Parameters:
        - teacher_id: 教师ID

    Query Parameters:
        - start_date (str): 开始日期
        - end_date (str): 结束日期

    Response:
        {
            "success": true,
            "data": {
                "teacher": {...},
                "total_classes": 50,
                "by_faculty": [
                    {
                        "faculty_name": "钢琴专业",
                        "class_count": 40,
                        "percentage": 80.0
                    }
                ],
                "daily_distribution": {...}
            }
        }
    """
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))

    # 获取教师的排课记录
    teacher_classes = [s for s in schedule_db.values() if s.get('teacher_id') == teacher_id]

    # 按教研室分组统计
    by_faculty = {}
    for cls in teacher_classes:
        faculty_code = cls.get('faculty_code', 'INSTRUMENT')
        if faculty_code not in by_faculty:
            by_faculty[faculty_code] = 0
        by_faculty[faculty_code] += 1

    total = len(teacher_classes)
    faculty_stats = []
    for code, count in by_faculty.items():
        faculty_name = FACULTY_CONFIG.get(code, {}).get('faculty_name', code)
        faculty_stats.append({
            "faculty_name": faculty_name,
            "faculty_code": code,
            "class_count": count,
            "percentage": round(count / max(1, total) * 100, 1)
        })

    # 按课程数降序排序
    faculty_stats.sort(key=lambda x: x['class_count'], reverse=True)

    # 按日期分布
    daily_distribution = {}
    for cls in teacher_classes:
        date = cls.get('date', str(cls.get('day_of_week')))
        if date not in daily_distribution:
            daily_distribution[date] = 0
        daily_distribution[date] += 1

    return success_response({
        "teacher": {
            "id": teacher_id,
            "full_name": teacher.get('full_name'),
            "faculty_name": FACULTY_CONFIG.get(teacher.get('faculty_code'), {}).get('faculty_name')
        },
        "total_classes": total,
        "by_faculty": faculty_stats,
        "daily_distribution": daily_distribution
    }, "获取教师工作量统计成功")


# =====================================================
# 排课API（带教研室验证）
# =====================================================

@schedule_bp.route('/arrange-single', methods=['POST'])
def arrange_single_class():
    """
    安排单节课程（带教研室验证）

    Request Body:
        {
            "teacher_id": "uuid",
            "course_id": "uuid",
            "room_id": "uuid",
            "student_id": "uuid",
            "day_of_week": 1,
            "period": 1,
            "date": "2024-01-08"  // 可选，按日期排课
        }

    Response:
        {
            "success": true,
            "data": {
                "class_id": "uuid",
                "validation": {
                    "faculty_valid": true,
                    "qualification_valid": true,
                    "time_available": true,
                    "room_available": true
                }
            }
        }
    """
    data = request.json

    # 验证必填字段
    required_fields = ['teacher_id', 'course_id', 'room_id', 'day_of_week', 'period']
    for field in required_fields:
        if not data.get(field):
            return error_response(f"缺少必填字段: {field}")

    teacher_id = data['teacher_id']
    course_id = data['course_id']
    room_id = data['room_id']
    day_of_week = data['day_of_week']
    period = data['period']
    date = data.get('date')

    # 验证教师存在
    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    # 验证课程存在
    course = courses_db.get(course_id)
    if not course:
        return error_response("课程不存在", 404)

    # 教研室验证
    validator = FacultyConstraintValidator(list(schedule_db.values()))

    # 验证教师资格
    instrument_type = course.get('course_type')
    qualification_result = validator.checkTeacherQualification(teacher_id, instrument_type)

    # 验证教研室匹配
    faculty_match_result = validator.checkFacultyMatch(teacher_id, instrument_type)

    # 检查时间冲突
    time_conflict = validator.hasTimeConflict(teacher_id, date or str(day_of_week), period)

    # 检查教室冲突
    room_conflict = any(
        s.get('room_id') == room_id and
        s.get('day_of_week') == day_of_week and
        s.get('period') == period and
        (not date or s.get('date') == date)
        for s in schedule_db.values()
    )

    # 综合验证
    all_valid = (
        qualification_result['valid'] and
        faculty_match_result['valid'] and
        not time_conflict and
        not room_conflict
    )

    if not all_valid:
        errors = []
        if not qualification_result['valid']:
            errors.append(qualification_result.get('message', '教师资格验证失败'))
        if not faculty_match_result['valid']:
            errors.append(faculty_match_result.get('message', '教研室匹配验证失败'))
        if time_conflict:
            errors.append("教师在该时间段已有课程安排")
        if room_conflict:
            errors.append("教室已被占用")

("排课验证        return error_response失败", 400, errors)

    # 创建排课记录
    class_id = str(uuid.uuid4())
    schedule_db[class_id] = {
        "id": class_id,
        "teacher_id": teacher_id,
        "course_id": course_id,
        "room_id": room_id,
        "student_id": data.get('student_id'),
        "day_of_week": day_of_week,
        "period": period,
        "date": date,
        "faculty_code": teacher.get('faculty_code'),
        "status": "scheduled",
        "created_at": datetime.now().isoformat()
    }

    return success_response({
        "class_id": class_id,
        "validation": {
            "faculty_valid": faculty_match_result['valid'],
            "qualification_valid": qualification_result['valid'],
            "time_available": not time_conflict,
            "room_available": not room_conflict
        }
    }, "排课成功")


@schedule_bp.route('/arrange-with-faculty-check', methods=['POST'])
def arrange_with_faculty_check():
    """
    完整教研室检查排课（包含所有验证）

    Request Body:
        {
            "teacher_id": "uuid",
            "course_id": "uuid",
            "room_id": "uuid",
            "student_id": "uuid",
            "day_of_week": 1,
            "period": 1,
            "date": "2024-01-08"
        }

    Response:
        {
            "success": true,
            "data": {
                "class_id": "uuid",
                "validation_result": {...},
                "workload_warning": null
            }
        }
    """
    data = request.json

    # 基础验证
    required_fields = ['teacher_id', 'course_id', 'room_id', 'day_of_week', 'period']
    for field in required_fields:
        if not data.get(field):
            return error_response(f"缺少必填字段: {field}")

    teacher_id = data['teacher_id']
    course_id = data['course_id']
    room_id = data['room_id']
    day_of_week = data['day_of_week']
    period = data['period']
    date = data.get('date')

    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    course = courses_db.get(course_id)
    if not course:
        return error_response("课程不存在", 404)

    # 完整验证
    validator = FacultyConstraintValidator(list(schedule_db.values()))

    # 1. 验证教师资格
    qualification_result = validator.checkTeacherQualification(teacher_id, course['course_type'])

    # 2. 验证教研室匹配
    faculty_match_result = validator.checkFacultyMatch(teacher_id, course['course_type'])

    # 3. 检查工作量
    load_result = validator.checkFacultyDailyLoad(teacher_id, date or str(day_of_week))

    # 4. 检查冲突
    time_conflict = validator.hasTimeConflict(teacher_id, date or str(day_of_week), period)
    room_conflict = any(
        s.get('room_id') == room_id and
        s.get('day_of_week') == day_of_week and
        s.get('period') == period and
        (not date or s.get('date') == date)
        for s in schedule_db.values()
    )

    # 构建验证结果
    validation_result = {
        "faculty_match": {
            "valid": faculty_match_result['valid'],
            "message": faculty_match_result.get('message', '教研室匹配')
        },
        "qualification": {
            "valid": qualification_result['valid'],
            "message": qualification_result.get('message', '教师资格')
        },
        "time_availability": {
            "available": not time_conflict,
            "message": "时间段可用" if not time_conflict else "时间段冲突"
        },
        "room_availability": {
            "available": not room_conflict,
            "message": "教室可用" if not room_conflict else "教室已被占用"
        }
    }

    # 检查是否可以通过
    can_schedule = (
        qualification_result['valid'] and
        faculty_match_result['valid'] and
        not time_conflict and
        not room_conflict
    )

    if not can_schedule:
        errors = []
        if not qualification_result['valid']:
            errors.append(qualification_result.get('message'))
        if not faculty_match_result['valid']:
            errors.append(faculty_match_result.get('message'))
        if time_conflict:
            errors.append("教师时间冲突")
        if room_conflict:
            errors.append("教室已被占用")

        return error_response("排课验证失败", 400, errors)

    # 创建排课记录
    class_id = str(uuid.uuid4())
    schedule_db[class_id] = {
        "id": class_id,
        "teacher_id": teacher_id,
        "course_id": course_id,
        "room_id": room_id,
        "student_id": data.get('student_id'),
        "day_of_week": day_of_week,
        "period": period,
        "date": date,
        "faculty_code": teacher.get('faculty_code'),
        "status": "scheduled",
        "created_at": datetime.now().isoformat()
    }

    return success_response({
        "class_id": class_id,
        "validation_result": validation_result,
        "workload_warning": load_result.get('message') if load_result.get('warning') else None
    }, "排课成功")


@schedule_bp.route('/generate-with-faculty', methods=['POST'])
def generate_schedule_with_faculty():
    """
    根据教研室约束生成排课计划

    Request Body:
        {
            "teacher_id": "uuid",
            "course_ids": ["uuid1", "uuid2"],
            "start_date": "2024-01-08",
            "end_date": "2024-01-14",
            "preferred_days": [1, 2, 3, 4, 5],
            "avoid_conflicts": true
        }

    Response:
        {
            "success": true,
            "data": {
                "scheduled": [...],
                "failed": [...],
                "statistics": {...}
            }
        }
    """
    data = request.json

    teacher_id = data.get('teacher_id')
    course_ids = data.get('course_ids', [])
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    preferred_days = data.get('preferred_days', [1, 2, 3, 4, 5])
    avoid_conflicts = data.get('avoid_conflicts', True)

    teacher = teachers_db.get(teacher_id)
    if not teacher:
        return error_response("教师不存在", 404)

    validator = FacultyConstraintValidator(list(schedule_db.values()))

    scheduled = []
    failed = []

    for course_id in course_ids:
        course = courses_db.get(course_id)
        if not course:
            continue

        # 尝试找到可用时段
        found_slot = False
        for day in preferred_days:
            if found_slot:
                break
            for period in range(1, 11):
                # 检查验证
                if avoid_conflicts:
                    if validator.hasTimeConflict(teacher_id, str(day), period):
                        continue

                # 验证教师资格
                qualification = validator.checkTeacherQualification(teacher_id, course['course_type'])
                if not qualification['valid']:
                    failed.append({
                        "course_id": course_id,
                        "course_name": course.get('course_name'),
                        "reason": qualification.get('message')
                    })
                    found_slot = True
                    break

                # 验证教研室匹配
                faculty_match = validator.checkFacultyMatch(teacher_id, course['course_type'])
                if not faculty_match['valid']:
                    failed.append({
                        "course_id": course_id,
                        "course_name": course.get('course_name'),
                        "reason": faculty_match.get('message')
                    })
                    found_slot = True
                    break

                # 安排课程
                class_id = str(uuid.uuid4())
                schedule_db[class_id] = {
                    "id": class_id,
                    "teacher_id": teacher_id,
                    "course_id": course_id,
                    "room_id": None,  # 待分配
                    "student_id": course.get('student_id'),
                    "day_of_week": day,
                    "period": period,
                    "date": start_date,
                    "faculty_code": teacher.get('faculty_code'),
                    "status": "scheduled",
                    "created_at": datetime.now().isoformat()
                }

                scheduled.append({
                    "class_id": class_id,
                    "course_id": course_id,
                    "course_name": course.get('course_name'),
                    "day_of_week": day,
                    "period": period
                })
                found_slot = True
                break

        if not found_slot:
            failed.append({
                "course_id": course_id,
                "course_name": course.get('course_name'),
                "reason": "无法找到合适的排课时段"
            })

    return success_response({
        "scheduled": scheduled,
        "failed": failed,
        "statistics": {
            "total": len(course_ids),
            "success": len(scheduled),
            "failed": len(failed),
            "success_rate": round(len(scheduled) / max(1, len(course_ids)) * 100, 1)
        }
    }, f"排课完成，成功{len(scheduled)}个，失败{len(failed)}个")


# =====================================================
# 注册蓝图
# =====================================================

def register_api_routes(app):
    """注册所有API蓝图"""
    app.register_blueprint(faculty_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(schedule_bp)
