from typing import Any, Literal

from pydantic import BaseModel, Field


# ────────────── Grid (shared) ──────────────


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


# ══════════════════════════════════════════════════════════
# WORKSPACE SCHEMAS
# ══════════════════════════════════════════════════════════


class FavoriteConfig(BaseModel):
    modelIds: list[str] = ["bs", "heston", "bl", "mc", "apt"]


class ScenarioConfig(BaseModel):
    id: str
    name: str
    modelId: str
    description: str | None = None
    createdAt: str
    updatedAt: str
    parameters: dict[str, Any] = {}
    tags: list[str] = []


class ParameterPreset(BaseModel):
    id: str
    name: str
    modelId: str
    parameters: dict[str, Any] = {}
    tags: list[str] = []
    createdAt: str


class ModelExecutionSnapshot(BaseModel):
    runId: str
    timestamp: str
    runtimeMs: float
    modelId: str
    scenarioName: str
    inputs: dict[str, Any] = {}
    outputsSummary: dict[str, float] = {}


class WorkspaceState(BaseModel):
    version: str = "1.0.0"
    activeModelId: str | None = None
    activeScenarioId: str | None = None
    lastUpdated: str = ""
    favorites: FavoriteConfig = FavoriteConfig()
    scenarios: dict[str, ScenarioConfig] = {}
    recentRuns: list[ModelExecutionSnapshot] = []
    presets: dict[str, ParameterPreset] = {}
    deletedScenarios: dict[str, ScenarioConfig] = {}
    lastModelParams: dict[str, Any] | None = None


class ScenarioCreateRequest(BaseModel):
    name: str
    modelId: str
    parameters: dict[str, Any] = {}
    tags: list[str] = []
    description: str | None = None


class ScenarioUpdateRequest(BaseModel):
    name: str | None = None
    tags: list[str] | None = None
    parameters: dict[str, Any] | None = None
    description: str | None = None


class PresetCreateRequest(BaseModel):
    name: str
    modelId: str
    parameters: dict[str, Any] = {}
    tags: list[str] = []


class RunRecordRequest(BaseModel):
    modelId: str
    scenarioName: str = "Live"
    inputs: dict[str, Any] = {}
    outputsSummary: dict[str, float] = {}
    runtimeMs: float = 0


class FavoritesUpdateRequest(BaseModel):
    modelIds: list[str]


# ══════════════════════════════════════════════════════════
# MARKET DATA SCHEMAS (London Strategic Edge)
# ══════════════════════════════════════════════════════════


class CandleRow(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class CandlesRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    start: str | None = None
    end: str | None = None
    limit: int = Field(default=500, ge=1, le=5000)


class CandlesResponse(BaseModel):
    symbol: str
    timeframe: str
    rows: list[CandleRow]


class QuoteResponse(BaseModel):
    symbol: str
    price: float
    bid: float
    ask: float
    volume: float
    timestamp: str
    name: str


class OptionContract(BaseModel):
    ticker: str
    strike: float
    expiry: str
    type: str
    price: float
    iv: float
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    volume: int
    premium: float


class OptionsChainResponse(BaseModel):
    underlying: str
    contracts: list[OptionContract]


class CatalogEntry(BaseModel):
    symbol: str
    name: str
    category: str
    ticks: int
    first: str | None = None
    last: str | None = None


class CatalogResponse(BaseModel):
    entries: list[CatalogEntry]
    total: int


class SeriesRow(BaseModel):
    date: str
    value: float


class SeriesResponse(BaseModel):
    symbol: str
    rows: list[SeriesRow]
