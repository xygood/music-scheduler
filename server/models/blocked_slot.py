from sqlalchemy import Column, String, DateTime, Integer, Date, JSON
from sqlalchemy.sql import func
from .database import Base
import uuid

class BlockedSlot(Base):
    __tablename__ = 'blocked_slots'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    academic_year = Column(String(20))
    semester_label = Column(String(20))
    type = Column(String(20), nullable=False, comment='类型')
    class_associations = Column(JSON, comment='关联班级')
    week_number = Column(Integer, comment='特定周次')
    specific_week_days = Column(JSON, comment='特定周次的星期几')
    day_of_week = Column(Integer, comment='星期几(循环)')
    start_period = Column(Integer, comment='开始节次')
    end_period = Column(Integer, comment='结束节次')
    start_date = Column(Date)
    end_date = Column(Date)
    weeks = Column(String(50), comment='周次范围字符串')
    reason = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'academic_year': self.academic_year,
            'semester_label': self.semester_label,
            'type': self.type,
            'class_associations': self.class_associations or [],
            'week_number': self.week_number,
            'specific_week_days': self.specific_week_days or [],
            'day_of_week': self.day_of_week,
            'start_period': self.start_period,
            'end_period': self.end_period,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'weeks': self.weeks,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
