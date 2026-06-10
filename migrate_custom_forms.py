import pymysql
import os
import json

# 数据库配置统一从环境变量读取，避免将生产凭据提交到版本库。
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "it_ticket_system"),
    "charset": "utf8mb4"
}

def migrate_custom_forms():
    if not DB_CONFIG["user"] or not DB_CONFIG["password"]:
        raise RuntimeError("请先设置 DB_USER 和 DB_PASSWORD 环境变量")

    conn = pymysql.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()
        
        # 1. 为 ticket_categories 添加 form_template 字段
        cursor.execute("SHOW COLUMNS FROM ticket_categories LIKE 'form_template'")
        if not cursor.fetchone():
            print("Adding form_template column to ticket_categories...")
            cursor.execute("ALTER TABLE ticket_categories ADD COLUMN form_template TEXT DEFAULT NULL COMMENT '自定义表单模板(JSON)'")
        else:
            print("form_template column already exists.")
            
        # 2. 为 tickets 添加 extra_data 字段
        cursor.execute("SHOW COLUMNS FROM tickets LIKE 'extra_data'")
        if not cursor.fetchone():
            print("Adding extra_data column to tickets...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN extra_data TEXT DEFAULT NULL COMMENT '自定义表单数据(JSON)'")
        else:
            print("extra_data column already exists.")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_custom_forms()
