import base64
import os
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def get_master_encryption_key() -> bytes:
    """
    Derives a 256-bit (32-byte) master Key Encryption Key (KEK)
    from the application SECRET_KEY using SHA-256.
    """
    secret = settings.SECRET_KEY.encode("utf-8")
    return hashlib.sha256(secret).digest()


def encrypt_file_bytes(data: bytes, key: Optional[bytes] = None) -> bytes:
    """
    Encrypts raw file bytes using AES-256-GCM envelope encryption.
    Generates a unique 12-byte initialization vector (IV) per document.
    Returns: 12-byte IV + ciphertext (including 16-byte authentication tag).
    """
    if not data:
        return b""

    aes_key = key or get_master_encryption_key()
    aesgcm = AESGCM(aes_key)
    iv = os.urandom(12)  # 96-bit unique IV
    ciphertext = aesgcm.encrypt(iv, data, None)
    return iv + ciphertext


def decrypt_file_bytes(encrypted_data: bytes, key: Optional[bytes] = None) -> bytes:
    """
    Decrypts AES-256-GCM encrypted file bytes.
    Extracts 12-byte IV and verifies authenticity tag.
    Gracefully returns raw data if the data was not previously encrypted (backwards compatibility).
    """
    if not encrypted_data or len(encrypted_data) < 28:
        # Minimum AES-GCM envelope size: 12 bytes IV + 16 bytes tag
        return encrypted_data

    aes_key = key or get_master_encryption_key()
    aesgcm = AESGCM(aes_key)
    iv = encrypted_data[:12]
    ciphertext = encrypted_data[12:]

    try:
        return aesgcm.decrypt(iv, ciphertext, None)
    except Exception:
        # Not encrypted or different format: return original bytes
        return encrypted_data
