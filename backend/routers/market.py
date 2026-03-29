
import httpx
import time
from fastapi import APIRouter, Depends
from auth import get_current_user

router = APIRouter()

# Cache market data for 5 minutes
_market_cache = {"data": None, "ts": 0}
CACHE_TTL = 300


async def _fetch_crypto():
    """Bitcoin + Ethereum from CoinGecko — free, no key."""
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        "?ids=bitcoin,ethereum"
        "&vs_currencies=usd"
        "&include_24hr_change=true"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        results = []
        mapping = [
            ("bitcoin",     "Bitcoin",   "BTC"),
            ("ethereum",    "Ethereum",  "ETH"),
        ]
        for cg_id, name, short in mapping:
            info = data.get(cg_id, {})
            price  = info.get("usd", 0)
            change = info.get("usd_24h_change", 0)
            results.append({
                "symbol":      cg_id,
                "name":        name,
                "short":       short,
                "current":     round(price, 2),
                "change":      round(price * change / 100, 2),
                "change_pct":  round(change, 2),
                "commentary":  f"{name} {'rose' if change >= 0 else 'fell'} {abs(change):.2f}% in the last 24h.",
                "is_positive": change >= 0,
            })
        return results
    except Exception as e:
        print(f"[MARKET] CoinGecko error: {e}")
        return []


async def _fetch_metals():
    """Real Gold, Silver, and Platinum from gold-api.com — free, no key."""
    results = []
    metals = [
        ("XAU", "Gold", "Gold (Oz)"),
        ("XAG", "Silver", "Silver (Oz)"),
        ("XPT", "Platinum", "Platinum (Oz)"),
    ]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for symbol, name, short in metals:
                r = await client.get(f"https://api.gold-api.com/price/{symbol}")
                if r.status_code == 200:
                    data = r.json()
                    price = data.get("price", 0)
                    if price:
                        results.append({
                            "symbol":      symbol,
                            "name":        name,
                            "short":       short,
                            "current":     round(price, 2),
                            "change":      0,
                            "change_pct":  0,
                            "commentary":  f"Spot {name.lower()} price: ${round(price, 2)}/oz.",
                            "is_positive": True,
                        })
    except Exception as e:
        print(f"[MARKET] Gold-API error: {e}")
    return results


async def _fetch_usd_inr():
    """USD/INR from open exchangerate API — free, no key."""
    url = "https://open.er-api.com/v6/latest/USD"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        inr = data.get("rates", {}).get("INR", 0)
        if not inr:
            return None
        return {
            "symbol":      "USDINR",
            "name":        "USD/INR",
            "short":       "USD/INR",
            "current":     round(inr, 2),
            "change":      0,
            "change_pct":  0,
            "commentary":  f"1 USD = ₹{inr:.2f}",
            "is_positive": True,
        }
    except Exception as e:
        print(f"[MARKET] Exchange rate error: {e}")
        return None


@router.get("")
async def get_market_data(current_user: dict = Depends(get_current_user)):
    now = time.time()
    if _market_cache["data"] and now - _market_cache["ts"] < CACHE_TTL:
        return _market_cache["data"]

    results = []

    # Fetch in parallel
    crypto = await _fetch_crypto()
    usd_inr = await _fetch_usd_inr()
    metals = await _fetch_metals()

    if usd_inr:
        results.append(usd_inr)
    results.extend(crypto)
    results.extend(metals)

    if not results:
        results = [
            {"symbol": "N/A", "name": "Market Data", "short": "N/A",
             "current": 0, "change": 0, "change_pct": 0,
             "commentary": "Unable to fetch market data. Try again later.",
             "is_positive": True},
        ]

    response = {"indices": results, "updated_at": int(now)}
    if any(r["current"] > 0 for r in results):
        _market_cache["data"] = response
        _market_cache["ts"] = now
    return response
