import time

cache_store = {}

def set_cache(key, data, ttl=60):
    cache_store[key] = {
        "data": data,
        "expiry": time.time() + ttl   # ttl -> time to live 
    }

def get_cache(key):
    value = cache_store.get(key)

    if not value:
        return None

    if time.time() > value["expiry"]:
        del cache_store[key]
        return None

    return value["data"]