import bcrypt

# 数据库中的密码哈希
stored_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/qvIyC"

# 测试密码
test_password = "admin123"

print("=" * 50)
print("测试密码验证")
print("=" * 50)

# 方法1：直接验证
try:
    result = bcrypt.checkpw(test_password.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"方法1 - 直接验证: {result}")
except Exception as e:
    print(f"方法1 - 错误: {e}")

# 方法2：生成新的哈希并验证
print("\n生成新的哈希值:")
new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt())
print(f"新哈希: {new_hash.decode('utf-8')}")

# 验证新哈希
result2 = bcrypt.checkpw(test_password.encode('utf-8'), new_hash)
print(f"新哈希验证: {result2}")

# 方法3：测试不同的密码
print("\n测试不同的密码:")
test_passwords = ["admin123", "Admin123", "admin", "123456", "password"]
for pwd in test_passwords:
    try:
        result = bcrypt.checkpw(pwd.encode('utf-8'), stored_hash.encode('utf-8'))
        print(f"密码 '{pwd}': {result}")
    except Exception as e:
        print(f"密码 '{pwd}': 错误 - {e}")
