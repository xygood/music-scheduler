#!/usr/bin/env python3
"""
修复数据库中教师ID的脚本
将教师的 id 字段更新为与 teacher_id 相同（使用工号）
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import get_db, init_db
from models.teacher import Teacher
from sqlalchemy import text

def fix_teacher_ids():
    """修复所有教师的ID为工号格式"""
    db = next(get_db())
    try:
        # 获取所有教师
        teachers = db.query(Teacher).all()
        
        print(f"共找到 {len(teachers)} 位教师")
        print("-" * 60)
        
        fixed_count = 0
        skipped_count = 0
        error_count = 0
        
        for teacher in teachers:
            old_id = teacher.id
            new_id = teacher.teacher_id
            
            # 检查是否需要修复
            if old_id == new_id:
                print(f"[跳过] {teacher.name}: ID已经是工号格式 ({new_id})")
                skipped_count += 1
                continue
            
            # 检查新ID是否有效
            if not new_id or not new_id.strip():
                print(f"[错误] {teacher.name}: 工号为空，无法修复")
                error_count += 1
                continue
            
            try:
                # 检查新ID是否已被其他教师使用
                existing = db.query(Teacher).filter(Teacher.id == new_id).first()
                if existing and existing.teacher_id != teacher.teacher_id:
                    print(f"[错误] {teacher.name}: 工号 {new_id} 已被其他教师使用")
                    error_count += 1
                    continue
                
                # 更新ID
                print(f"[修复] {teacher.name}: {old_id} -> {new_id}")
                
                # 使用原生SQL更新，避免SQLAlchemy的会话问题
                db.execute(
                    text("UPDATE teachers SET id = :new_id WHERE teacher_id = :teacher_id"),
                    {"new_id": new_id, "teacher_id": teacher.teacher_id}
                )
                fixed_count += 1
                
            except Exception as e:
                print(f"[错误] {teacher.name}: 修复失败 - {str(e)}")
                error_count += 1
                db.rollback()
        
        # 提交所有更改
        db.commit()
        
        print("-" * 60)
        print(f"修复完成!")
        print(f"  已修复: {fixed_count}")
        print(f"  已跳过: {skipped_count}")
        print(f"  错误: {error_count}")
        
        # 验证修复结果
        print("\n验证修复结果...")
        teachers_after = db.query(Teacher).all()
        wrong_format = [t for t in teachers_after if t.id != t.teacher_id]
        
        if wrong_format:
            print(f"警告: 仍有 {len(wrong_format)} 位教师的ID不是工号格式:")
            for t in wrong_format:
                print(f"  - {t.name}: id={t.id}, teacher_id={t.teacher_id}")
        else:
            print("✅ 所有教师的ID已统一为工号格式!")
        
        return fixed_count, skipped_count, error_count
        
    except Exception as e:
        db.rollback()
        print(f"发生错误: {str(e)}")
        raise
    finally:
        db.close()

def check_teacher_ids():
    """仅检查教师ID状态，不修复"""
    db = next(get_db())
    try:
        teachers = db.query(Teacher).all()
        
        print(f"共找到 {len(teachers)} 位教师")
        print("-" * 60)
        
        correct = 0
        wrong = 0
        
        for teacher in teachers:
            if teacher.id == teacher.teacher_id:
                correct += 1
                if correct <= 5:  # 只显示前5个正确的
                    print(f"[正确] {teacher.name}: id={teacher.id}")
            else:
                wrong += 1
                print(f"[错误] {teacher.name}: id={teacher.id}, teacher_id={teacher.teacher_id}")
        
        print("-" * 60)
        print(f"统计: 正确={correct}, 错误={wrong}")
        
        return wrong == 0
        
    finally:
        db.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='修复教师ID脚本')
    parser.add_argument('--check', action='store_true', help='仅检查，不修复')
    parser.add_argument('--fix', action='store_true', help='执行修复')
    
    args = parser.parse_args()
    
    if args.check:
        check_teacher_ids()
    elif args.fix:
        fix_teacher_ids()
    else:
        print("请指定操作:")
        print("  python fix_teacher_ids.py --check  # 检查教师ID状态")
        print("  python fix_teacher_ids.py --fix    # 执行修复")
