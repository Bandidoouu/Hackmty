# FinCoach (local run)

Quick steps to run the backend from the project root.

1. Activate the virtual environment (Windows PowerShell):

   & ".\.venv\Scripts\Activate.ps1"

2. Install dependencies (if not done):

   & ".\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt

3. Run the app from project root using the provided wrapper (recommended):

   & ".\.venv\Scripts\python.exe" -m uvicorn service:app --host 127.0.0.1 --port 8000 --reload

Note: There is also a working way to run from the `backend` folder directly:

   Set-Location -Path "backend"
   $env:PYTHONPATH="$PWD"
   & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload
