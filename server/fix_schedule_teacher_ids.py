#!/usr/bin/env python3
"""
修复排课表中的 teacher_id 字段
将旧格式ID（如 t1769531158806）更新为工号格式
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import get_db
from models.schedule import ScheduledClass
from models.teacher import Teacher
from sqlalchemy import text

def fix_schedule_teacher_ids():
    """修复排课表中的 teacher_id 为工号格式"""
    db = next(get_db())
    try:
        # 获取所有教师，建立旧ID到工号的映射
        teachers = db.query(Teacher).all()
        teacher_map = {}
        for t in teachers:
            # 如果教师ID是旧格式，也添加到映射
            if t.id.startswith('t'):
                teacher_map[t.id] = t.teacher_id
            # 如果 teacher_id 是旧格式，映射到新的工号
            if t.teacher_id.startswith('t'):
                teacher_map[t.teacher_id] = t.teacher_id
        
        print(f"教师映射表数量: {len(teacher_map)}")
        
        # 获取所有排课记录
        schedules = db.query(ScheduledClass).all()
        print(f"排课记录总数: {len(schedules)}")
        
        fixed_count = 0
        skipped_count = 0
        error_count = 0
        
        for schedule in schedules:
            old_teacher_id = schedule.teacher_id
            
            # 如果 teacher_id 是旧格式，查找对应的工号
            if old_teacher_id and old_teacher_id.startswith('t'):
                # 通过教师姓名查找工号
                teacher = db.query(Teacher).filter(Teacher.name == schedule.teacher_name).first()
                if teacher:
                    new_teacher_id = teacher.teacher_id
                    print(f"[修复] {schedule.teacher_name}: {old_teacher_id} -> {new_teacher_id}")
                    
                    # 更新排课记录
                    db.execute(
                        text("UPDATE scheduled_classes SET teacher_id = :new_id WHERE id = :schedule_id"),
                        {"new_id": new_teacher_id, "schedule_id": schedule.id}
                    )
                    fixed_count += 1
                else:
                    print(f"[错误] 找不到教师: {schedule.teacher_name} (旧ID: {old_teacher_id})")
                    error_count += 1
            else:
                skipped_count += 1
        
        # 提交更改
        db.commit()
        
        print("-" * 60)
        print(f"修复完成!")
        print(f"  已修复: {fixed_count}")
        print(f"  已跳过: {skipped_count}")
        print(f"  错误: {error_count}")
        
        # 验证修复结果
        print("\n验证修复结果...")
        schedules_after = db.query(ScheduledClass).all()
        wrong_format = [s for s in schedules_after if s.teacher_id and s.teacher_id.startswith('t')]
        
        if wrong_format:
            print(f"警告: 仍有 {len(wrong_format)} 条排课记录的 teacher_id 是旧格式")
        else:
            print("✅ 所有排课记录的 teacher_id 已统一为工号格式!")
        
        return fixed_count, skipped_count, error_count
        
    except Exception as e:
        db.rollback()
        print(f"发生错误: {str(e)}")
        raise
    finally:
        db.close()

def check_schedule_teacher_ids():
    """仅检查排课表的 teacher_id 状态"""
    db = next(get_db())
    try:
        schedules = db.query(ScheduledClass).all()
        print(f"排课记录总数: {len(schedules)}")
        
        old_format = 0
        new_format = 0
        
        for schedule in schedules:
            if schedule.teacher_id and schedule.teacher_id.startswith('t'):
                old_format += 1
                if old_format <= 10:
                    print(f"[旧格式] {schedule.teacher_name}: teacher_id={schedule.teacher_id}")
            else:
                new_format += 1
        
        print("-" * 60)
        print(f"统计: 旧格式={old_format}, 新格式={new_format}")
        
        return old_format == 0
        
    finally:
        db.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='修复排课表 teacher_id 脚本')
    parser.add_argument('--check', action='store_true', help='仅检查，不修复')
    parser.add_argument('--fix', action='store_true', help='执行修复')
    
    args = parser.parse_args()
    
    if args.check:
        check_schedule_teacher_ids()
    elif args.fix:
        fix_schedule_teacher_ids()
    else:
        print("请指定操作:")
        print("  python fix_schedule_teacher_ids.py --check  # 检查状态")
        print("  python fix_schedule_teacher_ids.py --fix    # 执行修复")
