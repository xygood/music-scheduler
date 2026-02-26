from flask import request, jsonify
from models.database import get_db
from models.teacher import Teacher
from models.room import Room
from . import api_bp
import uuid
from datetime import datetime

@api_bp.route('/teachers', methods=['GET'])
def get_teachers():
    db = next(get_db())
    try:
        teachers = db.query(Teacher).all()
        return jsonify([t.to_dict() for t in teachers])
    finally:
        db.close()

@api_bp.route('/teachers/<teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    db = next(get_db())
    try:
        teacher = db.query(Teacher).filter(
            (Teacher.teacher_id == teacher_id) | (Teacher.id == teacher_id)
        ).first()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        return jsonify(teacher.to_dict())
    finally:
        db.close()

@api_bp.route('/teachers', methods=['POST'])
def create_teacher():
    db = next(get_db())
    try:
        data = request.get_json()
        teacher_id = data.get('teacher_id')
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        teacher = Teacher(
            id=teacher_id,  # 使用工号作为ID
            teacher_id=teacher_id,
            name=data.get('name'),
            full_name=data.get('full_name', data.get('name')),
            email=data.get('email'),
            phone=data.get('phone'),
            department=data.get('department'),
            faculty_id=data.get('faculty_id'),
            faculty_code=data.get('faculty_code'),
            faculty_name=data.get('faculty_name'),
            position=data.get('position'),
            status=data.get('status', 'active'),
            primary_instrument=data.get('primary_instrument'),
            can_teach_instruments=data.get('can_teach_instruments', []),
            max_students_per_class=data.get('max_students_per_class', 5),
            fixed_room_id=data.get('fixed_room_id'),
            fixed_rooms=data.get('fixed_rooms', []),
            qualifications=data.get('qualifications', []),
            remarks=data.get('remarks')
        )
        db.add(teacher)
        db.commit()
        return jsonify(teacher.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/<teacher_id>', methods=['PUT'])
def update_teacher(teacher_id):
    db = next(get_db())
    try:
        teacher = db.query(Teacher).filter(Teacher.teacher_id == teacher_id).first()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        data = request.get_json()
        
        # 允许的字段白名单
        ALLOWED_FIELDS = [
            'name', 'full_name', 'email', 'phone', 'department',
            'faculty_id', 'faculty_code', 'faculty_name', 'position',
            'status', 'primary_instrument', 'can_teach_instruments',
            'max_students_per_class', 'fixed_room_id', 'fixed_rooms',
            'qualifications', 'remarks'
        ]
        
        for key, value in data.items():
            if key in ALLOWED_FIELDS and hasattr(teacher, key):
                setattr(teacher, key, value)
        db.commit()
        return jsonify(teacher.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/<teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    db = next(get_db())
    try:
        teacher = db.query(Teacher).filter(Teacher.teacher_id == teacher_id).first()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        db.delete(teacher)
        db.commit()
        return jsonify({'message': 'Teacher deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/batch', methods=['POST'])
def batch_create_teachers():
    db = next(get_db())
    try:
        data = request.get_json()
        teachers_data = data.get('teachers', [])
        created = []
        for t_data in teachers_data:
            teacher_id = t_data.get('teacher_id')
            if not teacher_id:
                continue  # 跳过没有工号的教师数据
            teacher = Teacher(
                id=teacher_id,  # 使用工号作为ID
                teacher_id=teacher_id,
                name=t_data.get('name'),
                full_name=t_data.get('full_name', t_data.get('name')),
                email=t_data.get('email'),
                phone=t_data.get('phone'),
                department=t_data.get('department'),
                faculty_id=t_data.get('faculty_id'),
                faculty_code=t_data.get('faculty_code'),
                faculty_name=t_data.get('faculty_name'),
                position=t_data.get('position'),
                status=t_data.get('status', 'active'),
                primary_instrument=t_data.get('primary_instrument'),
                can_teach_instruments=t_data.get('can_teach_instruments', []),
                max_students_per_class=t_data.get('max_students_per_class', 5),
                fixed_room_id=t_data.get('fixed_room_id'),
                fixed_rooms=t_data.get('fixed_rooms', []),
                qualifications=t_data.get('qualifications', []),
                remarks=t_data.get('remarks')
            )
            db.add(teacher)
            created.append(teacher)
        db.commit()
        return jsonify([t.to_dict() for t in created]), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/room-mappings', methods=['GET'])
def get_teacher_room_mappings():
    db = next(get_db())
    try:
        from models.room import Room
        teachers = db.query(Teacher).all()
        rooms = db.query(Room).all()
        room_map = {r.id: r for r in rooms}
        
        teacher_mappings = {}
        for t in teachers:
            if t.fixed_rooms:
                rooms_list = []
                for room in t.fixed_rooms:
                    room_id = room.get('room_id')
                    faculty_code = room.get('faculty_code')
                    room_obj = room_map.get(room_id)
                    rooms_list.append({
                        'room_id': room_id,
                        'faculty_code': faculty_code,
                        'room': room_obj.to_dict() if room_obj else None
                    })
                
                teacher_key = t.id or t.teacher_id
                teacher_mappings[teacher_key] = {
                    'teacher': {
                        'id': t.id,
                        'teacher_id': t.teacher_id,
                        'name': t.name,
                        'full_name': t.full_name,
                        'faculty_name': t.faculty_name
                    },
                    'rooms': rooms_list
                }
        
        return jsonify(list(teacher_mappings.values()))
    finally:
        db.close()

@api_bp.route('/teachers/<teacher_id>/rooms', methods=['POST'])
def assign_room_to_teacher(teacher_id):
    db = next(get_db())
    try:
        teacher = db.query(Teacher).filter(Teacher.teacher_id == teacher_id).first()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        data = request.get_json()
        room_id = data.get('room_id')
        faculty_code = data.get('faculty_code')
        
        fixed_rooms = teacher.fixed_rooms or []
        if not any(r.get('room_id') == room_id for r in fixed_rooms):
            fixed_rooms.append({'room_id': room_id, 'faculty_code': faculty_code})
            teacher.fixed_rooms = fixed_rooms
            db.commit()
        return jsonify(teacher.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/<teacher_id>/rooms/<room_id>', methods=['DELETE'])
def remove_room_from_teacher(teacher_id, room_id):
    db = next(get_db())
    try:
        teacher = db.query(Teacher).filter(Teacher.teacher_id == teacher_id).first()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        fixed_rooms = teacher.fixed_rooms or []
        teacher.fixed_rooms = [r for r in fixed_rooms if r.get('room_id') != room_id]
        db.commit()
        return jsonify(teacher.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/teachers/import-rooms', methods=['POST'])
def import_teacher_rooms():
    """批量导入教师琴房关联"""
    db = next(get_db())
    try:
        entries = request.get_json()
        success = 0
        failed = 0
        errors = []
        
        for entry in entries:
            teacher_identifier = entry.get('teacherIdentifier')
            if not teacher_identifier:
                continue
            
            # 查找教师（通过工号或姓名）
            teacher = db.query(Teacher).filter(
                (Teacher.teacher_id == teacher_identifier) | (Teacher.name == teacher_identifier)
            ).first()
            
            if not teacher:
                failed += 1
                errors.append(f'教师不存在: {teacher_identifier}')
                continue
            
            fixed_rooms = teacher.fixed_rooms or []
            
            # 处理各类琴房
            room_types = [
                ('pianoRoom', 'PIANO', '钢琴琴房'),
                ('vocalRoom', 'VOCAL', '声乐琴房'),
                ('instrumentRoom', 'INSTRUMENT', '器乐琴房'),
            ]
            
            for room_key, faculty_code, room_type_name in room_types:
                room_name = entry.get(room_key)
                if room_name and room_name.strip():
                    # 检查是否已存在该琴房
                    room = db.query(Room).filter(Room.room_name == room_name.strip()).first()
                    if not room:
                        # 创建新琴房
                        room = Room(
                            id=str(uuid.uuid4()),
                            room_name=room_name.strip(),
                            room_type=room_type_name,
                            faculty_code=faculty_code,
                            status='空闲'
                        )
                        db.add(room)
                        db.flush()
                    
                    # 检查教师是否已关联该琴房
                    if not any(r.get('room_id') == room.id for r in fixed_rooms):
                        fixed_rooms.append({
                            'room_id': room.id,
                            'room_name': room.room_name,
                            'faculty_code': faculty_code
                        })
            
            # 处理大教室
            large_classroom = entry.get('largeClassroom')
            if large_classroom and large_classroom.strip():
                capacity = int(entry.get('largeClassroomCapacity', 100) or 100)
                room = db.query(Room).filter(Room.room_name == large_classroom.strip()).first()
                if not room:
                    room = Room(
                        id=str(uuid.uuid4()),
                        room_name=large_classroom.strip(),
                        room_type='大教室',
                        capacity=capacity,
                        status='空闲'
                    )
                    db.add(room)
                    db.flush()
                
                if not any(r.get('room_id') == room.id for r in fixed_rooms):
                    fixed_rooms.append({
                        'room_id': room.id,
                        'room_name': room.room_name,
                        'room_type': '大教室'
                    })
            
            teacher.fixed_rooms = fixed_rooms
            success += 1
        
        db.commit()
        return jsonify({
            'success': success,
            'failed': failed,
            'errors': errors
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
