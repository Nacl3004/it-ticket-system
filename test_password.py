import bcrypt

# 数据库中的密码哈希
stored_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/qvIyC"

# 测试密码
test_password = "admin123"

# 转换为字节
stored_hash_bytes = stored_hash.encode('utf-8')
test_password_bytes = test_password.encode('utf-8')

# 验证
result = bcrypt.checkpw(test_password_bytes, stored_hash_bytes)

print(f"密码验证结果: {result}")
print(f"存储的哈希: {stored_hash}")
print(f"测试密码: {test_password}")

# 生成新的哈希
new_hash = bcrypt.hashpw(test_password_bytes, bcrypt.gensalt())
print(f"新生成的哈希: {new_hash.decode('utf-8')}")
