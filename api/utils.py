import json
import re
import time
from functools import wraps


def progress_step(name):
    """Decorator to log and time specific backend operations"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            print(f"DEBUG: Starting step -> {name}")
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                print(f"DEBUG: Finished step -> {name} ({duration:.2f}s)")
                return result
            except Exception as e:
                print(f"DEBUG: FAILED step -> {name} - Error: {str(e)}")
                raise e

        return wrapper

    return decorator


def extract_info(val):
    val = val.strip().lower()
    # Clean up standard URL prefixes
    val = re.sub(r"^https?://(www\.)?letterboxd\.com/", "", val)
    val = re.sub(r"^letterboxd\.com/", "", val)

    parts = [p for p in val.split("/") if p]

    # Format: user/list/slug
    if len(parts) >= 3 and parts[1] == "list":
        return parts[0], parts[2]
    # Format: user/slug or user//slug
    elif len(parts) >= 2:
        # ignore generic pages like 'films' or 'followers' to avoid bugs if a user inputs something incomplete
        if parts[1] not in (
            "films",
            "following",
            "followers",
            "reviews",
            "lists",
            "watchlist",
        ):
            return parts[0], parts[1]

    return None, None


def get_error_msg(e):
    msg = str(e)
    try:
        # Check if the message itself is a JSON string
        data = json.loads(msg)
        return data.get("message", msg)
    except Exception:
        try:
            # letterboxdpy sometimes throws JSON-structured errors in the first line
            return json.loads(msg.split("\n")[0]).get("message", msg)
        except Exception:
            return msg
