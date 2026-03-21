import yfinance as yf
import asyncio
import time
from fastapi import APIRouter, Depends
from auth import get_current_user
from llm import ask_llm
from ingestion import search_articles

router = APIRouter()

INDICES = [
    {"symbol": "^BSESN",  "name": "Sensex",   "short": "BSE Sensex"},
    {"symbol": "^NSEI",   "name": "Nifty 50",  "short": "Nifty 50"},
    {"symbol": "USDINR=X","name": "USD/INR",   "short": "USD/INR"},
    {"symbol": "GC=F",    "name": "Gold",      "short": "Gold"},
]

# Cache market data for 5 minutes
_market_cache = {"data": None, "ts": 0}
CACHE_TTL = 300  # 5 minutes


def fetch_ticker(symbol: str) -> dict:
    try:
        t    = yf.Ticker(symbol)
        info = t.fast_info
        return {
            "current": round(float(info.last_price), 2),
            "open":    round(float(info.open), 2),
            "change":  round(float(info.last_price - info.open), 2),
            "change_pct": round(
                float((info.last_price - info.open) / info.open * 100), 2
            ),
        }
    except Exception:
        return {"current": 0, "open": 0, "change": 0, "change_pct": 0}


async def get_market_commentary(index_name: str, change_pct: float) -> str:
    direction = "rose" if change_pct > 0 else "fell"
    articles  = await search_articles(f"{index_name} market today", n=3)
    context   = "\n".join([a.get("summary", "") for a in articles])
    prompt = (
        f"{index_name} {direction} {abs(change_pct):.2f}% today. "
        f"Using only this context, explain why in one sentence (max 20 words): "
        f"{context}"
    )
    try:
        return await ask_llm(prompt)
    except Exception:
        return f"{index_name} moved {change_pct:+.2f}% today."


@router.get("")
async def get_market_data(current_user: dict = Depends(get_current_user)):
    now = time.time()
    if _market_cache["data"] and now - _market_cache["ts"] < CACHE_TTL:
        return _market_cache["data"]

    results = []
    for idx in INDICES:
        data = fetch_ticker(idx["symbol"])
        commentary = await get_market_commentary(
            idx["name"], data["change_pct"]
        )
        results.append({
            "symbol":      idx["symbol"],
            "name":        idx["name"],
            "short":       idx["short"],
            "current":     data["current"],
            "change":      data["change"],
            "change_pct":  data["change_pct"],
            "commentary":  commentary,
            "is_positive": data["change_pct"] >= 0,
        })

    response = {"indices": results, "updated_at": int(now)}
    _market_cache["data"] = response
    _market_cache["ts"]   = now
    return response
