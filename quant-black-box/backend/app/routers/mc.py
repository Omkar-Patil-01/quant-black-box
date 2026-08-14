from fastapi import APIRouter

from .. import engine
from ..schemas import McRequest, McResponse, McStatsModel

router = APIRouter()


@router.post("", response_model=McResponse)
def simulate(req: McRequest) -> McResponse:
    sim = engine.simulate_mc(
        engine.McParams(
            S0=req.S0, mu=req.mu, sig=req.sig, T=req.T, npaths=req.npaths, gam=req.gam
        )
    )
    stats = engine.mc_stats(sim, req.gam)
    return McResponse(
        params=req,
        steps=engine.MC_STEPS,
        N=sim.N,
        term=sim.term,
        paths=sim.sorted if req.include_paths else None,
        stats=McStatsModel(
            mean=stats.mean,
            median=stats.median,
            sd=stats.sd,
            var5=stats.var5,
            max=stats.max,
            min=stats.min,
            losses=stats.losses,
            mlr=stats.mlr,
            util=stats.util,
            ci95=stats.ci95,
        ),
    )
