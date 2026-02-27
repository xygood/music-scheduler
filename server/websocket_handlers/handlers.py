from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from models.database import get_db
from models.schedule import ScheduledClass
from models.blocked_slot import BlockedSlot
import json

socketio = None
connected_users = {}
online_teachers = {}

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
                if user_id in online_teachers:
                    del online_teachers[user_id]
                break
        broadcast_online_teachers()
    
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
    
    @socketio.on('teacher_online')
    def handle_teacher_online(data):
        teacher_id = data.get('teacher_id')
        teacher_name = data.get('teacher_name')
        if teacher_id:
            online_teachers[teacher_id] = {
                'teacher_id': teacher_id,
                'teacher_name': teacher_name,
                'login_time': data.get('login_time'),
                'last_activity': data.get('login_time')
            }
            connected_users[teacher_id] = request.sid
            broadcast_online_teachers()
    
    @socketio.on('teacher_offline')
    def handle_teacher_offline(data):
        teacher_id = data.get('teacher_id')
        if teacher_id and teacher_id in online_teachers:
            del online_teachers[teacher_id]
        broadcast_online_teachers()
    
    @socketio.on('get_online_teachers')
    def handle_get_online_teachers():
        emit('online_teachers_update', list(online_teachers.values()))
    
    return socketio

def broadcast_online_teachers():
    if socketio:
        socketio.emit('online_teachers_update', list(online_teachers.values()))

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
