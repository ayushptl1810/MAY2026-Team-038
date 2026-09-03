"""Redis-backed TTL cache for read-heavy service functions. Shared across
all FastAPI worker processes (unlike the old in-process dict), so a cache
warm in one process - e.g. on login - is visible to requests handled by
any other process/instance."""

import hashlib

# pickle is safe here: Redis is a trusted, backend-owned instance (see
# config.py redis_url, no public network path) and every pickled value is
# written by our own @cached functions - never by user input - so there's
# no untrusted-deserialization surface.
import pickle
from functools import wraps
from typing import Any, Callable

from utils.redis_client import get_redis

_PREFIX = "cache"


def clear_all() -> None:
    """Wipes every cached function's entries, regardless of which cached()
    call created them. Intended for test isolation (an autouse fixture
    calling this before each test) - Redis otherwise persists entries
    across the whole pytest session even though per-test fixtures like a
    fake DB store reset every time."""
    client = get_redis()
    keys = list(client.scan_iter(match=f"{_PREFIX}:*"))
    if keys:
        client.delete(*keys)


def _func_prefix(func: Callable) -> str:
    return f"{_PREFIX}:{func.__module__}:{func.__qualname__}"


def _key(func: Callable, args: tuple, kwargs: dict) -> str:
    # args[0] is always the DB connection for our service functions - never
    # part of the key, since two different connections should hit the same
    # cached result for identical query params.
    payload = repr((args[1:], tuple(sorted(kwargs.items())))).encode()
    digest = hashlib.sha256(payload).hexdigest()
    return f"{_func_prefix(func)}:{digest}"


def cached(ttl_seconds: float) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            key = _key(func, args, kwargs)

            # Redis is a latency optimisation, not a hard dependency: if it
            # is unreachable (cold managed instance, restart, network blip)
            # serve the live query rather than 500 the request - same
            # fail-open stance as utils/rate_limit.py.
            try:
                cached_value = get_redis().get(key)
                if cached_value is not None:
                    return pickle.loads(cached_value)
            except Exception:
                return func(*args, **kwargs)

            value = func(*args, **kwargs)
            try:
                get_redis().set(key, pickle.dumps(value), ex=int(ttl_seconds) or 1)
            except Exception:
                pass
            return value

        def cache_clear() -> None:
            client = get_redis()
            keys = list(client.scan_iter(match=f"{_func_prefix(func)}:*"))
            if keys:
                client.delete(*keys)

        def is_cached(*rest_args: Any, **kwargs: Any) -> bool:
            # rest_args excludes the connection - callers pass the same
            # trailing args/kwargs they'd call the function with, minus conn.
            client = get_redis()
            payload = repr((rest_args, tuple(sorted(kwargs.items())))).encode()
            digest = hashlib.sha256(payload).hexdigest()
            key = f"{_func_prefix(func)}:{digest}"
            return client.exists(key) == 1

        wrapper.cache_clear = cache_clear
        wrapper.is_cached = is_cached
        return wrapper

    return decorator
