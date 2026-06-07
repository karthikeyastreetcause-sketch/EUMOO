import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

DB_NAME = "eumo.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            terms_accepted INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()

def test_signup_and_login():
    print("Initializing DB...")
    init_db()
    
    # Test Data
    email = "test@example.com"
    username = "testuser"
    password = "password123"
    full_name = "Test User"
    phone = "1234567890"
    
    # Simulate DB Check (Signup)
    print("Testing Signup Logic...")
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ? OR username = ?",
        (email, username),
    ).fetchone()
    
    if existing:
        print("User already exists, cleaning up for test...")
        conn.execute("DELETE FROM users WHERE email = ?", (email,))
        conn.commit()
        existing = None
        
    password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    print(f"Generated hash: {password_hash[:10]}...")
    
    conn.execute(
        """
        INSERT INTO users (full_name, phone_number, email, username, password_hash, terms_accepted)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (full_name, phone, email, username, password_hash, 1),
    )
    conn.commit()
    conn.close()
    print("Signup successful.")
    
    # Simulate Login Logic
    print("Testing Login Logic...")
    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ? OR username = ?",
        (username, username),
    ).fetchone()
    conn.close()
    
    if not user:
        print("ERROR: User not found!")
        return
        
    print(f"User found: {user['username']}")
    
    if check_password_hash(user["password_hash"], password):
        print("Password Match: SUCCESS")
    else:
        print("Password Match: FAILED")

if __name__ == "__main__":
    try:
        test_signup_and_login()
    except Exception as e:
        print(f"EXCEPTION: {e}")
