"""
database/supabase_client.py

Creates a single shared Supabase client for the entire application.
The service role key bypasses Row-Level Security — it must never be
returned in any API response or logged.
"""

import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


@lru_cache(maxsize=1)
def get_client() -> Client:
    """
    Instantiate and cache the Supabase client.
    Called once on first use; subsequent calls return the cached instance.
    Raises KeyError if required environment variables are missing.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise RuntimeError("SUPABASE_URL environment variable is not set.")
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set.")

    return create_client(url, key)
