from fastapi import APIRouter, HTTPException

from .. import engine
from ..schemas import AptParams as AptParamsModel, AptRequest, AptResponse, GridPoint, GridResponse

router = APIRouter()


def build_grid(req: AptRequest) -> GridResponse:
    g = req.grid
    n = g.n
    params = engine.AptParams(
        r=req.r, lam=req.lam, lams=req.lams, lamv=req.lamv, b3=req.b3, al=req.al
    )
    points: list[GridPoint] = []
    for i in range(n):
        x = g.b1_min + (g.b1_max - g.b1_min) * i / (n - 1)
        for j in range(n):
            y = g.b2_min + (g.b2_max - g.b2_min) * j / (n - 1)
            z = engine.apt_ret(x, y, g.metric == "alpha", params)
            points.append(GridPoint(x=x, y=y, z=z))
    return GridResponse(
        n=n,
        metric=g.metric,
        points=points,
        shape=[n, n],
        x_range=[g.b1_min, g.b1_max],
        y_range=[g.b2_min, g.b2_max],
    )


@router.post("", response_model=AptResponse)
def price(req: AptRequest) -> AptResponse:
    if req.grid is not None:
        if req.grid.b1_max <= req.grid.b1_min:
            raise HTTPException(status_code=422, detail="grid.b1_max must be > grid.b1_min")
        if req.grid.b2_max <= req.grid.b2_min:
            raise HTTPException(status_code=422, detail="grid.b2_max must be > grid.b2_min")

    params = engine.AptParams(
        r=req.r, lam=req.lam, lams=req.lams, lamv=req.lamv, b3=req.b3, al=req.al
    )
    ret = engine.apt_ret(req.b1, req.b2, req.metric == "alpha", params)

    return AptResponse(
        params=AptParamsModel(
            r=req.r, lam=req.lam, lams=req.lams, lamv=req.lamv, b3=req.b3, al=req.al
        ),
        metric=req.metric,
        b1=req.b1,
        b2=req.b2,
        ret=ret,
        grid=build_grid(req) if req.grid is not None else None,
    )
