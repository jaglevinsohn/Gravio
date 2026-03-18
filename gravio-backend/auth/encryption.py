import os
import json
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

# Generates a key if one is not provided in env. In production, provide ENCRYPTION_KEY.
SECRET_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
fernet = Fernet(SECRET_KEY.encode())

def encrypt_cookies(cookies: list) -> str:
    """
    Encrypts a list of cookie dictionaries into a secure string.
    """
    json_bytes = json.dumps(cookies).encode('utf-8')
    encrypted_bytes = fernet.encrypt(json_bytes)
    return encrypted_bytes.decode('utf-8')

def decrypt_cookies(encrypted_data: str) -> list:
    """
    Decrypts the secure string back into a list of cookie dictionaries.
    """
    decrypted_bytes = fernet.decrypt(encrypted_data.encode('utf-8'))
    return json.loads(decrypted_bytes.decode('utf-8'))
