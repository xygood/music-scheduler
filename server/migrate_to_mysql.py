#!/usr/bin/env python3
"""
MySQL 数据库迁移脚本
将 localStorage 数据迁移到 MySQL 数据库

使用方法:
    python migrate_to_mysql.py <localStorage_export.json>

步骤:
    1. 在浏览器控制台导出 localStorage 数据
    2. 执行此脚本进行迁移
"""

import os
import sys
import json
import uuid
from datetime import datetime

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def get_mysql_connection():
    """获取MySQL连接"""
    mysql_host = os.environ.get('MYSQL_HOST', 'localhost')
    mysql_port = int(os.environ.get('MYSQL_PORT', 3306))
    mysql_user = os.environ.get('MYSQL_USER', 'scheduler')
    mysql_password = os.environ.get('MYSQL_PASSWORD', 'Scheduler@2026')
    mysql_database = os.environ.get('MYSQL_DATABASE', 'music_scheduler')
    
    connection_string = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}?charset=utf8mb4"
    
    engine = create_engine(
        connection_string,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )
    return engine

def load_json_data(json_file_path):
    """从JSON文件加载数据"""
    if not os.path.exists(json_file_path):
        raise FileNotFoundError(f"数据文件不存在: {json_file_path}")
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def safe_json(obj):
    """安全转换为JSON字符串"""
    if obj is None:
        return None
    if isinstance(obj, str):
        return obj
    return json.dumps(obj, ensure_ascii=False)

def safe_value(value, default=None):
    """安全获取值"""
    if value is None:
        return default
    return value

def migrate_users(engine, data):
    """迁移用户数据"""
    users = data.get('music_scheduler_users', [])
    if not users:
        print("  没有用户数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for user in users:
            try:
                conn.execute(text("""
                    INSERT INTO users (id, teacher_id, email, password, full_name, 
                                      department, faculty_id, faculty_code, specialty, 
                                      is_admin, created_at)
                    VALUES (:id, :teacher_id, :email, :password, :full_name,
                           :department, :faculty_id, :faculty_code, :specialty,
                           :is_admin, :created_at)
                    ON DUPLICATE KEY UPDATE
                        email = VALUES(email),
                        full_name = VALUES(full_name),
                        updated_at = NOW()
                """), {
                    'id': safe_value(user.get('id'), str(uuid.uuid4())),
                    'teacher_id': user.get('teacher_id'),
                    'email': user.get('email'),
                    'password': safe_value(user.get('password'), ''),
                    'full_name': safe_value(user.get('full_name'), ''),
                    'department': user.get('department'),
                    'faculty_id': user.get('faculty_id'),
                    'faculty_code': user.get('faculty_code'),
                    'specialty': safe_json(user.get('specialty', [])),
                    'is_admin': 1 if user.get('teacher_id') == '110' else 0,
                    'created_at': safe_value(user.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移用户失败: {user.get('teacher_id')} - {e}")
        conn.commit()
    print(f"  用户迁移完成: {count} 条记录")
    return count

def migrate_teachers(engine, data):
    """迁移教师数据"""
    teachers = data.get('music_scheduler_teachers', [])
    if not teachers:
        print("  没有教师数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for teacher in teachers:
            try:
                conn.execute(text("""
                    INSERT INTO teachers (id, teacher_id, name, full_name, email, phone,
                                        department, faculty_id, faculty_code, faculty_name,
                                        position, hire_date, status, primary_instrument,
                                        can_teach_instruments, max_students_per_class,
                                        fixed_room_id, fixed_rooms, qualifications, remarks, created_at)
                    VALUES (:id, :teacher_id, :name, :full_name, :email, :phone,
                           :department, :faculty_id, :faculty_code, :faculty_name,
                           :position, :hire_date, :status, :primary_instrument,
                           :can_teach_instruments, :max_students_per_class,
                           :fixed_room_id, :fixed_rooms, :qualifications, :remarks, :created_at)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        faculty_code = VALUES(faculty_code),
                        updated_at = NOW()
                """), {
                    'id': safe_value(teacher.get('id'), teacher.get('teacher_id')),
                    'teacher_id': teacher.get('teacher_id'),
                    'name': safe_value(teacher.get('name'), ''),
                    'full_name': teacher.get('full_name') or teacher.get('name', ''),
                    'email': teacher.get('email'),
                    'phone': teacher.get('phone'),
                    'department': teacher.get('department'),
                    'faculty_id': teacher.get('faculty_id'),
                    'faculty_code': teacher.get('faculty_code'),
                    'faculty_name': teacher.get('faculty_name'),
                    'position': teacher.get('position'),
                    'hire_date': teacher.get('hire_date'),
                    'status': safe_value(teacher.get('status'), 'active'),
                    'primary_instrument': teacher.get('primary_instrument'),
                    'can_teach_instruments': safe_json(teacher.get('can_teach_instruments', [])),
                    'max_students_per_class': safe_value(teacher.get('max_students_per_class'), 5),
                    'fixed_room_id': teacher.get('fixed_room_id'),
                    'fixed_rooms': safe_json(teacher.get('fixed_rooms', [])),
                    'qualifications': safe_json(teacher.get('qualifications', [])),
                    'remarks': teacher.get('remarks'),
                    'created_at': safe_value(teacher.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移教师失败: {teacher.get('teacher_id')} - {e}")
        conn.commit()
    print(f"  教师迁移完成: {count} 条记录")
    return count

def migrate_students(engine, data):
    """迁移学生数据"""
    students = data.get('music_scheduler_students', [])
    if not students:
        print("  没有学生数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for student in students:
            try:
                conn.execute(text("""
                    INSERT INTO students (id, student_id, name, teacher_id, major_class,
                                        grade, student_type, primary_instrument, secondary_instruments,
                                        faculty_code, enrollment_year, current_grade, student_status,
                                        status, remarks, assigned_teachers, secondary1_teacher_id,
                                        secondary1_teacher_name, secondary2_teacher_id, secondary2_teacher_name,
                                        secondary3_teacher_id, secondary3_teacher_name, secondary_instrument1,
                                        secondary_instrument2, secondary_instrument3, notes, created_at)
                    VALUES (:id, :student_id, :name, :teacher_id, :major_class,
                           :grade, :student_type, :primary_instrument, :secondary_instruments,
                           :faculty_code, :enrollment_year, :current_grade, :student_status,
                           :status, :remarks, :assigned_teachers, :secondary1_teacher_id,
                           :secondary1_teacher_name, :secondary2_teacher_id, :secondary2_teacher_name,
                           :secondary3_teacher_id, :secondary3_teacher_name, :secondary_instrument1,
                           :secondary_instrument2, :secondary_instrument3, :notes, :created_at)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        major_class = VALUES(major_class),
                        updated_at = NOW()
                """), {
                    'id': safe_value(student.get('id'), str(uuid.uuid4())),
                    'student_id': student.get('student_id'),
                    'name': safe_value(student.get('name'), ''),
                    'teacher_id': student.get('teacher_id'),
                    'major_class': student.get('major_class'),
                    'grade': student.get('grade'),
                    'student_type': safe_value(student.get('student_type'), 'general'),
                    'primary_instrument': student.get('primary_instrument'),
                    'secondary_instruments': safe_json(student.get('secondary_instruments', [])),
                    'faculty_code': student.get('faculty_code'),
                    'enrollment_year': student.get('enrollment_year'),
                    'current_grade': student.get('current_grade'),
                    'student_status': safe_value(student.get('student_status'), 'active'),
                    'status': safe_value(student.get('status'), 'active'),
                    'remarks': student.get('remarks'),
                    'assigned_teachers': safe_json(student.get('assigned_teachers', {})),
                    'secondary1_teacher_id': student.get('secondary1_teacher_id'),
                    'secondary1_teacher_name': student.get('secondary1_teacher_name'),
                    'secondary2_teacher_id': student.get('secondary2_teacher_id'),
                    'secondary2_teacher_name': student.get('secondary2_teacher_name'),
                    'secondary3_teacher_id': student.get('secondary3_teacher_id'),
                    'secondary3_teacher_name': student.get('secondary3_teacher_name'),
                    'secondary_instrument1': student.get('secondary_instrument1'),
                    'secondary_instrument2': student.get('secondary_instrument2'),
                    'secondary_instrument3': student.get('secondary_instrument3'),
                    'notes': student.get('notes'),
                    'created_at': safe_value(student.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移学生失败: {student.get('student_id')} - {e}")
        conn.commit()
    print(f"  学生迁移完成: {count} 条记录")
    return count

def migrate_classes(engine, data):
    """迁移班级数据"""
    classes = data.get('music_scheduler_classes', [])
    if not classes:
        print("  没有班级数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for cls in classes:
            try:
                conn.execute(text("""
                    INSERT INTO classes (id, class_id, class_name, enrollment_year,
                                        class_number, student_count, student_type, status, created_at)
                    VALUES (:id, :class_id, :class_name, :enrollment_year,
                           :class_number, :student_count, :student_type, :status, :created_at)
                    ON DUPLICATE KEY UPDATE
                        student_count = VALUES(student_count),
                        status = VALUES(status),
                        updated_at = NOW()
                """), {
                    'id': safe_value(cls.get('id'), str(uuid.uuid4())),
                    'class_id': cls.get('class_id'),
                    'class_name': safe_value(cls.get('class_name'), ''),
                    'enrollment_year': cls.get('enrollment_year'),
                    'class_number': cls.get('class_number'),
                    'student_count': safe_value(cls.get('student_count'), 0),
                    'student_type': safe_value(cls.get('student_type'), 'general'),
                    'status': safe_value(cls.get('status'), 'active'),
                    'created_at': safe_value(cls.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移班级失败: {cls.get('class_name')} - {e}")
        conn.commit()
    print(f"  班级迁移完成: {count} 条记录")
    return count

def migrate_courses(engine, data):
    """迁移课程数据"""
    courses = data.get('music_scheduler_courses', [])
    if not courses:
        print("  没有课程数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for course in courses:
            try:
                conn.execute(text("""
                    INSERT INTO courses (id, course_id, course_name, course_type, faculty_id,
                                        teacher_id, teacher_name, student_id, student_name,
                                        major_class, academic_year, semester, semester_label,
                                        course_category, primary_instrument, secondary_instrument,
                                        duration, week_frequency, credit, credit_hours, required_hours, total_hours, weeks,
                                        group_size, student_count, teaching_type, created_at)
                    VALUES (:id, :course_id, :course_name, :course_type, :faculty_id,
                           :teacher_id, :teacher_name, :student_id, :student_name,
                           :major_class, :academic_year, :semester, :semester_label,
                           :course_category, :primary_instrument, :secondary_instrument,
                           :duration, :week_frequency, :credit, :credit_hours, :required_hours, :total_hours, :weeks,
                           :group_size, :student_count, :teaching_type, :created_at)
                    ON DUPLICATE KEY UPDATE
                        course_name = VALUES(course_name),
                        credit_hours = VALUES(credit_hours),
                        total_hours = VALUES(total_hours),
                        weeks = VALUES(weeks),
                        updated_at = NOW()
                """), {
                    'id': safe_value(course.get('id'), str(uuid.uuid4())),
                    'course_id': course.get('course_id'),
                    'course_name': safe_value(course.get('course_name'), ''),
                    'course_type': safe_value(course.get('course_type'), ''),
                    'faculty_id': course.get('faculty_id'),
                    'teacher_id': course.get('teacher_id'),
                    'teacher_name': course.get('teacher_name'),
                    'student_id': course.get('student_id'),
                    'student_name': course.get('student_name'),
                    'major_class': course.get('major_class'),
                    'academic_year': course.get('academic_year'),
                    'semester': course.get('semester'),
                    'semester_label': course.get('semester_label'),
                    'course_category': safe_value(course.get('course_category'), 'general'),
                    'primary_instrument': course.get('primary_instrument'),
                    'secondary_instrument': course.get('secondary_instrument'),
                    'duration': safe_value(course.get('duration'), 30),
                    'week_frequency': safe_value(course.get('week_frequency'), 1),
                    'credit': safe_value(course.get('credit') or course.get('credit_hours'), 1),
                    'credit_hours': safe_value(course.get('credit_hours') or course.get('credit'), 1),
                    'required_hours': safe_value(course.get('required_hours') or course.get('total_hours'), 16),
                    'total_hours': safe_value(course.get('total_hours') or course.get('required_hours'), 16),
                    'weeks': safe_value(course.get('weeks'), 16),
                    'group_size': safe_value(course.get('group_size'), 1),
                    'student_count': safe_value(course.get('student_count'), 1),
                    'teaching_type': course.get('teaching_type'),
                    'created_at': safe_value(course.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移课程失败: {course.get('course_name')} - {e}")
        conn.commit()
    print(f"  课程迁移完成: {count} 条记录")
    return count

def migrate_rooms(engine, data):
    """迁移教室数据"""
    rooms = data.get('music_scheduler_rooms', [])
    if not rooms:
        print("  没有教室数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for room in rooms:
            try:
                conn.execute(text("""
                    INSERT INTO rooms (id, teacher_id, room_name, room_type, faculty_code,
                                      capacity, location, equipment, status, last_maintenance, created_at)
                    VALUES (:id, :teacher_id, :room_name, :room_type, :faculty_code,
                           :capacity, :location, :equipment, :status, :last_maintenance, :created_at)
                    ON DUPLICATE KEY UPDATE
                        room_type = VALUES(room_type),
                        capacity = VALUES(capacity),
                        updated_at = NOW()
                """), {
                    'id': safe_value(room.get('id'), str(uuid.uuid4())),
                    'teacher_id': room.get('teacher_id'),
                    'room_name': safe_value(room.get('room_name'), ''),
                    'room_type': safe_value(room.get('room_type'), '琴房'),
                    'faculty_code': room.get('faculty_code'),
                    'capacity': safe_value(room.get('capacity'), 1),
                    'location': room.get('location'),
                    'equipment': safe_json(room.get('equipment', [])),
                    'status': safe_value(room.get('status'), '空闲'),
                    'last_maintenance': room.get('last_maintenance'),
                    'created_at': safe_value(room.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移教室失败: {room.get('room_name')} - {e}")
        conn.commit()
    print(f"  教室迁移完成: {count} 条记录")
    return count

def migrate_scheduled_classes(engine, data):
    """迁移排课数据"""
    scheduled = data.get('music_scheduler_scheduled_classes', [])
    if not scheduled:
        print("  没有排课数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for sc in scheduled:
            try:
                conn.execute(text("""
                    INSERT INTO scheduled_classes (id, teacher_id, course_id, student_id, room_id,
                                                  class_id, teacher_name, course_code, day_of_week,
                                                  date, period, duration, start_week, end_week,
                                                  week_number, specific_dates, faculty_id, semester_label,
                                                  academic_year, semester, status, group_id, created_at)
                    VALUES (:id, :teacher_id, :course_id, :student_id, :room_id,
                           :class_id, :teacher_name, :course_code, :day_of_week,
                           :date, :period, :duration, :start_week, :end_week,
                           :week_number, :specific_dates, :faculty_id, :semester_label,
                           :academic_year, :semester, :status, :group_id, :created_at)
                    ON DUPLICATE KEY UPDATE
                        teacher_name = VALUES(teacher_name),
                        updated_at = NOW()
                """), {
                    'id': safe_value(sc.get('id'), str(uuid.uuid4())),
                    'teacher_id': sc.get('teacher_id'),
                    'course_id': sc.get('course_id'),
                    'student_id': sc.get('student_id'),
                    'room_id': sc.get('room_id'),
                    'class_id': sc.get('class_id'),
                    'teacher_name': sc.get('teacher_name'),
                    'course_code': sc.get('course_code'),
                    'day_of_week': safe_value(sc.get('day_of_week'), 1),
                    'date': sc.get('date'),
                    'period': safe_value(sc.get('period'), 1),
                    'duration': safe_value(sc.get('duration'), 1),
                    'start_week': sc.get('start_week'),
                    'end_week': sc.get('end_week'),
                    'week_number': sc.get('week_number'),
                    'specific_dates': safe_json(sc.get('specific_dates', [])),
                    'faculty_id': sc.get('faculty_id'),
                    'semester_label': sc.get('semester_label'),
                    'academic_year': sc.get('academic_year'),
                    'semester': sc.get('semester'),
                    'status': safe_value(sc.get('status'), 'scheduled'),
                    'group_id': sc.get('group_id'),
                    'created_at': safe_value(sc.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移排课失败: {sc.get('id')} - {e}")
        conn.commit()
    print(f"  排课迁移完成: {count} 条记录")
    return count

def migrate_blocked_slots(engine, data):
    """迁移禁排时段数据"""
    slots = data.get('music_scheduler_blocked_slots', [])
    if not slots:
        print("  没有禁排时段数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for slot in slots:
            try:
                conn.execute(text("""
                    INSERT INTO blocked_slots (id, academic_year, semester_label, type, class_associations,
                                              week_number, specific_week_days, day_of_week, start_period,
                                              end_period, start_date, end_date, weeks, reason, created_at)
                    VALUES (:id, :academic_year, :semester_label, :type, :class_associations,
                           :week_number, :specific_week_days, :day_of_week, :start_period,
                           :end_period, :start_date, :end_date, :weeks, :reason, :created_at)
                    ON DUPLICATE KEY UPDATE
                        reason = VALUES(reason),
                        updated_at = NOW()
                """), {
                    'id': safe_value(slot.get('id'), str(uuid.uuid4())),
                    'academic_year': slot.get('academic_year'),
                    'semester_label': slot.get('semester_label'),
                    'type': safe_value(slot.get('type'), 'specific'),
                    'class_associations': safe_json(slot.get('class_associations', [])),
                    'week_number': slot.get('week_number'),
                    'specific_week_days': safe_json(slot.get('specific_week_days', [])),
                    'day_of_week': slot.get('day_of_week'),
                    'start_period': slot.get('start_period'),
                    'end_period': slot.get('end_period'),
                    'start_date': slot.get('start_date'),
                    'end_date': slot.get('end_date'),
                    'weeks': slot.get('weeks'),
                    'reason': slot.get('reason'),
                    'created_at': safe_value(slot.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移禁排时段失败: {slot.get('id')} - {e}")
        conn.commit()
    print(f"  禁排时段迁移完成: {count} 条记录")
    return count

def migrate_semester_configs(engine, data):
    """迁移学期配置数据"""
    configs = data.get('music_scheduler_semester_week_configs', [])
    if not configs:
        print("  没有学期配置数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for cfg in configs:
            try:
                conn.execute(text("""
                    INSERT INTO semester_week_configs (id, academic_year, semester_label, start_date, total_weeks, created_at)
                    VALUES (:id, :academic_year, :semester_label, :start_date, :total_weeks, :created_at)
                    ON DUPLICATE KEY UPDATE
                        start_date = VALUES(start_date),
                        total_weeks = VALUES(total_weeks),
                        updated_at = NOW()
                """), {
                    'id': safe_value(cfg.get('id'), str(uuid.uuid4())),
                    'academic_year': cfg.get('academic_year'),
                    'semester_label': cfg.get('semester_label'),
                    'start_date': cfg.get('start_date'),
                    'total_weeks': safe_value(cfg.get('total_weeks'), 16),
                    'created_at': safe_value(cfg.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移学期配置失败: {cfg.get('semester_label')} - {e}")
        conn.commit()
    print(f"  学期配置迁移完成: {count} 条记录")
    return count

def migrate_large_class_schedules(engine, data):
    """迁移大课表数据"""
    schedules = data.get('music_scheduler_large_class_schedules', [])
    if not schedules:
        print("  没有大课表数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for schedule in schedules:
            try:
                conn.execute(text("""
                    INSERT INTO large_class_schedules (id, file_name, academic_year, semester_label, entries, imported_at)
                    VALUES (:id, :file_name, :academic_year, :semester_label, :entries, :imported_at)
                    ON DUPLICATE KEY UPDATE
                        entries = VALUES(entries)
                """), {
                    'id': safe_value(schedule.get('id'), str(uuid.uuid4())),
                    'file_name': schedule.get('file_name'),
                    'academic_year': schedule.get('academic_year'),
                    'semester_label': schedule.get('semester_label'),
                    'entries': safe_json(schedule.get('entries', [])),
                    'imported_at': safe_value(schedule.get('imported_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移大课表失败: {schedule.get('semester_label')} - {e}")
        conn.commit()
    print(f"  大课表迁移完成: {count} 条记录")
    return count

def migrate_student_teacher_assignments(engine, data):
    """迁移学生-教师分配数据"""
    assignments = data.get('music_scheduler_student_teacher_assignments', [])
    if not assignments:
        print("  没有学生-教师分配数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for assignment in assignments:
            try:
                conn.execute(text("""
                    INSERT INTO student_teacher_assignments (id, student_id, teacher_id, faculty_code,
                                                            instrument_name, assignment_type, is_active,
                                                            assignment_status, assigned_at, effective_date,
                                                            ended_at, assigned_by, created_at)
                    VALUES (:id, :student_id, :teacher_id, :faculty_code,
                           :instrument_name, :assignment_type, :is_active,
                           :assignment_status, :assigned_at, :effective_date,
                           :ended_at, :assigned_by, :created_at)
                    ON DUPLICATE KEY UPDATE
                        is_active = VALUES(is_active),
                        assignment_status = VALUES(assignment_status),
                        updated_at = NOW()
                """), {
                    'id': safe_value(assignment.get('id'), str(uuid.uuid4())),
                    'student_id': assignment.get('student_id'),
                    'teacher_id': assignment.get('teacher_id'),
                    'faculty_code': assignment.get('faculty_code'),
                    'instrument_name': assignment.get('instrument_name'),
                    'assignment_type': safe_value(assignment.get('assignment_type'), 'primary'),
                    'is_active': 1 if assignment.get('is_active', True) else 0,
                    'assignment_status': safe_value(assignment.get('assignment_status'), 'active'),
                    'assigned_at': assignment.get('assigned_at'),
                    'effective_date': assignment.get('effective_date'),
                    'ended_at': assignment.get('ended_at'),
                    'assigned_by': assignment.get('assigned_by'),
                    'created_at': safe_value(assignment.get('created_at'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移学生-教师分配失败: {assignment.get('id')} - {e}")
        conn.commit()
    print(f"  学生-教师分配迁移完成: {count} 条记录")
    return count

def migrate_operation_logs(engine, data):
    """迁移操作日志数据"""
    logs = data.get('music_scheduler_operation_logs', [])
    if not logs:
        print("  没有操作日志数据需要迁移")
        return 0
    
    count = 0
    with engine.connect() as conn:
        for log in logs:
            try:
                conn.execute(text("""
                    INSERT INTO operation_logs (id, teacher_id, teacher_name, operation, target_type,
                                               target_id, target_name, details, ip_address, user_agent, timestamp)
                    VALUES (:id, :teacher_id, :teacher_name, :operation, :target_type,
                           :target_id, :target_name, :details, :ip_address, :user_agent, :timestamp)
                """), {
                    'id': safe_value(log.get('id'), str(uuid.uuid4())),
                    'teacher_id': log.get('teacher_id'),
                    'teacher_name': log.get('teacher_name'),
                    'operation': log.get('operation'),
                    'target_type': log.get('target_type'),
                    'target_id': log.get('target_id'),
                    'target_name': log.get('target_name'),
                    'details': log.get('details'),
                    'ip_address': log.get('ip_address'),
                    'user_agent': log.get('user_agent'),
                    'timestamp': safe_value(log.get('timestamp'), datetime.now().isoformat())
                })
                count += 1
            except Exception as e:
                print(f"  [警告] 迁移操作日志失败: {log.get('id')} - {e}")
        conn.commit()
    print(f"  操作日志迁移完成: {count} 条记录")
    return count

def verify_migration(engine):
    """验证迁移结果"""
    print("\n" + "=" * 50)
    print("验证迁移结果")
    print("=" * 50)
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 'users' as table_name, COUNT(*) as count FROM users
            UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
            UNION ALL SELECT 'students', COUNT(*) FROM students
            UNION ALL SELECT 'classes', COUNT(*) FROM classes
            UNION ALL SELECT 'courses', COUNT(*) FROM courses
            UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
            UNION ALL SELECT 'scheduled_classes', COUNT(*) FROM scheduled_classes
            UNION ALL SELECT 'blocked_slots', COUNT(*) FROM blocked_slots
            UNION ALL SELECT 'semester_week_configs', COUNT(*) FROM semester_week_configs
            UNION ALL SELECT 'large_class_schedules', COUNT(*) FROM large_class_schedules
            UNION ALL SELECT 'student_teacher_assignments', COUNT(*) FROM student_teacher_assignments
            UNION ALL SELECT 'operation_logs', COUNT(*) FROM operation_logs
        """))
        
        print("\n数据统计:")
        total = 0
        for row in result:
            print(f"  {row[0]:30} {row[1]:>6} 条")
            total += row[1]
        print(f"\n  {'总计':30} {total:>6} 条")

def run_migration(json_file_path):
    """执行完整迁移"""
    print("=" * 60)
    print("MySQL 数据库迁移工具")
    print("=" * 60)
    
    # 加载数据
    print(f"\n[1/5] 加载数据文件: {json_file_path}")
    data = load_json_data(json_file_path)
    keys = [k for k in data.keys() if k.startswith('music_scheduler_')]
    print(f"  发现 {len(keys)} 个数据项")
    
    # 连接数据库
    print("\n[2/5] 连接MySQL数据库...")
    try:
        engine = get_mysql_connection()
        # 测试连接
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  数据库连接成功")
    except Exception as e:
        print(f"  数据库连接失败: {e}")
        return
    
    # 执行迁移
    print("\n[3/5] 开始迁移数据...")
    total = 0
    total += migrate_users(engine, data)
    total += migrate_teachers(engine, data)
    total += migrate_students(engine, data)
    total += migrate_classes(engine, data)
    total += migrate_courses(engine, data)
    total += migrate_rooms(engine, data)
    total += migrate_scheduled_classes(engine, data)
    total += migrate_blocked_slots(engine, data)
    total += migrate_semester_configs(engine, data)
    total += migrate_large_class_schedules(engine, data)
    total += migrate_student_teacher_assignments(engine, data)
    total += migrate_operation_logs(engine, data)
    
    # 验证
    print(f"\n[4/5] 验证迁移结果...")
    verify_migration(engine)
    
    # 完成
    print("\n[5/5] 迁移完成!")
    print("=" * 60)
    print(f"共迁移 {total} 条记录")
    print("=" * 60)

def main():
    if len(sys.argv) < 2:
        print("MySQL 数据库迁移工具")
        print("\n使用方法:")
        print("  python migrate_to_mysql.py <localStorage_export.json>")
        print("\n步骤:")
        print("  1. 在浏览器控制台执行导出脚本")
        print("  2. 保存JSON文件")
        print("  3. 运行此脚本进行迁移")
        print("\n环境变量:")
        print("  MYSQL_HOST     MySQL主机地址")
        print("  MYSQL_PORT     MySQL端口 (默认3306)")
        print("  MYSQL_USER     MySQL用户名")
        print("  MYSQL_PASSWORD MySQL密码")
        print("  MYSQL_DATABASE 数据库名")
        sys.exit(1)
    
    json_file = sys.argv[1]
    run_migration(json_file)

if __name__ == '__main__':
    main()
