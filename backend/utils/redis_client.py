"""Shared Redis connection. One module-level client, lazily connected via a
connection pool (redis-py pools internally, so this is cheap to reuse
across requests within a process)."""

import redis
import redis.asyncio as redis_async

from config import settings

_client: redis.Redis | None = None
_async_client: redis_async.Redis | None = None


def get_redis() -> redis.Redis:
    """Sync client - used from services/*.py, which run behind FastAPI's
    sync-dependency threadpool (same as the psycopg2 connections they take
    alongside)."""
    global _client
    if _client is None:
        _client = redis.Redis.from_url(settings.redis_url, decode_responses=False)
    return _client


def get_async_redis() -> redis_async.Redis:
    """Async client - used from RateLimitMiddleware, which runs directly on
    the event loop (not in a threadpool), so a sync/blocking Redis call
    there would stall every other in-flight request."""
    global _async_client
    if _async_client is None:
        _async_client = redis_async.from_url(settings.redis_url, decode_responses=False)
    return _async_client


def set_redis_client(client: redis.Redis) -> None:
    """Test-only override so utils.cache can be pointed at a fakeredis
    instance instead of a real Redis server."""
    global _client
    _client = client


def set_async_redis_client(client: redis_async.Redis) -> None:
    """Test-only override for utils.rate_limit's async client."""
    global _async_client
    _async_client = client
