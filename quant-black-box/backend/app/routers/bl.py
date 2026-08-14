from fastapi import APIRouter

from .. import engine
from ..schemas import BlRequest, BlResponse

router = APIRouter()


@router.post("", response_model=BlResponse)
def solve(req: BlRequest) -> BlResponse:
    r = engine.bl_solve(req.tau, req.lam, req.del_, req.q1, req.q2)
    return BlResponse(
        names=engine.BL_NAMES,
        Pi=r.Pi,
        ER=r.ER,
        SigP=r.SigP,
        wStar=r.wStar,
        res1=r.res1,
        res2=r.res2,
    )
