from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import apt, bl, bs, heston, mc

app = FastAPI(
    title="Quant Black Box API",
    description="REST backend for the quant-black-box models. Reuses the same "
    "math as the frontend (src/lib/math.ts), ported to Python.",
    version="0.1.0",
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
]


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "service": "quant-black-box-api",
        "models": [m["id"] for m in MODELS],
    }


@app.get("/api/models", tags=["meta"])
def models() -> list[dict]:
    return MODELS
