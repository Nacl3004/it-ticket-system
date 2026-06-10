import bcrypt

# 数据库中的密码哈希
stored_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

# 测试不同的密码
test_passwords = ["admin123", "Admin123", "admin", "123456"]

print("测试密码验证：")
for pwd in test_passwords:
    result = bcrypt.checkpw(pwd.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"密码 '{pwd}': {result}")

# 生成新的admin123密码哈希
print("\n生成新的admin123密码哈希：")
new_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
print(f"新哈希: {new_hash.decode('utf-8')}")

# 验证新哈希
verify = bcrypt.checkpw("admin123".encode('utf-8'), new_hash)
print(f"验证新哈希: {verify}")
