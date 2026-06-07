from werkzeug.security import generate_password_hash, check_password_hash

try:
    print("Testing default hash...")
    # This should fail based on previous finding
    try:
        pw = generate_password_hash("test")
        print(f"Default hash worked: {pw}")
    except AttributeError as e:
        print(f"Default hash failed as expected: {e}")

    print("\nTesting pbkdf2:sha256...")
    # This should work
    pw_fixed = generate_password_hash("test", method='pbkdf2:sha256')
    print(f"Fixed hash worked: {pw_fixed}")
    
    # Verify check
    print(f"Check result: {check_password_hash(pw_fixed, 'test')}")
    
except Exception as e:
    print(f"Unexpected error: {e}")
