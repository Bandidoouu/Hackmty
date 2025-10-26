
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from app.config import settings
from app.database import init_models
from app.routers import auth, nessie, gemini

app = FastAPI(title="FinCoach API", openapi_url="/openapi.json", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_models()

app.include_router(auth.router)
app.include_router(nessie.router)
app.include_router(gemini.router)

@app.get("/health")
def health():
    return {"status": "ok"}

FRONT_DIR = settings.frontend_dir
# normalize possible relative path from env to an absolute path
if FRONT_DIR and not os.path.isabs(FRONT_DIR):
    # assume env path is relative to the backend folder (one level up from app)
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    FRONT_DIR = os.path.abspath(os.path.join(base, FRONT_DIR))

if os.path.isdir(FRONT_DIR):
    app.mount("/_static", StaticFiles(directory=FRONT_DIR), name="static-front")

    @app.get("/")
    def index():
        index_path = os.path.join(FRONT_DIR, "index.html")
        return FileResponse(index_path)
else:
    # fallback: do not mount but expose a helpful root message
    @app.get("/")
    def index_missing():
        return {"error": "frontend not found", "frontend_dir": FRONT_DIR}
