from fastapi import APIRouter

from .. import engine
from ..schemas import (
    GridPoint,
    GridResponse,
    HestonParams as HestonParamsModel,
    HestonRequest,
    HestonResponse,
)

router = APIRouter()


def build_grid(req: HestonRequest) -> GridResponse:
    n = req.grid.n
    x0, x1 = req.K * 0.4, req.K * 1.6
    y0, y1 = 0.05, 1.6
    params = engine.HestonParams(
        r=req.r, v0=req.v0, kappa=req.kappa, theta=req.theta, sigv=req.sigv, rho=req.rho
    )
    points: list[GridPoint] = []
    for i in range(n):
        x = x0 + (x1 - x0) * i / (n - 1)
        for j in range(n):
            t = y0 + (y1 - y0) * j / (n - 1)
            if req.grid.metric == "delta":
                d = engine.heston_p1(x, req.K, t, params)
                z = d if req.opt == "call" else d - 1.0
            else:
                mm = engine.heston_price(x, req.K, t, params)
                z = mm.C if req.opt == "call" else mm.P
            points.append(GridPoint(x=x, y=t, z=z))
    return GridResponse(
        n=n,
        metric=req.grid.metric,
        points=points,
        shape=[n, n],
        x_range=[x0, x1],
        y_range=[y0, y1],
    )


@router.post("", response_model=HestonResponse)
def price(req: HestonRequest) -> HestonResponse:
    params = engine.HestonParams(
        r=req.r, v0=req.v0, kappa=req.kappa, theta=req.theta, sigv=req.sigv, rho=req.rho
    )
    m = engine.heston_price(req.S0, req.K, req.T, params)
    return HestonResponse(
        opt=req.opt,
        params=HestonParamsModel(
            S0=req.S0, K=req.K, T=req.T, r=req.r,
            v0=req.v0, kappa=req.kappa, theta=req.theta, sigv=req.sigv, rho=req.rho,
        ),
        C=m.C,
        P=m.P,
        delta=m.delta,
        deltaP=m.deltaP,
        grid=build_grid(req) if req.grid is not None else None,
    )
