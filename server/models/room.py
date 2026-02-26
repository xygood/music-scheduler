from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, Date
from sqlalchemy.sql import func
from .database import Base
import uuid

class Room(Base):
    __tablename__ = 'rooms'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(50), comment='关联教师')
    room_name = Column(String(100), nullable=False, comment='教室名称')
    room_type = Column(String(20), default='琴房', comment='教室类型')
    faculty_code = Column(String(50), comment='专业代码')
    capacity = Column(Integer, default=1, comment='容量')
    location = Column(String(200), comment='位置')
    equipment = Column(JSON, comment='设备配置')
    status = Column(String(20), default='空闲', comment='状态')
    last_maintenance = Column(Date, comment='最后维护时间')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'room_name': self.room_name,
            'room_type': self.room_type,
            'faculty_code': self.faculty_code,
            'capacity': self.capacity,
            'location': self.location,
            'equipment': self.equipment or [],
            'status': self.status,
            'last_maintenance': self.last_maintenance.isoformat() if self.last_maintenance else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
