from flask import request, jsonify
from models.database import get_db
from models.teacher import Teacher
from models.student import Student
from models.course import Course
from models.room import Room
from models.schedule import ScheduledClass
from models.blocked_slot import BlockedSlot
from models.class_model import Class
from models.user import User
from models.student_teacher_assignment import StudentTeacherAssignment
from models.semester_week_config import SemesterWeekConfig
from . import api_bp
import uuid
from datetime import datetime
import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@api_bp.route('/sync/all', methods=['GET'])
def get_all_data():
    db = next(get_db())
    try:
        data = {
            'teachers': [t.to_dict() for t in db.query(Teacher).all()],
            'students': [s.to_dict() for s in db.query(Student).all()],
            'courses': [c.to_dict() for c in db.query(Course).all()],
            'rooms': [r.to_dict() for r in db.query(Room).all()],
            'schedules': [s.to_dict() for s in db.query(ScheduledClass).all()],
            'blocked_slots': [b.to_dict() for b in db.query(BlockedSlot).all()],
            'classes': [c.to_dict() for c in db.query(Class).all()],
            'users': [u.to_dict() for u in db.query(User).all()],
            'assignments': [a.to_dict() for a in db.query(StudentTeacherAssignment).all()],
            'semester_configs': [c.to_dict() for c in db.query(SemesterWeekConfig).all()]
        }
        return jsonify(data)
    finally:
        db.close()

@api_bp.route('/sync/import', methods=['POST'])
def import_data():
    db = next(get_db())
    try:
        data = request.get_json()
        results = {}
        
        if 'teachers' in data:
            for t in data['teachers']:
                teacher = Teacher(
                    id=t.get('id', str(uuid.uuid4())),
                    teacher_id=t.get('teacher_id'),
                    name=t.get('name'),
                    full_name=t.get('full_name'),
                    email=t.get('email'),
                    phone=t.get('phone'),
                    department=t.get('department'),
                    faculty_id=t.get('faculty_id'),
                    faculty_code=t.get('faculty_code'),
                    faculty_name=t.get('faculty_name'),
                    position=t.get('position'),
                    status=t.get('status', 'active'),
                    primary_instrument=t.get('primary_instrument'),
                    can_teach_instruments=t.get('can_teach_instruments') or t.get('can_teach_courses', []),
                    max_students_per_class=t.get('max_students_per_class', 5),
                    fixed_room_id=t.get('fixed_room_id'),
                    fixed_rooms=t.get('fixed_rooms', []),
                    qualifications=t.get('qualifications', []),
                    remarks=t.get('remarks')
                )
                db.merge(teacher)
                
                # 同步创建用户记录（用于登录）
                if t.get('teacher_id'):
                    existing_user = db.query(User).filter(User.teacher_id == t.get('teacher_id')).first()
                    if not existing_user:
                        user = User(
                            id=str(uuid.uuid4()),
                            teacher_id=t.get('teacher_id'),
                            email=t.get('email'),
                            password=hash_password(t.get('teacher_id')),  # 默认密码为工号
                            full_name=t.get('full_name') or t.get('name'),
                            department=t.get('department'),
                            faculty_id=t.get('faculty_id'),
                            faculty_code=t.get('faculty_code'),
                            is_admin=False
                        )
                        db.add(user)
            results['teachers'] = len(data['teachers'])
        
        if 'students' in data:
            for s in data['students']:
                student = Student(
                    id=s.get('id', str(uuid.uuid4())),
                    student_id=str(s.get('student_id', '')),
                    name=s.get('name'),
                    teacher_id=s.get('teacher_id'),
                    major_class=s.get('major_class') or s.get('class_name', ''),
                    grade=s.get('grade'),
                    student_type=s.get('student_type', 'general'),
                    primary_instrument=s.get('primary_instrument'),
                    secondary_instruments=s.get('secondary_instruments', []),
                    faculty_code=s.get('faculty_code'),
                    enrollment_year=s.get('enrollment_year'),
                    current_grade=s.get('current_grade'),
                    student_status=s.get('student_status', 'active'),
                    status=s.get('status', 'active'),
                    remarks=s.get('remarks'),
                    assigned_teachers=s.get('assigned_teachers') or (
                        {'primary_teacher_id': s.get('assigned_teacher_id'), 'primary_teacher_name': s.get('assigned_teacher_name')}
                        if s.get('assigned_teacher_id') else None
                    ),
                    secondary1_teacher_id=s.get('secondary1_teacher_id'),
                    secondary1_teacher_name=s.get('secondary1_teacher_name'),
                    secondary2_teacher_id=s.get('secondary2_teacher_id'),
                    secondary2_teacher_name=s.get('secondary2_teacher_name'),
                    secondary3_teacher_id=s.get('secondary3_teacher_id'),
                    secondary3_teacher_name=s.get('secondary3_teacher_name'),
                    secondary_instrument1=s.get('secondary_instrument1'),
                    secondary_instrument2=s.get('secondary_instrument2'),
                    secondary_instrument3=s.get('secondary_instrument3'),
                    notes=s.get('notes')
                )
                db.merge(student)
            results['students'] = len(data['students'])
        
        if 'courses' in data:
            for c in data['courses']:
                course = Course(
                    id=c.get('id', str(uuid.uuid4())),
                    course_id=str(c.get('course_id', '')) if c.get('course_id') else None,
                    course_name=c.get('course_name'),
                    course_type=c.get('course_type'),
                    faculty_id=c.get('faculty_id'),
                    teacher_id=c.get('teacher_id'),
                    teacher_name=c.get('teacher_name'),
                    student_id=c.get('student_id'),
                    student_name=c.get('student_name'),
                    major_class=c.get('major_class'),
                    academic_year=c.get('academic_year'),
                    semester=c.get('semester'),
                    semester_label=c.get('semester_label'),
                    course_category=c.get('course_category', 'general'),
                    primary_instrument=c.get('primary_instrument'),
                    secondary_instrument=c.get('secondary_instrument'),
                    duration=c.get('duration', 30),
                    week_frequency=c.get('week_frequency', 1),
                    credit=c.get('credit') or c.get('credit_hours', 1),
                    required_hours=c.get('required_hours') or c.get('total_hours', 16),
                    group_size=c.get('group_size', 1),
                    student_count=c.get('student_count', 1),
                    teaching_type=c.get('teaching_type') or c.get('class_type')
                )
                db.merge(course)
            results['courses'] = len(data['courses'])
        
        if 'rooms' in data:
            for r in data['rooms']:
                room = Room(
                    id=r.get('id', str(uuid.uuid4())),
                    teacher_id=r.get('teacher_id'),
                    room_name=r.get('room_name'),
                    room_type=r.get('room_type', '琴房'),
                    faculty_code=r.get('faculty_code'),
                    capacity=r.get('capacity', 1),
                    location=r.get('location'),
                    equipment=r.get('equipment', []),
                    status=r.get('status', '空闲')
                )
                db.merge(room)
            results['rooms'] = len(data['rooms'])
        
        if 'schedules' in data:
            for s in data['schedules']:
                schedule = ScheduledClass(
                    id=s.get('id', str(uuid.uuid4())),
                    teacher_id=s.get('teacher_id'),
                    course_id=s.get('course_id'),
                    student_id=s.get('student_id'),
                    room_id=s.get('room_id'),
                    day_of_week=s.get('day_of_week'),
                    period=s.get('period'),
                    duration=s.get('duration', 1),
                    start_week=s.get('start_week'),
                    end_week=s.get('end_week'),
                    week_number=s.get('week_number'),
                    specific_dates=s.get('specific_dates'),
                    faculty_id=s.get('faculty_id'),
                    semester_label=s.get('semester_label'),
                    academic_year=s.get('academic_year'),
                    semester=s.get('semester'),
                    status=s.get('status', 'scheduled'),
                    group_id=s.get('group_id'),
                    class_id=s.get('class_id'),
                    teacher_name=s.get('teacher_name'),
                    course_code=s.get('course_code')
                )
                db.merge(schedule)
            results['schedules'] = len(data['schedules'])
        
        # 导入专业大课排课数据
        if 'major_class_scheduled_classes' in data:
            for s in data['major_class_scheduled_classes']:
                schedule = ScheduledClass(
                    id=s.get('id', str(uuid.uuid4())),
                    teacher_id=s.get('teacher_id'),
                    course_id=s.get('course_id'),
                    student_id=s.get('student_id'),
                    room_id=s.get('room_id'),
                    day_of_week=s.get('day_of_week'),
                    period=s.get('period'),
                    duration=s.get('duration', 1),
                    start_week=s.get('start_week'),
                    end_week=s.get('end_week'),
                    week_number=s.get('week_number'),
                    specific_dates=s.get('specific_dates'),
                    faculty_id=s.get('faculty_id'),
                    semester_label=s.get('semester_label'),
                    academic_year=s.get('academic_year'),
                    semester=s.get('semester'),
                    status=s.get('status', 'scheduled'),
                    group_id=s.get('group_id'),
                    class_id=s.get('class_id'),
                    teacher_name=s.get('teacher_name'),
                    course_code=s.get('course_code')
                )
                db.merge(schedule)
            results['major_class_scheduled_classes'] = len(data['major_class_scheduled_classes'])
        
        # 导入小组课排课数据
        if 'group_class_scheduled_classes' in data:
            for s in data['group_class_scheduled_classes']:
                schedule = ScheduledClass(
                    id=s.get('id', str(uuid.uuid4())),
                    teacher_id=s.get('teacher_id'),
                    course_id=s.get('course_id'),
                    student_id=s.get('student_id'),
                    room_id=s.get('room_id'),
                    day_of_week=s.get('day_of_week'),
                    period=s.get('period'),
                    duration=s.get('duration', 1),
                    start_week=s.get('start_week'),
                    end_week=s.get('end_week'),
                    week_number=s.get('week_number'),
                    specific_dates=s.get('specific_dates'),
                    faculty_id=s.get('faculty_id'),
                    semester_label=s.get('semester_label'),
                    academic_year=s.get('academic_year'),
                    semester=s.get('semester'),
                    status=s.get('status', 'scheduled'),
                    group_id=s.get('group_id'),
                    class_id=s.get('class_id'),
                    teacher_name=s.get('teacher_name'),
                    course_code=s.get('course_code')
                )
                db.merge(schedule)
            results['group_class_scheduled_classes'] = len(data['group_class_scheduled_classes'])
        
        if 'blocked_slots' in data:
            for b in data['blocked_slots']:
                slot = BlockedSlot(
                    id=b.get('id', str(uuid.uuid4())),
                    academic_year=b.get('academic_year'),
                    semester_label=b.get('semester_label'),
                    type=b.get('type'),
                    class_associations=b.get('class_associations', []),
                    week_number=b.get('week_number'),
                    specific_week_days=b.get('specific_week_days', []),
                    day_of_week=b.get('day_of_week'),
                    start_period=b.get('start_period'),
                    end_period=b.get('end_period'),
                    start_date=datetime.strptime(b['start_date'], '%Y-%m-%d').date() if b.get('start_date') else None,
                    end_date=datetime.strptime(b['end_date'], '%Y-%m-%d').date() if b.get('end_date') else None,
                    weeks=b.get('weeks'),
                    reason=b.get('reason')
                )
                db.merge(slot)
            results['blocked_slots'] = len(data['blocked_slots'])
        
        if 'classes' in data:
            for c in data['classes']:
                cls = Class(
                    id=c.get('id', str(uuid.uuid4())),
                    class_id=c.get('class_id'),
                    class_name=c.get('class_name'),
                    enrollment_year=c.get('enrollment_year'),
                    class_number=c.get('class_number'),
                    student_count=c.get('student_count', 0),
                    student_type=c.get('student_type', 'general'),
                    status=c.get('status', 'active')
                )
                db.merge(cls)
            results['classes'] = len(data['classes'])
        
        if 'semester_week_configs' in data:
            for c in data['semester_week_configs']:
                config = SemesterWeekConfig(
                    id=c.get('id', str(uuid.uuid4())),
                    academic_year=c.get('academic_year'),
                    semester_label=c.get('semester_label'),
                    start_date=datetime.strptime(c['start_date'], '%Y-%m-%d').date() if c.get('start_date') else None,
                    total_weeks=c.get('total_weeks', 16)
                )
                db.merge(config)
            results['semester_week_configs'] = len(data['semester_week_configs'])
        
        db.commit()
        return jsonify({'message': 'Data imported successfully', 'results': results})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/sync/clear', methods=['POST'])
def clear_all_data():
    db = next(get_db())
    try:
        db.query(ScheduledClass).delete()
        db.query(BlockedSlot).delete()
        db.query(Course).delete()
        db.query(Student).delete()
        db.query(Teacher).delete()
        db.query(Room).delete()
        db.query(Class).delete()
        db.query(StudentTeacherAssignment).delete()
        db.query(SemesterWeekConfig).delete()
        db.commit()
        return jsonify({'message': 'All data cleared successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
