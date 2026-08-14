from fastapi import APIRouter, HTTPException

from .. import engine
from ..schemas import BsParams, BsRequest, BsResponse, GridPoint, GridResponse

router = APIRouter()


def build_grid(req: BsRequest) -> GridResponse:
    n = req.grid.n
    x0, x1 = req.K * 0.4, req.K * 1.6
    y0, y1 = 0.05, 1.6
    points: list[GridPoint] = []
    for i in range(n):
        x = x0 + (x1 - x0) * i / (n - 1)
        for j in range(n):
            t = y0 + (y1 - y0) * j / (n - 1)
            m = engine.bs(x, req.K, t, req.r, req.sig)
            if m is None:
                continue
            if req.grid.metric == "price":
                z = m.C if req.opt == "call" else m.P
            else:
                z = m.delta if req.opt == "call" else m.deltaP
            points.append(GridPoint(x=x, y=t, z=z))
    return GridResponse(
        n=n,
        metric=req.grid.metric,
        points=points,
        shape=[n, n],
        x_range=[x0, x1],
        y_range=[y0, y1],
    )


@router.post("", response_model=BsResponse)
def price(req: BsRequest) -> BsResponse:
    m = engine.bs(req.S0, req.K, req.T, req.r, req.sig)
    if m is None:
        raise HTTPException(
            status_code=422, detail="Degenerate inputs: S0, K, T and sig must be positive"
        )
    grid = build_grid(req) if req.grid is not None else None
    return BsResponse(
        opt=req.opt,
        params=BsParams(S0=req.S0, K=req.K, T=req.T, r=req.r, sig=req.sig),
        C=m.C,
        P=m.P,
        delta=m.delta,
        deltaP=m.deltaP,
        gamma=m.gamma,
        vega=m.vega,
        theta=m.theta,
        rho=m.rho,
        d1=m.d1,
        d2=m.d2,
        grid=grid,
    )
