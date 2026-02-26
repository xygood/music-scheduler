from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from .database import Base
import uuid

class Class(Base):
    __tablename__ = 'classes'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String(50), comment='班级编号')
    class_name = Column(String(100), nullable=False, comment='班级名称')
    enrollment_year = Column(Integer, comment='入学年份')
    class_number = Column(Integer, comment='班号')
    student_count = Column(Integer, default=0, comment='学生人数')
    student_type = Column(String(20), default='general', comment='学生类型')
    status = Column(String(20), default='active', comment='状态')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'class_name': self.class_name,
            'enrollment_year': self.enrollment_year,
            'class_number': self.class_number,
            'student_count': self.student_count,
            'student_type': self.student_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
