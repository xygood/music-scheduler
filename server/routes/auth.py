from flask import request, jsonify
from models.database import get_db
from models.user import User
from . import api_bp
import uuid
import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@api_bp.route('/auth/login', methods=['POST'])
def login():
    db = next(get_db())
    try:
        data = request.get_json()
        teacher_id = data.get('teacher_id')
        password = data.get('password')
        
        if not teacher_id or not password:
            return jsonify({'error': 'Missing teacher_id or password'}), 400
        
        user = db.query(User).filter(User.teacher_id == teacher_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.password != hash_password(password):
            return jsonify({'error': 'Invalid password'}), 401
        
        return jsonify({
            'user': user.to_dict(),
            'message': 'Login successful'
        })
    finally:
        db.close()

@api_bp.route('/auth/register', methods=['POST'])
def register():
    db = next(get_db())
    try:
        data = request.get_json()
        teacher_id = data.get('teacher_id')
        password = data.get('password')
        full_name = data.get('full_name')
        
        if not teacher_id or not password or not full_name:
            return jsonify({'error': 'Missing required fields'}), 400
        
        existing_user = db.query(User).filter(User.teacher_id == teacher_id).first()
        if existing_user:
            return jsonify({'error': 'User already exists'}), 400
        
        user = User(
            id=str(uuid.uuid4()),
            teacher_id=teacher_id,
            email=data.get('email'),
            password=hash_password(password),
            full_name=full_name,
            department=data.get('department'),
            faculty_id=data.get('faculty_id'),
            faculty_code=data.get('faculty_code'),
            specialty=data.get('specialty', []),
            is_admin=data.get('is_admin', False)
        )
        db.add(user)
        db.commit()
        
        return jsonify({
            'user': user.to_dict(),
            'message': 'Registration successful'
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/auth/change-password', methods=['POST'])
def change_password():
    db = next(get_db())
    try:
        data = request.get_json()
        teacher_id = data.get('teacher_id')
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        user = db.query(User).filter(User.teacher_id == teacher_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.password != hash_password(old_password):
            return jsonify({'error': 'Invalid old password'}), 401
        
        user.password = hash_password(new_password)
        db.commit()
        
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
