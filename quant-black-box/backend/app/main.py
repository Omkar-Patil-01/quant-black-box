from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .routers import apt, bl, bs, heston, kf, mc, market, workspace

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    yield


app = FastAPI(
    title="Quant Black Box API",
    description="REST backend for the quant-black-box models. Reuses the same "
    "math as the frontend (src/lib/math.ts), ported to Python. "
    "Workspace persistence via SQLite. Market data from London Strategic Edge.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bs.router, prefix="/api/bs", tags=["black-scholes"])
app.include_router(heston.router, prefix="/api/heston", tags=["heston"])
app.include_router(bl.router, prefix="/api/bl", tags=["black-litterman"])
app.include_router(mc.router, prefix="/api/mc", tags=["monte-carlo"])
app.include_router(apt.router, prefix="/api/apt", tags=["apt"])
app.include_router(kf.router, prefix="/api/kf", tags=["kalman-filter"])
app.include_router(workspace.router, prefix="/api/workspace", tags=["workspace"])
app.include_router(market.router, prefix="/api/market", tags=["market-data"])

MODELS = [
    {
        "id": "bs",
        "name": "Black-Scholes-Merton Option Pricing",
        "method": "Closed-form (BSM)",
        "endpoint": "/api/bs",
    },
    {
        "id": "heston",
        "name": "Heston Stochastic Volatility",
        "method": "Characteristic function + Simpson quadrature",
        "endpoint": "/api/heston",
    },
    {
        "id": "bl",
        "name": "Black-Litterman Model",
        "method": "Matrix Bayesian update",
        "endpoint": "/api/bl",
    },
    {
        "id": "mc",
        "name": "Monte Carlo Portfolio Simulation",
        "method": "Seeded GBM (Mulberry32), 60 steps",
        "endpoint": "/api/mc",
    },
    {
        "id": "apt",
        "name": "Arbitrage Pricing Theory",
        "method": "Linear multi-factor model",
        "endpoint": "/api/apt",
    },
    {
        "id": "kf",
        "name": "Kalman Filter",
        "method": "Recursive state-space estimation",
        "endpoint": "/api/kf",
    },
]


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "service": "quant-black-box-api",
        "models": [m["id"] for m in MODELS],
        "features": ["workspace", "market-data"],
    }


@app.get("/api/models", tags=["meta"])
def models() -> list[dict]:
    return MODELS
