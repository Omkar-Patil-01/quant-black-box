from fastapi import APIRouter

from .. import engine
from ..schemas import KfRequest, KfResponse, KfTickResult

router = APIRouter()


@router.post("", response_model=KfResponse)
def solve(req: KfRequest) -> KfResponse:
    p = engine.KfParams(
        n=req.n, m=req.m, Q=req.Q, R=req.R, nDays=req.nDays, seed=req.seed,
    )
    ticks = engine.kalman_filter(p)
    return KfResponse(ticks=[
        KfTickResult(
            step=t.step,
            trueState=t.trueState,
            observation=t.observation,
            filteredState=t.filteredState,
            stateCovDiag=t.stateCovDiag,
            innovation=t.innovation,
            kalmanGain=t.kalmanGain,
            traceP=t.traceP,
        )
        for t in ticks
    ])
