from sqlalchemy import Column, String, DateTime, Integer, JSON, Text
from sqlalchemy.sql import func
from .database import Base
import uuid

class ImportedBlockedTime(Base):
    """导入的禁排时间表（与系统 blocked_slots 表独立）"""
    __tablename__ = 'imported_blocked_times'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 学年学期
    academic_year = Column(String(20), nullable=False, comment='学年')
    semester_label = Column(String(20), nullable=False, comment='学期')
    
    # 班级关联（JSONB 格式）
    class_associations = Column(JSON, default=list, comment='关联班级')
    
    # 时间信息（解析后的数组，方便查询）
    weeks = Column(JSON, default=list, comment='周次数组')
    day_of_week = Column(Integer, comment='星期几（1-7）')
    periods = Column(JSON, default=list, comment='节次数组')
    
    # 禁排原因/课程名称
    reason = Column(String(255), nullable=False, comment='禁排原因')
    
    # 数据来源标识
    source_type = Column(String(50), nullable=False, comment='system_blocked: 系统禁排, large_class: 专业大课')
    
    # 专业大课特有字段
    course_name = Column(String(255), comment='课程名称')
    teacher_name = Column(String(100), comment='教师姓名')
    location = Column(String(255), comment='上课地点')
    
    # 原始数据备份
    raw_data = Column(JSON, comment='原始导入的JSON数据')
    
    # 导入信息
    imported_by = Column(String(36), comment='导入人ID')
    imported_at = Column(DateTime, server_default=func.now(), comment='导入时间')
    
    # 元数据
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'academic_year': self.academic_year,
            'semester_label': self.semester_label,
            'class_associations': self.class_associations or [],
            'weeks': self.weeks or [],
            'day_of_week': self.day_of_week,
            'periods': self.periods or [],
            'reason': self.reason,
            'source_type': self.source_type,
            'course_name': self.course_name,
            'teacher_name': self.teacher_name,
            'location': self.location,
            'imported_at': self.imported_at.isoformat() if self.imported_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
