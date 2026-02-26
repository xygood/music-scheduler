#!/usr/bin/env python3
"""
检查localStorage中的教师数据
"""

import json
import os

# 检查localStorage文件是否存在
LOCAL_STORAGE_FILE = os.path.expanduser('~/Library/Application Support/Google/Chrome/Default/Local Storage/leveldb')

# 检查备份文件
BACKUP_FILES = [
    os.path.expanduser('~/Desktop/music/music-scheduler-master/backups/src_20260222/data/localStorage.json'),
    os.path.expanduser('~/Desktop/music/music-scheduler-master/backups/src_20260222/data/localStorage_migrated.json')
]

def check_teacher_data():
    """检查教师数据"""
    print("检查教师数据...")
    
    for backup_file in BACKUP_FILES:
        if os.path.exists(backup_file):
            print(f"\n检查文件: {backup_file}")
            with open(backup_file, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    teachers = data.get('music_scheduler_teachers', [])
                    print(f"找到 {len(teachers)} 位教师")
                    
                    # 检查前10位教师的ID格式
                    for i, teacher in enumerate(teachers[:10]):
                        teacher_id = teacher.get('teacher_id', 'N/A')
                        id_field = teacher.get('id', 'N/A')
                        name = teacher.get('name', '未知')
                        print(f"教师 {i+1}: {name} - ID: {id_field} - 工号: {teacher_id}")
                        if id_field == teacher_id:
                            print(f"  ✅ ID与工号一致: {id_field}")
                        else:
                            print(f"  ⚠️ ID与工号不一致: {id_field} vs {teacher_id}")
                    
                except json.JSONDecodeError as e:
                    print(f"  ❌ JSON解析错误: {e}")
                except Exception as e:
                    print(f"  ❌ 读取错误: {e}")
        else:
            print(f"  ⚠️ 文件不存在: {backup_file}")

if __name__ == '__main__':
    check_teacher_data()
