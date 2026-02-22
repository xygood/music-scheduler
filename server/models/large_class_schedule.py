from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base
import uuid

class LargeClassSchedule(Base):
    __tablename__ = 'large_class_schedules'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name = Column(String(255))
    academic_year = Column(String(20))
    semester_label = Column(String(20))
    entries = Column(JSON, comment='课程条目数组')
    imported_at = Column(DateTime, server_default=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_name': self.file_name,
            'academic_year': self.academic_year,
            'semester_label': self.semester_label,
            'entries': self.entries or [],
            'imported_at': self.imported_at.isoformat() if self.imported_at else None
        }
