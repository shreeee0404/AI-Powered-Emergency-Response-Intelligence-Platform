from datetime import datetime, timedelta, timezone
import os

from jose import JWTError, jwt
from passlib.context import CryptContext

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv("SECRET_KEY", "disaster-resource-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# ============================================================
# PASSWORD FUNCTIONS
# ============================================================

def _truncate(password: str) -> str:
    # bcrypt silently truncates at 72 bytes; enforce it explicitly
    return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(
        _truncate(plain_password),
        hashed_password
    )


def get_password_hash(password):
    return pwd_context.hash(_truncate(password))


# ============================================================
# JWT TOKEN CREATION
# ============================================================

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ============================================================
# JWT TOKEN VERIFICATION
# ============================================================

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ============================================================
# AUTHENTICATION DEPENDENCY
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="http://localhost:8000/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return payload


# ============================================================
# ROLE-BASED ACCESS CONTROL
# ============================================================

def require_role(*allowed_roles):

    def role_checker(
        current_user: dict = Depends(get_current_user)
    ):
        user_role = str(current_user.get("role") or "").strip().lower()
        allowed = {str(role).strip().lower() for role in allowed_roles}

        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker


def admin_required(
    current_user: dict = Depends(get_current_user)
):
    return require_role("Admin")(current_user)


def coordinator_required(
    current_user: dict = Depends(get_current_user)
):
    return require_role("Admin", "Emergency Coordinator")(current_user)


def field_team_required(
    current_user: dict = Depends(get_current_user)
):
    return require_role("Admin", "Emergency Coordinator", "Field Team")(current_user)
