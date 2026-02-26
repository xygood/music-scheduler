#!/usr/bin/env python3
"""
教师ID迁移脚本
将现有教师的ID从UUID格式更新为工号格式
"""

import json
import os

# 本地存储文件路径
LOCAL_STORAGE_PATH = os.path.expanduser('~/Desktop/music/music-scheduler-master/src/services/localStorage.ts')
LOCAL_STORAGE_JSON_PATH = os.path.expanduser('~/Desktop/music/music-scheduler-master/backups/src_20260222/data/localStorage.json')

# 存储键
STORAGE_KEYS = {
    'TEACHERS': 'music_scheduler_teachers',
    'STUDENTS': 'music_scheduler_students',
    'COURSES': 'music_scheduler_courses',
    'ROOMS': 'music_scheduler_rooms',
    'SCHEDULED_CLASSES': 'music_scheduler_scheduled_classes'
}

def get_local_storage_data():
    """从localStorage获取数据"""
    data = {}
    for key in STORAGE_KEYS.values():
        value = os.environ.get(key)
        if value:
            try:
                data[key] = json.loads(value)
            except json.JSONDecodeError:
                data[key] = []
        else:
            data[key] = []
    return data

def get_local_storage_from_json():
    """从备份JSON文件获取localStorage数据"""
    if os.path.exists(LOCAL_STORAGE_JSON_PATH):
        with open(LOCAL_STORAGE_JSON_PATH, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}

def migrate_teacher_ids():
    """迁移教师ID"""
    print("开始迁移教师ID...")
    
    # 获取数据
    data = get_local_storage_from_json()
    
    # 迁移教师数据
    teachers = data.get(STORAGE_KEYS['TEACHERS'], [])
    migrated_teachers = []
    teacher_id_map = {}
    
    print(f"找到 {len(teachers)} 位教师")
    
    for teacher in teachers:
        if 'teacher_id' in teacher and teacher['teacher_id']:
            old_id = teacher.get('id', '')
            new_id = teacher['teacher_id']
            
            if old_id != new_id:
                teacher_id_map[old_id] = new_id
                teacher['id'] = new_id
                print(f"迁移教师: {teacher.get('name', '未知')} - {old_id} → {new_id}")
            
            migrated_teachers.append(teacher)
    
    # 更新关联数据
    print(f"需要更新 {len(teacher_id_map)} 个教师ID的关联数据")
    
    # 更新学生数据
    students = data.get(STORAGE_KEYS['STUDENTS'], [])
    for student in students:
        if 'teacher_id' in student and student['teacher_id'] in teacher_id_map:
            student['teacher_id'] = teacher_id_map[student['teacher_id']]
    
    # 更新课程数据
    courses = data.get(STORAGE_KEYS['COURSES'], [])
    for course in courses:
        if 'teacher_id' in course and course['teacher_id'] in teacher_id_map:
            course['teacher_id'] = teacher_id_map[course['teacher_id']]
    
    # 更新教室数据
    rooms = data.get(STORAGE_KEYS['ROOMS'], [])
    for room in rooms:
        if 'teacher_id' in room and room['teacher_id'] in teacher_id_map:
            room['teacher_id'] = teacher_id_map[room['teacher_id']]
    
    # 更新排课数据
    schedules = data.get(STORAGE_KEYS['SCHEDULED_CLASSES'], [])
    for schedule in schedules:
        if 'teacher_id' in schedule and schedule['teacher_id'] in teacher_id_map:
            schedule['teacher_id'] = teacher_id_map[schedule['teacher_id']]
    
    # 保存更新后的数据
    updated_data = {
        **data,
        STORAGE_KEYS['TEACHERS']: migrated_teachers,
        STORAGE_KEYS['STUDENTS']: students,
        STORAGE_KEYS['COURSES']: courses,
        STORAGE_KEYS['ROOMS']: rooms,
        STORAGE_KEYS['SCHEDULED_CLASSES']: schedules
    }
    
    # 保存到备份文件
    backup_path = os.path.expanduser('~/Desktop/music/music-scheduler-master/backups/src_20260222/data/localStorage_migrated.json')
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)
    
    print(f"迁移完成！")
    print(f"更新了 {len(migrated_teachers)} 位教师的ID")
    print(f"更新了 {len(teacher_id_map)} 个教师ID的关联数据")
    print(f"迁移后的数据已保存到: {backup_path}")

if __name__ == '__main__':
    migrate_teacher_ids()
