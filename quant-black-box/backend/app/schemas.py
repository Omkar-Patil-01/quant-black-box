from typing import Literal

from pydantic import BaseModel, Field


class GridRequest(BaseModel):
    n: int = Field(default=26, ge=2, le=120)
    metric: Literal["price", "delta"] = "price"


class GridPoint(BaseModel):
    x: float
    y: float
    z: float


class GridResponse(BaseModel):
    n: int
    metric: str
    points: list[GridPoint]
    shape: list[int]
    x_range: list[float]
    y_range: list[float]


# ────────────── Black-Scholes ──────────────


class BsParams(BaseModel):
    S0: float = Field(gt=0)
    K: float = Field(gt=0)
    T: float = Field(gt=0)
    r: float
    sig: float = Field(gt=0)


class BsRequest(BsParams):
    opt: Literal["call", "put"] = "call"
    grid: GridRequest | None = None


class BsResponse(BaseModel):
    opt: str
    params: BsParams
    C: float
    P: float
    delta: float
    deltaP: float
    gamma: float
    vega: float
    theta: float
    rho: float
    d1: float
    d2: float
    grid: GridResponse | None = None


# ────────────── Heston ──────────────


class HestonParams(BaseModel):
    S0: float = Field(gt=0)
    K: float = Field(gt=0)
    T: float = Field(gt=0)
    r: float
    v0: float = Field(ge=0)
    kappa: float = Field(ge=0)
    theta: float = Field(ge=0)
    sigv: float = Field(ge=0)
    rho: float = Field(ge=-1, le=1)


class HestonRequest(HestonParams):
    opt: Literal["call", "put"] = "call"
    grid: GridRequest | None = None


class HestonResponse(BaseModel):
    opt: str
    params: HestonParams
    C: float
    P: float
    delta: float
    deltaP: float
    grid: GridResponse | None = None


# ────────────── Black-Litterman ──────────────


class BlRequest(BaseModel):
    tau: float = Field(gt=0)
    lam: float
    del_: float = Field(gt=0, alias="del")
    q1: float
    q2: float


class BlResponse(BaseModel):
    names: list[str]
    Pi: list[float]
    ER: list[float]
    SigP: list[list[float]]
    wStar: list[float]
    res1: float
    res2: float


# ────────────── Monte Carlo ──────────────


class McRequest(BaseModel):
    S0: float = Field(gt=0)
    mu: float
    sig: float = Field(gt=0)
    T: float = Field(gt=0)
    npaths: int = Field(ge=1, le=10000)
    gam: float
    include_paths: bool = True


class McStatsModel(BaseModel):
    mean: float
    median: float
    sd: float
    var5: float
    max: float
    min: float
    losses: float
    mlr: float
    util: float
    ci95: float


class McResponse(BaseModel):
    params: McRequest
    steps: int
    N: int
    term: list[float]
    paths: list[list[float]] | None = None
    stats: McStatsModel


# ────────────── APT ──────────────


class AptParams(BaseModel):
    r: float
    lam: float
    lams: float
    lamv: float
    b3: float
    al: float


class AptGridRequest(BaseModel):
    n: int = Field(default=30, ge=2, le=120)
    b1_min: float = 0.0
    b1_max: float = 2.0
    b2_min: float = -1.0
    b2_max: float = 1.0
    metric: Literal["fair", "alpha"] = "fair"


class AptRequest(AptParams):
    metric: Literal["fair", "alpha"] = "fair"
    b1: float = 1.0
    b2: float = 0.5
    grid: AptGridRequest | None = None


class AptResponse(BaseModel):
    params: AptParams
    metric: str
    b1: float
    b2: float
    ret: float
    grid: GridResponse | None = None
