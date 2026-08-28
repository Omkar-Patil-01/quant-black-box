"""Tests for the market data proxy endpoints.

These tests mock the LSE client since we can't make real API calls in CI.
"""

from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


MOCK_QUOTE = {
    "symbol": "AAPL",
    "price": 195.50,
    "bid": 195.48,
    "ask": 195.52,
    "volume": 1234567,
    "timestamp": "2026-08-27T16:00:00",
    "name": "Apple Inc.",
}

MOCK_CANDLES = [
    {"timestamp": "2026-08-25", "open": 193.0, "high": 196.0, "low": 192.5, "close": 195.5, "volume": 50000000},
    {"timestamp": "2026-08-26", "open": 195.5, "high": 197.0, "low": 194.0, "close": 196.2, "volume": 45000000},
]

MOCK_OPTIONS = [
    {
        "ticker": "AAPL260919C00195000",
        "strike": 195.0,
        "expiry": "2026-09-19",
        "type": "call",
        "price": 8.50,
        "iv": 0.25,
        "delta": 0.52,
        "gamma": 0.03,
        "theta": -0.15,
        "vega": 0.30,
        "rho": 0.05,
        "volume": 1200,
        "premium": 10200000,
    },
]

MOCK_CATALOG = [
    {"symbol": "AAPL", "name": "Apple Inc.", "category": "stock", "ticks": 50000000, "first": "2003-01-01", "last": "2026-08-27"},
    {"symbol": "BTC/USD", "name": "Bitcoin", "category": "crypto", "ticks": 20000000, "first": "2017-01-01", "last": "2026-08-27"},
]

MOCK_SERIES = [
    {"date": "2026-01-01", "value": 4.25},
    {"date": "2026-02-01", "value": 4.30},
]


@patch("app.market.get_quote")
def test_get_quote(mock_fn):
    mock_fn.return_value = MOCK_QUOTE
    res = client.get("/api/market/quote/AAPL")
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "AAPL"
    assert body["price"] == 195.50
    assert body["name"] == "Apple Inc."
    mock_fn.assert_called_once_with("AAPL")


@patch("app.market.get_quote")
def test_get_quote_not_found(mock_fn):
    mock_fn.side_effect = ValueError("No data found for symbol: XYZ")
    res = client.get("/api/market/quote/XYZ")
    assert res.status_code == 404


@patch("app.market.get_candles")
def test_get_candles(mock_fn):
    mock_fn.return_value = MOCK_CANDLES
    res = client.get("/api/market/candles?symbol=AAPL&timeframe=1d&limit=2")
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "AAPL"
    assert body["timeframe"] == "1d"
    assert len(body["rows"]) == 2
    assert body["rows"][0]["close"] == 195.5


@patch("app.market.get_candles")
def test_get_candles_with_dates(mock_fn):
    mock_fn.return_value = MOCK_CANDLES
    res = client.get("/api/market/candles?symbol=AAPL&timeframe=1d&start=2026-08-25&end=2026-08-27")
    assert res.status_code == 200
    mock_fn.assert_called_once_with("AAPL", "1d", start="2026-08-25", end="2026-08-27", limit=500)


@patch("app.market.get_options_chain")
def test_get_options_chain(mock_fn):
    mock_fn.return_value = MOCK_OPTIONS
    res = client.get("/api/market/options/AAPL")
    assert res.status_code == 200
    body = res.json()
    assert body["underlying"] == "AAPL"
    assert len(body["contracts"]) == 1
    assert body["contracts"][0]["ticker"] == "AAPL260919C00195000"
    assert body["contracts"][0]["iv"] == 0.25


@patch("app.market.get_catalog")
def test_get_catalog(mock_fn):
    mock_fn.return_value = MOCK_CATALOG
    res = client.get("/api/market/catalog")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert body["entries"][0]["symbol"] == "AAPL"


@patch("app.market.get_catalog")
def test_get_catalog_by_category(mock_fn):
    mock_fn.return_value = MOCK_CATALOG
    res = client.get("/api/market/catalog?category=crypto")
    assert res.status_code == 200
    mock_fn.assert_called_once_with("crypto")


@patch("app.market.get_series")
def test_get_series(mock_fn):
    mock_fn.return_value = MOCK_SERIES
    res = client.get("/api/market/series?symbol=US10Y&start=2026-01-01")
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "US10Y"
    assert len(body["rows"]) == 2
    assert body["rows"][0]["value"] == 4.25


@patch("app.market.get_quote")
def test_quote_api_error(mock_fn):
    mock_fn.side_effect = Exception("Connection timeout")
    res = client.get("/api/market/quote/AAPL")
    assert res.status_code == 502
    assert "LSE API error" in res.json()["detail"]
