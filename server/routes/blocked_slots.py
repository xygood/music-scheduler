from flask import request, jsonify
from models.database import get_db
from models.blocked_slot import BlockedSlot
from . import api_bp
import uuid
from datetime import datetime

@api_bp.route('/blocked-slots', methods=['GET'])
def get_blocked_slots():
    db = next(get_db())
    try:
        slots = db.query(BlockedSlot).all()
        return jsonify([s.to_dict() for s in slots])
    finally:
        db.close()

@api_bp.route('/blocked-slots/<slot_id>', methods=['GET'])
def get_blocked_slot(slot_id):
    db = next(get_db())
    try:
        slot = db.query(BlockedSlot).filter(BlockedSlot.id == slot_id).first()
        if not slot:
            return jsonify({'error': 'Blocked slot not found'}), 404
        return jsonify(slot.to_dict())
    finally:
        db.close()

@api_bp.route('/blocked-slots', methods=['POST'])
def create_blocked_slot():
    db = next(get_db())
    try:
        data = request.get_json()
        slot = BlockedSlot(
            id=str(uuid.uuid4()),
            academic_year=data.get('academic_year'),
            semester_label=data.get('semester_label'),
            type=data.get('type'),
            class_associations=data.get('class_associations', []),
            week_number=data.get('week_number'),
            specific_week_days=data.get('specific_week_days', []),
            day_of_week=data.get('day_of_week'),
            start_period=data.get('start_period'),
            end_period=data.get('end_period'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            weeks=data.get('weeks'),
            reason=data.get('reason')
        )
        db.add(slot)
        db.commit()
        return jsonify(slot.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/blocked-slots/<slot_id>', methods=['PUT'])
def update_blocked_slot(slot_id):
    db = next(get_db())
    try:
        slot = db.query(BlockedSlot).filter(BlockedSlot.id == slot_id).first()
        if not slot:
            return jsonify({'error': 'Blocked slot not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(slot, key) and key not in ['id', 'created_at']:
                if key in ['start_date', 'end_date'] and value:
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(slot, key, value)
        
        db.commit()
        return jsonify(slot.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/blocked-slots/<slot_id>', methods=['DELETE'])
def delete_blocked_slot(slot_id):
    db = next(get_db())
    try:
        slot = db.query(BlockedSlot).filter(BlockedSlot.id == slot_id).first()
        if not slot:
            return jsonify({'error': 'Blocked slot not found'}), 404
        
        db.delete(slot)
        db.commit()
        return jsonify({'message': 'Blocked slot deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/blocked-slots/batch', methods=['POST'])
def batch_create_blocked_slots():
    db = next(get_db())
    try:
        data = request.get_json()
        slots_data = data.get('blocked_slots', [])
        created = []
        
        for s_data in slots_data:
            slot = BlockedSlot(
                id=str(uuid.uuid4()),
                academic_year=s_data.get('academic_year'),
                semester_label=s_data.get('semester_label'),
                type=s_data.get('type'),
                class_associations=s_data.get('class_associations', []),
                week_number=s_data.get('week_number'),
                specific_week_days=s_data.get('specific_week_days', []),
                day_of_week=s_data.get('day_of_week'),
                start_period=s_data.get('start_period'),
                end_period=s_data.get('end_period'),
                start_date=datetime.strptime(s_data['start_date'], '%Y-%m-%d').date() if s_data.get('start_date') else None,
                end_date=datetime.strptime(s_data['end_date'], '%Y-%m-%d').date() if s_data.get('end_date') else None,
                weeks=s_data.get('weeks'),
                reason=s_data.get('reason')
            )
            db.add(slot)
            created.append(slot)
        
        db.commit()
        return jsonify([s.to_dict() for s in created]), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
