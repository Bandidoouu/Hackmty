
USO RÁPIDO (Windows/PowerShell)

cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
$env:PYTHONPATH="$PWD"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

Rutas:
  POST /auth/register
  POST /auth/login
  GET  /auth/me           (Bearer)
  POST /auth/nessie/bootstrap (Bearer)
  POST /nessie/simulate-paycheck  (Bearer, body: {"amount": 2500})

Modo DEMO: si NESSIE_API_KEY está vacío, todo funciona sin llamar a Nessie.
