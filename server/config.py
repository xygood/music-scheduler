import os
from dotenv import load_dotenv

load_dotenv()

def must_env(name: str) -> str:
    """生产环境必须配置的环境变量"""
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"生产环境缺少必要的环境变量: {name}")
    return v

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'music-scheduler-secret-key-2026')
    
    # SQLite 配置（本地开发）
    SQLITE_DB_PATH = os.environ.get('SQLITE_DB_PATH', 'music_scheduler.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{SQLITE_DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # MySQL 配置（生产环境）
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
    MYSQL_USER = os.environ.get('MYSQL_USER', 'scheduler')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'Scheduler@2026')
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'music_scheduler')
    MYSQL_SQLALCHEMY_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    
    SOCKETIO_MESSAGE_QUEUE = None
    CORS_ORIGINS = "*"

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False
    USE_MYSQL = True
    
    @property
    def SECRET_KEY(self):
        return must_env('SECRET_KEY')
    
    @property
    def MYSQL_PASSWORD(self):
        return must_env('MYSQL_PASSWORD')
    
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return f"mysql+pymysql://{Config.MYSQL_USER}:{self.MYSQL_PASSWORD}@{Config.MYSQL_HOST}:{Config.MYSQL_PORT}/{Config.MYSQL_DATABASE}?charset=utf8mb4"

class LocalConfig(Config):
    DEBUG = True
    USE_MYSQL = False
    SQLALCHEMY_DATABASE_URI = f'sqlite:///music_scheduler.db'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'local': LocalConfig,
    'default': LocalConfig
}
