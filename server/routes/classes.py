from flask import request, jsonify
from models.database import get_db
from models.class_model import Class
from . import api_bp
import uuid

@api_bp.route('/classes', methods=['GET'])
def get_classes():
    db = next(get_db())
    try:
        classes = db.query(Class).all()
        return jsonify([c.to_dict() for c in classes])
    finally:
        db.close()

@api_bp.route('/classes/<class_id>', methods=['GET'])
def get_class(class_id):
    db = next(get_db())
    try:
        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        return jsonify(cls.to_dict())
    finally:
        db.close()

@api_bp.route('/classes', methods=['POST'])
def create_class():
    db = next(get_db())
    try:
        data = request.get_json()
        cls = Class(
            id=str(uuid.uuid4()),
            class_id=data.get('class_id'),
            class_name=data.get('class_name'),
            enrollment_year=data.get('enrollment_year'),
            class_number=data.get('class_number'),
            student_count=data.get('student_count', 0),
            student_type=data.get('student_type', 'general'),
            status=data.get('status', 'active')
        )
        db.add(cls)
        db.commit()
        return jsonify(cls.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/classes/<class_id>', methods=['PUT'])
def update_class(class_id):
    db = next(get_db())
    try:
        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(cls, key) and key not in ['id', 'created_at']:
                setattr(cls, key, value)
        
        db.commit()
        return jsonify(cls.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/classes/<class_id>', methods=['DELETE'])
def delete_class(class_id):
    db = next(get_db())
    try:
        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            return jsonify({'error': 'Class not found'}), 404
        
        db.delete(cls)
        db.commit()
        return jsonify({'message': 'Class deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
