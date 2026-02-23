#!/usr/bin/env python3
"""
修复学生表中的 assigned_teachers 字段
将旧格式ID（如 t1769531156992）更新为工号格式
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import get_db
from models.student import Student
from models.teacher import Teacher
from sqlalchemy import text
import json

def fix_student_assigned_teachers():
    """修复学生表中的 assigned_teachers 为工号格式"""
    db = next(get_db())
    try:
        # 获取所有教师，建立旧ID到工号的映射
        teachers = db.query(Teacher).all()
        old_id_to_work_id = {}
        name_to_work_id = {}
        
        for t in teachers:
            # 如果教师ID是旧格式，添加到映射
            if t.id.startswith('t'):
                old_id_to_work_id[t.id] = t.teacher_id
            # 建立姓名到工号的映射
            if t.name:
                name_to_work_id[t.name] = t.teacher_id
        
        print(f"旧ID映射表数量: {len(old_id_to_work_id)}")
        print(f"姓名映射表数量: {len(name_to_work_id)}")
        
        # 获取所有学生
        students = db.query(Student).all()
        print(f"学生总数: {len(students)}")
        
        fixed_count = 0
        skipped_count = 0
        error_count = 0
        
        for student in students:
            if not student.assigned_teachers:
                skipped_count += 1
                continue
            
            try:
                assigned_teachers = student.assigned_teachers
                updated = False
                
                # 修复主项教师ID
                if assigned_teachers.get('primary_teacher_id') and assigned_teachers['primary_teacher_id'].startswith('t'):
                    old_id = assigned_teachers['primary_teacher_id']
                    teacher_name = assigned_teachers.get('primary_teacher_name')
                    
                    # 先尝试通过旧ID映射查找
                    new_id = old_id_to_work_id.get(old_id)
                    
                    # 如果找不到，通过姓名查找
                    if not new_id and teacher_name:
                        new_id = name_to_work_id.get(teacher_name)
                    
                    if new_id:
                        assigned_teachers['primary_teacher_id'] = new_id
                        print(f"[修复] {student.name} 主项教师: {old_id} -> {new_id} ({teacher_name})")
                        updated = True
                    else:
                        print(f"[未找到] {student.name} 主项教师: {old_id} ({teacher_name})")
                
                # 修复副项1教师ID
                if assigned_teachers.get('secondary1_teacher_id') and assigned_teachers['secondary1_teacher_id'].startswith('t'):
                    old_id = assigned_teachers['secondary1_teacher_id']
                    teacher_name = assigned_teachers.get('secondary1_teacher_name')
                    
                    new_id = old_id_to_work_id.get(old_id)
                    if not new_id and teacher_name:
                        new_id = name_to_work_id.get(teacher_name)
                    
                    if new_id:
                        assigned_teachers['secondary1_teacher_id'] = new_id
                        print(f"[修复] {student.name} 副项1教师: {old_id} -> {new_id} ({teacher_name})")
                        updated = True
                
                # 修复副项2教师ID
                if assigned_teachers.get('secondary2_teacher_id') and assigned_teachers['secondary2_teacher_id'].startswith('t'):
                    old_id = assigned_teachers['secondary2_teacher_id']
                    teacher_name = assigned_teachers.get('secondary2_teacher_name')
                    
                    new_id = old_id_to_work_id.get(old_id)
                    if not new_id and teacher_name:
                        new_id = name_to_work_id.get(teacher_name)
                    
                    if new_id:
                        assigned_teachers['secondary2_teacher_id'] = new_id
                        print(f"[修复] {student.name} 副项2教师: {old_id} -> {new_id} ({teacher_name})")
                        updated = True
                
                # 修复副项3教师ID
                if assigned_teachers.get('secondary3_teacher_id') and assigned_teachers['secondary3_teacher_id'].startswith('t'):
                    old_id = assigned_teachers['secondary3_teacher_id']
                    teacher_name = assigned_teachers.get('secondary3_teacher_name')
                    
                    new_id = old_id_to_work_id.get(old_id)
                    if not new_id and teacher_name:
                        new_id = name_to_work_id.get(teacher_name)
                    
                    if new_id:
                        assigned_teachers['secondary3_teacher_id'] = new_id
                        print(f"[修复] {student.name} 副项3教师: {old_id} -> {new_id} ({teacher_name})")
                        updated = True
                
                if updated:
                    # 更新学生记录
                    db.execute(
                        text("UPDATE students SET assigned_teachers = :assigned_teachers WHERE id = :student_id"),
                        {"assigned_teachers": json.dumps(assigned_teachers), "student_id": student.id}
                    )
                    fixed_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                print(f"[错误] {student.name}: {str(e)}")
                error_count += 1
        
        # 提交更改
        db.commit()
        
        print("-" * 60)
        print(f"修复完成!")
        print(f"  已修复: {fixed_count}")
        print(f"  已跳过: {skipped_count}")
        print(f"  错误: {error_count}")
        
        return fixed_count, skipped_count, error_count
        
    except Exception as e:
        db.rollback()
        print(f"发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

def check_student_assigned_teachers():
    """仅检查学生表的 assigned_teachers 状态"""
    db = next(get_db())
    try:
        students = db.query(Student).filter(Student.assigned_teachers != None).all()
        print(f"有assigned_teachers的学生数量: {len(students)}")
        
        old_format_count = 0
        for s in students:
            at = s.assigned_teachers
            if at:
                for key in ['primary_teacher_id', 'secondary1_teacher_id', 'secondary2_teacher_id', 'secondary3_teacher_id']:
                    if at.get(key) and str(at.get(key)).startswith('t'):
                        old_format_count += 1
                        if old_format_count <= 5:
                            print(f"  {s.name}: {key}={at.get(key)}")
                        break
        
        print(f"\n统计: 使用旧格式ID的学生数 ≈ {old_format_count}")
        
    finally:
        db.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='修复学生表 assigned_teachers 脚本')
    parser.add_argument('--check', action='store_true', help='仅检查，不修复')
    parser.add_argument('--fix', action='store_true', help='执行修复')
    
    args = parser.parse_args()
    
    if args.check:
        check_student_assigned_teachers()
    elif args.fix:
        fix_student_assigned_teachers()
    else:
        print("请指定操作:")
        print("  python fix_student_assigned_teachers.py --check  # 检查状态")
        print("  python fix_student_assigned_teachers.py --fix    # 执行修复")
