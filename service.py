"""Wrapper module to run the backend FastAPI app from project root.

Usage:
  uvicorn service:app --reload

This file ensures the `backend` folder is on sys.path before importing the
package named `app` that lives inside `backend/app` so we avoid name collisions
with any `app` package at the project root.
"""
import importlib
import os
import sys

# Ensure backend/ is first on sys.path so imports like `import app` resolve to
# backend/app, not to any root-level package named `app`.
ROOT = os.path.dirname(__file__)
BACKEND_DIR = os.path.join(ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import the backend app package (backend/app/main.py -> provides `app`)
backend_app = importlib.import_module("app.main")

# Expose the FastAPI instance expected by Uvicorn
app = getattr(backend_app, "app")
