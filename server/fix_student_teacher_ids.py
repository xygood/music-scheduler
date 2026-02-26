#!/usr/bin/env python3
"""
修复学生表中的 teacher_id 字段
将 user-... 格式更新为教师工号格式
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import get_db
from models.student import Student
from models.teacher import Teacher
from sqlalchemy import text

def fix_student_teacher_ids():
    """修复学生表中的 teacher_id 为工号格式"""
    db = next(get_db())
    try:
        # 获取所有教师，建立用户ID到工号的映射
        # 注意：这里假设可以通过教师姓名来匹配
        teachers = db.query(Teacher).all()
        teacher_name_to_work_id = {}
        for t in teachers:
            if t.name:
                teacher_name_to_work_id[t.name] = t.teacher_id
        
        print(f"教师姓名映射表数量: {len(teacher_name_to_work_id)}")
        
        # 获取所有学生
        students = db.query(Student).all()
        print(f"学生总数: {len(students)}")
        
        fixed_count = 0
        skipped_count = 0
        error_count = 0
        not_found_count = 0
        
        for student in students:
            old_teacher_id = student.teacher_id
            
            # 如果 teacher_id 是 user-... 格式，需要修复
            if old_teacher_id and old_teacher_id.startswith('user-'):
                # 尝试通过 assigned_teachers 中的教师姓名查找工号
                new_teacher_id = None
                
                if student.assigned_teachers:
                    primary_teacher_name = student.assigned_teachers.get('primary_teacher_name')
                    if primary_teacher_name and primary_teacher_name in teacher_name_to_work_id:
                        new_teacher_id = teacher_name_to_work_id[primary_teacher_name]
                        print(f"[修复] {student.name}: {old_teacher_id} -> {new_teacher_id} (通过主项教师: {primary_teacher_name})")
                
                # 如果找不到，尝试通过其他方式
                if not new_teacher_id:
                    # 尝试通过副项教师姓名查找
                    if student.secondary1_teacher_name and student.secondary1_teacher_name in teacher_name_to_work_id:
                        new_teacher_id = teacher_name_to_work_id[student.secondary1_teacher_name]
                        print(f"[修复] {student.name}: {old_teacher_id} -> {new_teacher_id} (通过副项1教师: {student.secondary1_teacher_name})")
                
                if new_teacher_id:
                    # 更新学生记录
                    db.execute(
                        text("UPDATE students SET teacher_id = :new_id WHERE id = :student_id"),
                        {"new_id": new_teacher_id, "student_id": student.id}
                    )
                    fixed_count += 1
                else:
                    print(f"[未找到] {student.name}: 无法找到对应的教师工号 (旧ID: {old_teacher_id})")
                    not_found_count += 1
            else:
                skipped_count += 1
        
        # 提交更改
        db.commit()
        
        print("-" * 60)
        print(f"修复完成!")
        print(f"  已修复: {fixed_count}")
        print(f"  未找到: {not_found_count}")
        print(f"  已跳过: {skipped_count}")
        print(f"  错误: {error_count}")
        
        # 验证修复结果
        print("\n验证修复结果...")
        students_after = db.query(Student).filter(Student.teacher_id.like('user-%')).count()
        
        if students_after > 0:
            print(f"警告: 仍有 {students_after} 名学生的 teacher_id 是 user-... 格式")
        else:
            print("✅ 所有学生的 teacher_id 已统一为工号格式!")
        
        return fixed_count, skipped_count, error_count
        
    except Exception as e:
        db.rollback()
        print(f"发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

def check_student_teacher_ids():
    """仅检查学生表的 teacher_id 状态"""
    db = next(get_db())
    try:
        total = db.query(Student).count()
        user_format = db.query(Student).filter(Student.teacher_id.like('user-%')).count()
        work_id_format = db.query(Student).filter(Student.teacher_id.notlike('user-%')).filter(Student.teacher_id != None).count()
        
        print(f"学生总数: {total}")
        print(f"teacher_id是user格式: {user_format}")
        print(f"teacher_id是其他格式: {work_id_format}")
        
        # 显示几个示例
        print("\n示例 (user格式):")
        for s in db.query(Student).filter(Student.teacher_id.like('user-%')).limit(3).all():
            print(f"  {s.name}: teacher_id={s.teacher_id}")
        
        return user_format == 0
        
    finally:
        db.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='修复学生表 teacher_id 脚本')
    parser.add_argument('--check', action='store_true', help='仅检查，不修复')
    parser.add_argument('--fix', action='store_true', help='执行修复')
    
    args = parser.parse_args()
    
    if args.check:
        check_student_teacher_ids()
    elif args.fix:
        fix_student_teacher_ids()
    else:
        print("请指定操作:")
        print("  python fix_student_teacher_ids.py --check  # 检查状态")
        print("  python fix_student_teacher_ids.py --fix    # 执行修复")
