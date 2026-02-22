from sqlalchemy import Column, String, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from .database import Base
import uuid

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(50), unique=True, nullable=False, comment='工号')
    email = Column(String(100))
    password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100))
    faculty_id = Column(String(50))
    faculty_code = Column(String(50))
    specialty = Column(JSON, comment='专业特长')
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'email': self.email,
            'full_name': self.full_name,
            'department': self.department,
            'faculty_id': self.faculty_id,
            'faculty_code': self.faculty_code,
            'specialty': self.specialty or [],
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
