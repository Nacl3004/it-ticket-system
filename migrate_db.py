import pymysql
import os

# 数据库配置统一从环境变量读取，避免将生产凭据提交到版本库。
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "it_ticket_system"),
    "charset": "utf8mb4"
}

def migrate():
    if not DB_CONFIG["user"] or not DB_CONFIG["password"]:
        raise RuntimeError("请先设置 DB_USER 和 DB_PASSWORD 环境变量")

    conn = pymysql.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()
        
        # 检查 satisfaction 字段是否存在
        cursor.execute("SHOW COLUMNS FROM tickets LIKE 'satisfaction'")
        if not cursor.fetchone():
            print("Adding satisfaction column...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN satisfaction INT DEFAULT NULL COMMENT '满意度评分(1-5)'")
        else:
            print("satisfaction column already exists.")
            
        # 检查 satisfaction_comment 字段是否存在
        cursor.execute("SHOW COLUMNS FROM tickets LIKE 'satisfaction_comment'")
        if not cursor.fetchone():
            print("Adding satisfaction_comment column...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN satisfaction_comment TEXT DEFAULT NULL COMMENT '满意度评价'")
        else:
            print("satisfaction_comment column already exists.")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
