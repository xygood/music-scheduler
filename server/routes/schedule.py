from flask import request, jsonify
from models.database import get_db
from models.schedule import ScheduledClass
from . import api_bp
import uuid
from datetime import datetime

@api_bp.route('/schedules', methods=['GET'])
def get_schedules():
    db = next(get_db())
    try:
        teacher_id = request.args.get('teacher_id')
        week_number = request.args.get('week_number')
        
        query = db.query(ScheduledClass)
        if teacher_id:
            query = query.filter(ScheduledClass.teacher_id == teacher_id)
        if week_number:
            query = query.filter(ScheduledClass.week_number == int(week_number))
        
        schedules = query.all()
        return jsonify([s.to_dict() for s in schedules])
    finally:
        db.close()

@api_bp.route('/schedules/<schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(ScheduledClass).filter(ScheduledClass.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        return jsonify(schedule.to_dict())
    finally:
        db.close()

@api_bp.route('/schedules', methods=['POST'])
def create_schedule():
    db = next(get_db())
    try:
        data = request.get_json()
        schedule = ScheduledClass(
            id=str(uuid.uuid4()),
            teacher_id=data.get('teacher_id'),
            course_id=data.get('course_id'),
            student_id=data.get('student_id'),
            room_id=data.get('room_id'),
            day_of_week=data.get('day_of_week'),
            date=datetime.strptime(data['date'], '%Y-%m-%d').date() if data.get('date') else None,
            period=data.get('period'),
            duration=data.get('duration', 1),
            start_week=data.get('start_week'),
            end_week=data.get('end_week'),
            week_number=data.get('week_number'),
            specific_dates=data.get('specific_dates'),
            faculty_id=data.get('faculty_id'),
            semester_label=data.get('semester_label'),
            academic_year=data.get('academic_year'),
            semester=data.get('semester'),
            status=data.get('status', 'scheduled'),
            group_id=data.get('group_id')
        )
        db.add(schedule)
        db.commit()
        return jsonify(schedule.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/schedules/<schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(ScheduledClass).filter(ScheduledClass.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(schedule, key) and key not in ['id', 'created_at']:
                if key == 'date' and value:
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(schedule, key, value)
        
        db.commit()
        return jsonify(schedule.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(ScheduledClass).filter(ScheduledClass.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        db.delete(schedule)
        db.commit()
        return jsonify({'message': 'Schedule deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/schedules/batch', methods=['POST'])
def batch_create_schedules():
    db = next(get_db())
    try:
        data = request.get_json()
        schedules_data = data.get('schedules', [])
        created = []
        
        for s_data in schedules_data:
            schedule = ScheduledClass(
                id=str(uuid.uuid4()),
                teacher_id=s_data.get('teacher_id'),
                course_id=s_data.get('course_id'),
                student_id=s_data.get('student_id'),
                room_id=s_data.get('room_id'),
                class_id=s_data.get('class_id'),
                teacher_name=s_data.get('teacher_name'),
                course_code=s_data.get('course_code'),
                day_of_week=s_data.get('day_of_week'),
                date=datetime.strptime(s_data['date'], '%Y-%m-%d').date() if s_data.get('date') else None,
                period=s_data.get('period'),
                duration=s_data.get('duration', 1),
                start_week=s_data.get('start_week'),
                end_week=s_data.get('end_week'),
                week_number=s_data.get('week_number'),
                specific_dates=s_data.get('specific_dates'),
                faculty_id=s_data.get('faculty_id'),
                semester_label=s_data.get('semester_label'),
                academic_year=s_data.get('academic_year'),
                semester=s_data.get('semester'),
                status=s_data.get('status', 'scheduled'),
                group_id=s_data.get('group_id')
            )
            db.add(schedule)
            created.append(schedule)
        
        db.commit()
        return jsonify([s.to_dict() for s in created]), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
