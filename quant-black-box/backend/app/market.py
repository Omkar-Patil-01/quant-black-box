"""London Strategic Edge market data client.

Wraps the lse-data Python SDK to fetch candles, quotes, options chains,
catalog entries, and macro series. Authenticates with the LSE_API_KEY
environment variable.
"""

import os
from datetime import datetime, timezone


def _get_client():
    """Lazy-import and instantiate the LSE client."""
    from lse import LSE

    api_key = os.environ.get("LSE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "LSE_API_KEY not set. Add it to backend/.env or your environment. "
            "Get a key at https://londonstrategicedge.com/data"
        )
    return LSE(api_key=api_key)


def get_candles(
    symbol: str,
    timeframe: str = "1d",
    start: str | None = None,
    end: str | None = None,
    limit: int = 500,
) -> list[dict]:
    """Fetch OHLCV candles from the LSE vault."""
    client = _get_client()
    rows = client.candles(
        symbol,
        timeframe,
        start=start,
        end=end,
        limit=limit,
        order="asc",
    )
    return rows


def get_quote(symbol: str) -> dict:
    """Get the latest price for a symbol.

    Fetches the most recent candle and extracts the close price.
    """
    client = _get_client()
    rows = client.candles(symbol, "1d", limit=1, order="desc")
    if not rows:
        raise ValueError(f"No data found for symbol: {symbol}")
    row = rows[-1]
    return {
        "symbol": symbol,
        "price": row.get("close", row.get("c", 0)),
        "bid": row.get("bid", row.get("b", 0)),
        "ask": row.get("ask", row.get("a", 0)),
        "volume": row.get("volume", row.get("v", 0)),
        "timestamp": row.get("timestamp", row.get("ts", row.get("datetime", ""))),
        "name": row.get("name", symbol),
    }


def get_options_chain(underlying: str) -> list[dict]:
    """Fetch the options chain for an underlying with IV and Greeks."""
    client = _get_client()
    rows = client.options(underlying)
    contracts = []
    for r in rows:
        contracts.append({
            "ticker": r.get("ticker", ""),
            "strike": r.get("strike", 0),
            "expiry": r.get("expiry", r.get("expiration", "")),
            "type": r.get("type", r.get("call_put", "")),
            "price": r.get("price", r.get("last", 0)),
            "iv": r.get("iv", r.get("implied_volatility", 0)),
            "delta": r.get("delta", 0),
            "gamma": r.get("gamma", 0),
            "theta": r.get("theta", 0),
            "vega": r.get("vega", 0),
            "rho": r.get("rho", 0),
            "volume": int(r.get("volume", 0)),
            "premium": r.get("premium", 0),
        })
    return contracts


def get_catalog(category: str | None = None) -> list[dict]:
    """List available instruments from the vault catalog."""
    client = _get_client()
    rows = client.catalog(category) if category else client.catalog()
    entries = []
    for r in rows:
        entries.append({
            "symbol": r.get("symbol", ""),
            "name": r.get("name", ""),
            "category": r.get("category", ""),
            "ticks": r.get("ticks", 0),
            "first": r.get("first"),
            "last": r.get("last"),
        })
    return entries


def get_series(
    symbol: str,
    start: str | None = None,
    end: str | None = None,
    limit: int = 500,
) -> list[dict]:
    """Fetch a macro series or bond yield time series."""
    client = _get_client()
    rows = client.series(symbol, start=start, end=end, limit=limit, order="asc")
    result = []
    for r in rows:
        date_val = r.get("date", r.get("datetime", r.get("ts", "")))
        value_val = r.get("value", r.get("v", 0))
        result.append({"date": str(date_val), "value": float(value_val)})
    return result
