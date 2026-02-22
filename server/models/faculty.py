from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base
import uuid

class Faculty(Base):
    __tablename__ = 'faculties'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faculty_name = Column(String(100), nullable=False, comment='教研室名称')
    faculty_code = Column(String(50), unique=True, nullable=False, comment='教研室代码')
    description = Column(Text, comment='描述')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'faculty_name': self.faculty_name,
            'faculty_code': self.faculty_code,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
