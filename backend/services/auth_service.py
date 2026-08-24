from uuid import uuid4

from fastapi import HTTPException, status
from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from schemas.auth import SignupRequest, UpdateProfileRequest
from utils.cache import cached
from utils.security import hash_password, verify_password


DEFAULT_SIGNUP_ROLE = "registered_member"


def create_user(conn: connection, data: SignupRequest) -> dict:
    # Emails are case-insensitive identifiers - normalize to lowercase
    # before both the duplicate check and the INSERT so "User@Example.com"
    # and "user@example.com" are always the same account. Without this, a
    # user who signs up with mixed-case letters and later types their email
    # in a different case at login gets a bogus 401 "Invalid email or
    # password" - this is the login bug being fixed here.
    email = data.email.strip().lower()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,),
        )

        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        new_id = str(uuid4())
        password_hash = hash_password(data.password)

        cur.execute(
            """
            INSERT INTO users (
                id,
                email,
                password_hash,
                full_name,
                phone,
                is_active,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                TRUE,
                now()
            )
            RETURNING id, email, full_name, phone, is_active
            """,
            (
                new_id,
                email,
                password_hash,
                data.full_name,
                data.phone,
            ),
        )

        user = cur.fetchone()

        cur.execute(
            """
            INSERT INTO user_roles (user_id, role)
            VALUES (%s, %s)
            """,
            (new_id, DEFAULT_SIGNUP_ROLE),
        )

        user["role"] = DEFAULT_SIGNUP_ROLE

        return user


def authenticate_user(
    conn: connection,
    email: str,
    password: str,
) -> dict:
    # Match the same case-insensitive normalization used at signup, so a
    # user who signed up as "User@Example.com" can log in with
    # "user@example.com" (or any other casing) instead of getting a bogus
    # 401.
    normalized_email = email.strip().lower()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                full_name,
                phone,
                password_hash,
                is_active
            FROM users
            WHERE email = %s
            """,
            (normalized_email,),
        )

        user = cur.fetchone()

        if (
            not user
            or not user["is_active"]
            or not verify_password(password, user["password_hash"])
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        return user


@cached(ttl_seconds=60)
def get_user_by_id(conn: connection, user_id: str) -> dict | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                full_name,
                phone,
                is_active
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )

        return cur.fetchone()


@cached(ttl_seconds=60)
def get_user_roles(conn: connection, user_id: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT role
            FROM user_roles
            WHERE user_id = %s
            """,
            (user_id,),
        )

        return [row[0] for row in cur.fetchall()]


def get_user_profile(
    conn: connection,
    user_id: str,
) -> dict | None:
    user = get_user_by_id(conn, user_id)

    if user is None:
        return None

    roles = get_user_roles(conn, user_id)

    user["role"] = roles[0] if roles else None

    return user


def update_user_profile(
    conn: connection,
    user_id: str,
    data: UpdateProfileRequest,
) -> dict | None:
    update_fields = []
    update_values = []

    if data.full_name is not None:
        update_fields.append("full_name = %s")
        update_values.append(data.full_name)

    if data.phone is not None:
        update_fields.append("phone = %s")
        update_values.append(data.phone)

    if not update_fields:
        return get_user_profile(conn, user_id)

    update_values.append(user_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE users
            SET {", ".join(update_fields)}
            WHERE id = %s
            RETURNING
                id,
                email,
                full_name,
                phone,
                is_active
            """,
            tuple(update_values),
        )

        user = cur.fetchone()

    if user is None:
        return None

    # The row above is fresh, but a GET /auth/me within the next 60s would
    # otherwise still hit the pre-update cache entry set by get_user_by_id.
    get_user_by_id.cache_clear()

    roles = get_user_roles(conn, user_id)
    user["role"] = roles[0] if roles else None

    return user
