from sqlalchemy import Column, String, DateTime, Integer, Date
from sqlalchemy.sql import func
from .database import Base
import uuid

class SemesterWeekConfig(Base):
    __tablename__ = 'semester_week_configs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    academic_year = Column(String(20), nullable=False)
    semester_label = Column(String(20), unique=True, nullable=False)
    start_date = Column(Date, nullable=False, comment='学期开始日期')
    total_weeks = Column(Integer, default=16)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'academic_year': self.academic_year,
            'semester_label': self.semester_label,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'total_weeks': self.total_weeks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
