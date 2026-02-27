from flask import request, jsonify
from models.database import get_db
from models.large_class_schedule import LargeClassSchedule
from . import api_bp
import uuid

@api_bp.route('/large-class-schedules', methods=['GET'])
def get_large_class_schedules():
    db = next(get_db())
    try:
        schedules = db.query(LargeClassSchedule).order_by(LargeClassSchedule.imported_at.desc()).all()
        return jsonify([s.to_dict() for s in schedules])
    finally:
        db.close()

@api_bp.route('/large-class-schedules/<schedule_id>', methods=['GET'])
def get_large_class_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(LargeClassSchedule).filter(LargeClassSchedule.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Large class schedule not found'}), 404
        return jsonify(schedule.to_dict())
    finally:
        db.close()

@api_bp.route('/large-class-schedules', methods=['POST'])
def create_large_class_schedule():
    db = next(get_db())
    try:
        data = request.get_json()
        
        existing = db.query(LargeClassSchedule).filter(
            LargeClassSchedule.semester_label == data.get('semester_label')
        ).first()
        
        if existing:
            db.delete(existing)
        
        schedule = LargeClassSchedule(
            id=str(uuid.uuid4()),
            file_name=data.get('file_name'),
            academic_year=data.get('academic_year'),
            semester_label=data.get('semester_label'),
            entries=data.get('entries', [])
        )
        db.add(schedule)
        db.commit()
        return jsonify(schedule.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/large-class-schedules/<schedule_id>', methods=['PUT'])
def update_large_class_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(LargeClassSchedule).filter(LargeClassSchedule.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Large class schedule not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(schedule, key) and key not in ['id', 'created_at']:
                setattr(schedule, key, value)
        
        db.commit()
        return jsonify(schedule.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/large-class-schedules/<schedule_id>', methods=['DELETE'])
def delete_large_class_schedule(schedule_id):
    db = next(get_db())
    try:
        schedule = db.query(LargeClassSchedule).filter(LargeClassSchedule.id == schedule_id).first()
        if not schedule:
            return jsonify({'error': 'Large class schedule not found'}), 404
        
        db.delete(schedule)
        db.commit()
        return jsonify({'message': 'Large class schedule deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/large-class-schedules/clear', methods=['POST'])
def clear_large_class_schedules():
    db = next(get_db())
    try:
        db.query(LargeClassSchedule).delete()
        db.commit()
        return jsonify({'message': 'All large class schedules cleared successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
