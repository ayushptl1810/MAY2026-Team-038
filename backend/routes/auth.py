from fastapi import APIRouter, Depends
from psycopg2.extensions import connection

from database import get_db
from schemas.auth import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from services import auth_service, trails_service
from utils.auth import get_current_user
from utils.security import create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(payload: SignupRequest, conn: connection = Depends(get_db)) -> dict:
    user = auth_service.create_user(conn, payload)
    user["roles"] = [auth_service.DEFAULT_SIGNUP_ROLE]
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    conn: connection = Depends(get_db),
) -> TokenResponse:
    user = auth_service.authenticate_user(
        conn,
        payload.email,
        payload.password,
    )

    token = create_access_token(
        subject=str(user["id"]),
    )

    # Warm the trails cache so the first post-login dashboard load doesn't
    # pay the DBSCAN clustering cost. Best-effort only - a clustering
    # failure here must never turn a correct login into a 500.
    try:
        trails_service.get_dynamic_trails(conn)
    except Exception:
        pass

    return TokenResponse(
        access_token=token,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def read_current_user(
    current_user: dict = Depends(get_current_user),
    conn: connection = Depends(get_db),
) -> dict:
    user = auth_service.get_user_profile(
        conn,
        str(current_user["id"]),
    )

    return user


@router.patch(
    "/me",
    response_model=UserResponse,
)
def update_current_user(
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    conn: connection = Depends(get_db),
) -> dict:
    user = auth_service.update_user_profile(
        conn,
        str(current_user["id"]),
        payload,
    )

    return user