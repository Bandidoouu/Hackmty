# FinCoach — MVP (Hackathon)

Banco-escuela educativo que detecta **gastos hormiga**, calcula **mínimo para vivir**, integra **Nessie (Capital One)** para simular banca (depósitos, bills, P2P), y un **coach** con IA (stubs para function calling). Frontend en React + Vite + Tailwind; Backend en FastAPI.

> ⚠️ **Uso educativo**. No es asesoría financiera regulada ni app bancaria real. Nessie es un sandbox y aquí también hay un **mock** por si no tienes API key.

## Requisitos
- Docker y Docker Compose **o** (opción rápida) Node 20 + Python 3.11 local.
- (Opcional) API Key de Nessie en `.env`.

## Instalación rápida (sin Docker)
```bash
# 1) Backend
cd backend
python -m venv .venv && source .venv/bin/activate  # (en Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env  # edita si quieres usar Nessie real
python scripts/seed.py
uvicorn app.main:app --reload --port 8000

# 2) Frontend (otra terminal)
cd frontend
npm install
npm run dev  # abre el puerto que indique Vite (p.ej. http://localhost:5173)
```

## Instalación con Docker
```bash
cp .env.example .env  # edita si quieres usar Nessie real
docker compose up --build
# API: http://localhost:8000/docs
# Web: http://localhost:5173
```

## Flujo de demo (90s)
1. Abre la web y completa el **Onboarding** (ingreso y carga de datos demo).
2. Ve el **Dashboard**: “Mínimo para vivir”, “Colchón”, “Gasto hormiga top-5”.
3. En **Coach**, ejecuta una micro-acción (p.ej., crear meta semanal).
4. En **Learn**, completa una lección → suma XP; haz **Check-in** para sumar racha.
5. Desde **Dashboard**, prueba **Simular nómina**, **Programar pago** y **P2P** (real con Nessie o mock).

## Variables de entorno (raíz: `.env.example`)
```
USE_NESSIE=false
NESSIE_BASE_URL=https://api.nessieisreal.com
NESSIE_API_KEY=REPLACE_ME
DATABASE_URL=sqlite+aiosqlite:///./fincoach.db
BACKEND_PORT=8000
FRONTEND_PORT=5173
```

## Criterios de aceptación (MVP)
- `GET /budget/summary` devuelve `survival_min`, `ant_spend`, `top_ant[]`, `cushion`.
- Simulas **nómina**, **pago programado** y **P2P** desde UI (mock o Nessie real).
- **Racha** incrementa con check-in diario; **XP** al ver lección.
- **Seed** genera 90 días de transacciones con esenciales y hormiga.

## Legal/Ética
- Coach **educativo**; sin recomendaciones de inversión específicas; evita riesgo alto.
- Si migras a producción/real: considera cumplimiento regulatorio aplicable.
