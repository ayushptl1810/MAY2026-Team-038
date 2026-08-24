"""Global, IP-keyed sliding-window rate limiter middleware, backed by Redis
sorted sets so the limit is shared across all FastAPI worker
processes/instances rather than tracked per-process. Not user-specific:
anonymous and authenticated callers share the same per-IP budget, since the
goal is capping cost/DoS exposure at the edge."""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from utils.redis_client import get_async_redis


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: float = 60.0) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}"
        now = time.time()
        window_start = now - self.window_seconds

        client = get_async_redis()

        try:
            await client.zremrangebyscore(key, 0, window_start)
            count = await client.zcard(key)

            if count >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                )

            # Unique member per request (timestamp alone can collide within
            # the same millisecond under load) so ZADD never silently
            # overwrites a prior hit instead of counting a new one.
            pipe = client.pipeline()
            pipe.zadd(key, {f"{now}:{uuid.uuid4().hex}": now})
            pipe.expire(key, int(self.window_seconds) + 1)
            await pipe.execute()
        except Exception:
            # Redis being down must not take the whole API down with it -
            # fail open (skip limiting for this request) rather than 500
            # every request, including login.
            pass

        return await call_next(request)
