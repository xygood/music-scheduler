from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, JSON, Date, Enum
from sqlalchemy.sql import func
from .database import Base
import uuid
import enum

class TeacherStatus(enum.Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    ON_LEAVE = 'on_leave'

class Teacher(Base):
    __tablename__ = 'teachers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(50), unique=True, nullable=False, comment='工号')
    name = Column(String(100), nullable=False, comment='姓名')
    full_name = Column(String(100), comment='姓名(兼容)')
    email = Column(String(100))
    phone = Column(String(20))
    department = Column(String(100), comment='兼容旧版本')
    faculty_id = Column(String(50), comment='教研室ID')
    faculty_code = Column(String(50), comment='教研室代码')
    faculty_name = Column(String(100), comment='教研室名称')
    position = Column(String(50), comment='职称')
    hire_date = Column(Date, comment='入职日期')
    status = Column(String(20), default='active', comment='状态')
    primary_instrument = Column(String(100), comment='主要教学乐器')
    can_teach_instruments = Column(JSON, comment='可教授乐器列表')
    max_students_per_class = Column(Integer, default=5)
    fixed_room_id = Column(String(36), comment='固定琴房ID(兼容)')
    fixed_rooms = Column(JSON, comment='多琴房配置')
    qualifications = Column(JSON, comment='教学资质')
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'name': self.name,
            'full_name': self.full_name or self.name,
            'email': self.email,
            'phone': self.phone,
            'department': self.department,
            'faculty_id': self.faculty_id,
            'faculty_code': self.faculty_code,
            'faculty_name': self.faculty_name,
            'position': self.position,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'status': self.status,
            'primary_instrument': self.primary_instrument,
            'can_teach_instruments': self.can_teach_instruments or [],
            'max_students_per_class': self.max_students_per_class,
            'fixed_room_id': self.fixed_room_id,
            'fixed_rooms': self.fixed_rooms or [],
            'qualifications': self.qualifications or [],
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
