from flask_socketio import SocketIO, emit, join_room, leave_room
from models.database import get_db
from models.schedule import ScheduledClass
from models.blocked_slot import BlockedSlot
import json

socketio = None
connected_users = {}

def init_socketio(app):
    global socketio
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    
    @socketio.on('connect')
    def handle_connect():
        print(f'Client connected')
        emit('connection_established', {'message': 'Connected to server'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'Client disconnected')
        for user_id, sid in list(connected_users.items()):
            if sid == request.sid:
                del connected_users[user_id]
                break
    
    @socketio.on('join_room')
    def handle_join_room(data):
        room = data.get('room', 'general')
        join_room(room)
        user_id = data.get('user_id')
        if user_id:
            connected_users[user_id] = request.sid
        emit('joined_room', {'room': room}, room=request.sid)
    
    @socketio.on('leave_room')
    def handle_leave_room(data):
        room = data.get('room', 'general')
        leave_room(room)
    
    @socketio.on('request_sync')
    def handle_request_sync(data):
        db = next(get_db())
        try:
            schedules = db.query(ScheduledClass).all()
            blocked_slots = db.query(BlockedSlot).all()
            emit('sync_data', {
                'schedules': [s.to_dict() for s in schedules],
                'blocked_slots': [b.to_dict() for b in blocked_slots]
            })
        finally:
            db.close()
    
    return socketio

def broadcast_schedule_created(schedule_data):
    if socketio:
        socketio.emit('schedule_created', schedule_data)

def broadcast_schedule_updated(schedule_data):
    if socketio:
        socketio.emit('schedule_updated', schedule_data)

def broadcast_schedule_deleted(schedule_id):
    if socketio:
        socketio.emit('schedule_deleted', {'id': schedule_id})

def broadcast_blocked_slot_created(slot_data):
    if socketio:
        socketio.emit('blocked_slot_created', slot_data)

def broadcast_blocked_slot_updated(slot_data):
    if socketio:
        socketio.emit('blocked_slot_updated', slot_data)

def broadcast_blocked_slot_deleted(slot_id):
    if socketio:
        socketio.emit('blocked_slot_deleted', {'id': slot_id})

def broadcast_to_room(room, event, data):
    if socketio:
        socketio.emit(event, data, room=room)
