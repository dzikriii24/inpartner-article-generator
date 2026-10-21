import os
import secrets
import hashlib
import hmac
import time
from typing import Optional
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from models import AdminUser

SESSION_COOKIE_NAME = "inpartner_admin_session"
SESSION_DURATION_DAYS = 7

# Secret key for signing session cookies
def get_session_secret() -> bytes:
    key = os.getenv("ADMIN_SESSION_SECRET") or os.getenv("STORE_INTEGRATION_KEY") or "inpartner_article_gen_secure_key_fallback_2026"
    return key.encode("utf-8")


def hash_password(password: str) -> str:
    """
    Hashes password using PBKDF2-SHA256 with cryptographically secure random salt.
    Format: pbkdf2_sha256$iterations$salt_hex$hash_hex
    """
    salt = secrets.token_hex(16)
    iterations = 100_000
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${hash_bytes.hex()}"


def verify_password(plain_password: str, hashed: str) -> bool:
    """
    Verifies plain password against PBKDF2-SHA256 hash in constant time.
    """
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hash = parts[3]
        actual_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def create_session_token(user_id: int, username: str) -> str:
    """
    Creates a tamper-proof signed session token: user_id:username:expires_timestamp:signature
    """
    expires = int(time.time()) + (SESSION_DURATION_DAYS * 86400)
    payload = f"{user_id}:{username}:{expires}"
    sig = hmac.new(get_session_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_session_token(token: str) -> Optional[dict]:
    """
    Validates signature and expiry of the session token.
    """
    if not token or ":" not in token:
        return None
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None
        user_id_str, username, expires_str, sig = parts
        payload = f"{user_id_str}:{username}:{expires_str}"
        expected_sig = hmac.new(get_session_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(sig, expected_sig):
            return None
        expires = int(expires_str)
        if time.time() > expires:
            return None
        return {"user_id": int(user_id_str), "username": username, "expires": expires}
    except Exception:
        return None


def get_current_admin(request: Request, db: Session) -> Optional[AdminUser]:
    """
    Retrieves the authenticated AdminUser from session cookie or Authorization header.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        # Check Authorization header as fallback (Bearer token)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    data = verify_session_token(token)
    if not data:
        return None

    admin = db.query(AdminUser).filter(AdminUser.id == data["user_id"], AdminUser.is_active == True).first()
    return admin


def ensure_initial_admin(db: Session):
    """
    Ensures an initial admin user exists for development/bootstrap.
    Username: admin
    Password: admin123
    """
    admin_count = db.query(AdminUser).count()
    if admin_count == 0:
        initial_admin = AdminUser(
            username="admin",
            password_hash=hash_password("admin123"),
            email="admin@inpartner.id",
            role="superadmin",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(initial_admin)
        db.commit()
        print("[Auth Service] Initial admin account created (username: 'admin').")
