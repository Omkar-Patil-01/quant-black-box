"""Market data proxy router — candles, quotes, options, catalog, series.

All endpoints forward to the London Strategic Edge API via the market client.
"""

from fastapi import APIRouter, HTTPException

from .. import market
from ..schemas import (
    CatalogEntry,
    CatalogResponse,
    CandlesRequest,
    CandlesResponse,
    CandleRow,
    OptionsChainResponse,
    OptionContract,
    QuoteResponse,
    SeriesResponse,
    SeriesRow,
)

router = APIRouter()


@router.get("/quote/{symbol:path}")
async def get_quote(symbol: str) -> QuoteResponse:
    """Latest price for a symbol from LSE candles."""
    try:
        row = market.get_quote(symbol)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LSE API error: {e}")
    return QuoteResponse(
        symbol=row["symbol"],
        price=row["price"],
        bid=row["bid"],
        ask=row["ask"],
        volume=row["volume"],
        timestamp=row["timestamp"],
        name=row["name"],
    )


@router.get("/candles")
async def get_candles(
    symbol: str,
    timeframe: str = "1d",
    start: str | None = None,
    end: str | None = None,
    limit: int = 500,
) -> CandlesResponse:
    """OHLCV candles from LSE vault."""
    try:
        rows = market.get_candles(symbol, timeframe, start=start, end=end, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LSE API error: {e}")
    candle_rows = []
    for r in rows:
        candle_rows.append(CandleRow(
            timestamp=r.get("timestamp", r.get("ts", r.get("datetime", ""))),
            open=r.get("open", r.get("o", 0)),
            high=r.get("high", r.get("h", 0)),
            low=r.get("low", r.get("l", 0)),
            close=r.get("close", r.get("c", 0)),
            volume=r.get("volume", r.get("v", 0)),
        ))
    return CandlesResponse(symbol=symbol, timeframe=timeframe, rows=candle_rows)


@router.get("/options/{underlying:path}")
async def get_options_chain(underlying: str) -> OptionsChainResponse:
    """Options chain with IV and Greeks from LSE."""
    try:
        rows = market.get_options_chain(underlying)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LSE API error: {e}")
    contracts = []
    for r in rows:
        contracts.append(OptionContract(
            ticker=r["ticker"],
            strike=r["strike"],
            expiry=r["expiry"],
            type=r["type"],
            price=r["price"],
            iv=r["iv"],
            delta=r["delta"],
            gamma=r["gamma"],
            theta=r["theta"],
            vega=r["vega"],
            rho=r["rho"],
            volume=r["volume"],
            premium=r["premium"],
        ))
    return OptionsChainResponse(underlying=underlying, contracts=contracts)


@router.get("/catalog")
async def get_catalog(category: str | None = None) -> CatalogResponse:
    """Instrument catalog from LSE vault."""
    try:
        rows = market.get_catalog(category)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LSE API error: {e}")
    entries = []
    for r in rows:
        entries.append(CatalogEntry(
            symbol=r["symbol"],
            name=r["name"],
            category=r["category"],
            ticks=r["ticks"],
            first=r.get("first"),
            last=r.get("last"),
        ))
    return CatalogResponse(entries=entries, total=len(entries))


@router.get("/series")
async def get_series(
    symbol: str,
    start: str | None = None,
    end: str | None = None,
    limit: int = 500,
) -> SeriesResponse:
    """Macro series or bond yield time series from LSE."""
    try:
        rows = market.get_series(symbol, start=start, end=end, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LSE API error: {e}")
    series_rows = [SeriesRow(date=r["date"], value=r["value"]) for r in rows]
    return SeriesResponse(symbol=symbol, rows=series_rows)
