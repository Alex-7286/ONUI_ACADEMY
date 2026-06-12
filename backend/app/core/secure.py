
import base64
import hashlib
import hmac
import os

ALGO = "pbkdf2_sha256"
ITERATIONS = 390000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("utf-8")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("utf-8")
    
    return f"{ALGO}${ITERATIONS}${salt_b64}${digest_b64}"

def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algo, iter_str, salt_b64, digest_b64 = encoded_hash.split("$", 3)
        if algo != ALGO:
            return False
        
        iterations = int(iter_str)
        salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("utf-8"))

        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    
    except Exception:
        return False
