from sqlalchemy import Column, String, DateTime, Boolean, Date
from sqlalchemy.sql import func
from .database import Base
import uuid

class StudentTeacherAssignment(Base):
    __tablename__ = 'student_teacher_assignments'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), nullable=False)
    teacher_id = Column(String(50), nullable=False)
    faculty_code = Column(String(20), nullable=False, comment='PIANO/VOCAL/INSTRUMENT')
    instrument_name = Column(String(100), nullable=False)
    assignment_type = Column(String(20), default='primary', comment='primary/secondary/substitute')
    is_active = Column(Boolean, default=True)
    assignment_status = Column(String(20), default='active')
    assigned_at = Column(DateTime, server_default=func.now())
    effective_date = Column(Date)
    ended_at = Column(DateTime)
    assigned_by = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'teacher_id': self.teacher_id,
            'faculty_code': self.faculty_code,
            'instrument_name': self.instrument_name,
            'assignment_type': self.assignment_type,
            'is_active': self.is_active,
            'assignment_status': self.assignment_status,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'assigned_by': self.assigned_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
