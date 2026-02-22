from flask import request, jsonify
from models.database import get_db
from models.room import Room
from . import api_bp
import uuid

@api_bp.route('/rooms', methods=['GET'])
def get_rooms():
    db = next(get_db())
    try:
        rooms = db.query(Room).all()
        return jsonify([r.to_dict() for r in rooms])
    finally:
        db.close()

@api_bp.route('/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    db = next(get_db())
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        return jsonify(room.to_dict())
    finally:
        db.close()

@api_bp.route('/rooms', methods=['POST'])
def create_room():
    db = next(get_db())
    try:
        data = request.get_json()
        room = Room(
            id=str(uuid.uuid4()),
            teacher_id=data.get('teacher_id'),
            room_name=data.get('room_name'),
            room_type=data.get('room_type', '琴房'),
            faculty_code=data.get('faculty_code'),
            capacity=data.get('capacity', 1),
            location=data.get('location'),
            equipment=data.get('equipment', []),
            status=data.get('status', '空闲')
        )
        db.add(room)
        db.commit()
        return jsonify(room.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/rooms/<room_id>', methods=['PUT'])
def update_room(room_id):
    db = next(get_db())
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(room, key) and key not in ['id', 'created_at']:
                setattr(room, key, value)
        
        db.commit()
        return jsonify(room.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/rooms/<room_id>', methods=['DELETE'])
def delete_room(room_id):
    db = next(get_db())
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        db.delete(room)
        db.commit()
        return jsonify({'message': 'Room deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
