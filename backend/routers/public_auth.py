"""Public authentication endpoints that don't require JWT auth.

These endpoints are mounted at /public/ prefix to bypass the platform proxy's
auth requirement on /api/v1/* routes.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import create_access_token
from core.config import settings
from core.database import get_db
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public-auth"])


class LoginPasswordRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login_password(
    payload: LoginPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with username/password against user_profiles table.
    This endpoint is public (no JWT required).
    """
    username = payload.username.strip()
    password = payload.password.strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username e password sono obbligatori")

    # Look up user by username
    result = await db.execute(
        select(User_profiles).where(User_profiles.username == username)
    )
    profile = result.scalars().first()

    if not profile:
        logger.warning(f"[login] No profile found for username: {username}")
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    # Check password hash
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    stored_hash = profile.password_hash

    logger.info(f"[login] Checking password for user {username}, has stored hash: {stored_hash is not None}")

    if not stored_hash or stored_hash != password_hash:
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    if profile.status == "sospeso":
        raise HTTPException(status_code=403, detail="Account sospeso. Contatta l'amministratore.")
    if profile.status != "attivo":
        raise HTTPException(status_code=403, detail="Account disattivato")

    # Issue JWT token directly
    try:
        expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
    except (TypeError, ValueError):
        expires_minutes = 60

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

    user_name = f"{profile.nome or ''} {profile.cognome or ''}".strip() or profile.username

    claims = {
        "sub": profile.user_id,
        "email": profile.username or "",
        "role": profile.ruolo or "user",
        "name": user_name,
    }

    app_token = create_access_token(claims, expires_minutes=expires_minutes)

    logger.info(f"[login] Login successful for user {username}, role={profile.ruolo}")

    return {
        "token": app_token,
        "expires_at": int(expires_at.timestamp()),
        "token_type": "Bearer",
        "user": {
            "id": profile.user_id,
            "email": profile.username,
            "name": user_name,
            "role": profile.ruolo,
        }
    }