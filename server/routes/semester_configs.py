from flask import request, jsonify
from models.database import get_db
from models.semester_week_config import SemesterWeekConfig
from . import api_bp
import uuid
from datetime import datetime

@api_bp.route('/semester-configs', methods=['GET'])
def get_semester_configs():
    db = next(get_db())
    try:
        configs = db.query(SemesterWeekConfig).all()
        return jsonify([c.to_dict() for c in configs])
    finally:
        db.close()

@api_bp.route('/semester-configs/<config_id>', methods=['GET'])
def get_semester_config(config_id):
    db = next(get_db())
    try:
        config = db.query(SemesterWeekConfig).filter(SemesterWeekConfig.id == config_id).first()
        if not config:
            return jsonify({'error': 'Semester config not found'}), 404
        return jsonify(config.to_dict())
    finally:
        db.close()

@api_bp.route('/semester-configs/semester/<semester_label>', methods=['GET'])
def get_semester_config_by_label(semester_label):
    db = next(get_db())
    try:
        config = db.query(SemesterWeekConfig).filter(SemesterWeekConfig.semester_label == semester_label).first()
        if not config:
            return jsonify(None)
        return jsonify(config.to_dict())
    finally:
        db.close()

@api_bp.route('/semester-configs', methods=['POST'])
def create_semester_config():
    db = next(get_db())
    try:
        data = request.get_json()
        config = SemesterWeekConfig(
            id=data.get('id', str(uuid.uuid4())),
            academic_year=data.get('academic_year'),
            semester_label=data.get('semester_label'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            total_weeks=data.get('total_weeks', 16)
        )
        db.add(config)
        db.commit()
        return jsonify(config.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/semester-configs/<config_id>', methods=['PUT'])
def update_semester_config(config_id):
    db = next(get_db())
    try:
        config = db.query(SemesterWeekConfig).filter(SemesterWeekConfig.id == config_id).first()
        if not config:
            return jsonify({'error': 'Semester config not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(config, key) and key not in ['id', 'created_at']:
                if key == 'start_date' and value:
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(config, key, value)
        
        db.commit()
        return jsonify(config.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/semester-configs/upsert', methods=['POST'])
def upsert_semester_config():
    db = next(get_db())
    try:
        data = request.get_json()
        semester_label = data.get('semester_label')
        
        config = db.query(SemesterWeekConfig).filter(SemesterWeekConfig.semester_label == semester_label).first()
        
        if config:
            for key, value in data.items():
                if hasattr(config, key) and key not in ['id', 'created_at']:
                    if key == 'start_date' and value:
                        value = datetime.strptime(value, '%Y-%m-%d').date()
                    setattr(config, key, value)
        else:
            config = SemesterWeekConfig(
                id=data.get('id', str(uuid.uuid4())),
                academic_year=data.get('academic_year'),
                semester_label=semester_label,
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
                total_weeks=data.get('total_weeks', 16)
            )
            db.add(config)
        
        db.commit()
        return jsonify(config.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
