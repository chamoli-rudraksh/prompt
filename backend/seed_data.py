"""
seed_data.py — Populate the ET NewsAI database and vector stores with
realistic mock data for the hackathon demo video.

Usage:
    cd backend
    python seed_data.py

Creates 21 articles across three demo scenario clusters:
  Cluster A (12) – Union Budget 2026 story arc
  Cluster B (1)  – Breaking bankruptcy (vernacular audio demo)
  Cluster C (8)  – Persona-feed variety (trader / cfo / founder / student)
"""

import asyncio
import hashlib
import json
import os
import sys
from datetime import datetime, timezone, timedelta

# ── Make sure imports resolve when running standalone ────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Disable ChromaDB telemetry before import
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from database import init_db, save_article, mark_embedded
from embeddings import get_embedding

import chromadb
from chromadb.config import Settings

# ── Helpers ──────────────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc)


def _ts(hours_ago: float = 0, minutes_ago: float = 0) -> str:
    """Return an ISO timestamp offset from *now*."""
    return (NOW - timedelta(hours=hours_ago, minutes=minutes_ago)).isoformat()


def _id(url: str) -> str:
    """Deterministic article ID — same logic as ingestion.py."""
    return hashlib.md5(url.encode()).hexdigest()


# ═════════════════════════════════════════════════════════════════════════════
#  CLUSTER A — Union Budget 2026 Story Arc  (12 articles, last 5 days)
# ═════════════════════════════════════════════════════════════════════════════

CLUSTER_A = [
    # ── Macro Policy (3) ─────────────────────────────────────────────────────
    {
        "url": "https://demo.etnewsai.com/budget-2026-fiscal-deficit-target",
        "title": "Union Budget 2026: Government Pegs Fiscal Deficit at 4.4% of GDP, Signals Consolidation Path",
        "content": (
            "Finance Minister Nirmala Sitharaman on Tuesday presented the Union Budget 2026-27, "
            "setting the fiscal deficit target at 4.4 percent of GDP, down from the revised estimate "
            "of 4.8 percent in the previous year. The budgetary math relies on robust GST collections "
            "projected at Rs 11.2 lakh crore and a disinvestment target of Rs 65,000 crore through "
            "strategic stake sales in BPCL, Shipping Corporation, and IDBI Bank. Capital expenditure "
            "has been raised to Rs 12.5 lakh crore, marking a 17 percent increase year-on-year. "
            "Economists at Goldman Sachs and Nomura termed the deficit glide-path 'credible but ambitious', "
            "noting that any global oil shock could derail assumptions. The budget also proposes "
            "amendments to the FRBM Act to institutionalize a debt-to-GDP anchor of 55 percent by 2031. "
            "Revenue expenditure growth has been capped at 8.2 percent, with subsidies on food and "
            "fertilizer seeing a combined trim of Rs 18,000 crore. Market participants reacted positively, "
            "with the 10-year G-Sec yield falling 7 basis points to 6.88 percent immediately after the "
            "speech. The RBI is expected to align its April monetary policy with the government's "
            "consolidation stance, potentially opening room for a 25 bps rate cut."
        ),
        "summary": "The Union Budget 2026-27 targets a fiscal deficit of 4.4% of GDP with capex rising 17% to Rs 12.5 lakh crore. Bond yields fell sharply as markets welcomed the consolidation roadmap.",
        "source": "ET Bureau",
        "published_at": _ts(hours_ago=6),
        "topics": ["budget", "economy", "policy", "markets"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-tax-reforms",
        "title": "Budget 2026: New Tax Regime Gets Sweeter — Standard Deduction Raised to Rs 1 Lakh, Slabs Widened",
        "content": (
            "In a major push to simplify direct taxation, the Union Budget 2026-27 has raised the "
            "standard deduction under the new tax regime from Rs 75,000 to Rs 1,00,000 and widened "
            "slabs so income up to Rs 12 lakh is effectively tax-free after rebates. The revenue "
            "foregone is estimated at Rs 42,000 crore, which the government expects to recover through "
            "improved compliance and the expanded tax base from the Annual Information Statement (AIS) "
            "integration. Experts say the move will boost disposable income for the salaried middle class "
            "by approximately Rs 17,500 annually, potentially lifting FMCG and discretionary consumer "
            "spending. Meanwhile, the old regime has been left untouched, accelerating the planned migration. "
            "The new concessional corporate tax rate for fresh manufacturing investments has been extended "
            "to March 2028, aiming to attract ₹4 lakh crore in domestic capex commitments. Long-term "
            "capital gains tax on equity remains at 12.5 percent, quashing rumors of a hike."
        ),
        "summary": "Budget 2026 raises the standard deduction to Rs 1 lakh and makes income up to Rs 12 lakh tax-free under the new regime. The revenue impact of Rs 42,000 crore will be offset by compliance gains.",
        "source": "Economic Times",
        "published_at": _ts(hours_ago=8),
        "topics": ["budget", "policy", "economy"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-capex-infrastructure",
        "title": "Infrastructure Push: Budget Allocates Record Rs 12.5 Lakh Crore for Capital Expenditure",
        "content": (
            "The Union Budget 2026-27 has doubled down on infrastructure with a record Rs 12.5 lakh crore "
            "allocation for capital expenditure, a 17 percent jump over the previous year. Key sectors "
            "receiving enhanced outlays include railways (Rs 3.1 lakh crore), national highways (Rs 2.8 "
            "lakh crore), and urban metro expansions (Rs 45,000 crore). The government has also introduced "
            "a ₹50,000 crore viability gap funding (VGF) window for public-private partnerships in "
            "logistics parks and cold-chain infrastructure. Finance Secretary TV Somanathan noted that "
            "the capex multiplier effect is estimated at 2.5x, which should add 0.6 percentage points "
            "to GDP growth in FY27. Construction and capital goods stocks surged 3–5 percent in afternoon "
            "trade, with Larsen & Toubro, Ultratech Cement, and KNR Constructions hitting 52-week highs. "
            "Analysts at Jefferies upgraded the Indian infrastructure sector to 'Overweight', projecting "
            "order-book growth of 22 percent for listed EPC firms."
        ),
        "summary": "Budget 2026 allocates a record Rs 12.5 lakh crore capex with major boosts to railways and highways. Infrastructure stocks rallied sharply as analysts upgraded the sector.",
        "source": "Mint",
        "published_at": _ts(hours_ago=18),
        "topics": ["budget", "economy", "policy", "markets"],
    },

    # ── Sector Winners: IT & Auto (3) ────────────────────────────────────────
    {
        "url": "https://demo.etnewsai.com/budget-2026-it-sector-impact",
        "title": "IT Sector Gets Budget Boost: TDS Reforms and Digital India 3.0 Push Lift Tech Stocks",
        "content": (
            "The Union Budget's Digital India 3.0 allocation of Rs 28,000 crore and the removal of the "
            "equalisation levy on digital advertising have sent IT sector stocks surging. Infosys rose "
            "4.2 percent, TCS gained 3.1 percent, and mid-cap IT names like Persistent Systems and "
            "Coforge rallied over 6 percent. The government also announced a ₹5,000 crore AI Mission "
            "fund to build sovereign compute capacity, including 10,000+ GPU clusters to be hosted at "
            "data centers in Hyderabad and Pune. TDS on freelancer payments above Rs 50,000 has been "
            "reduced from 10 percent to 2 percent, a move that directly benefits India's 25-million-strong "
            "gig economy workforce. NASSCOM President Debjani Ghosh called the budget 'a strong endorsement "
            "of India's digital ambitions' and predicted that the AI Mission fund could catalyse $15 billion "
            "in private AI investment over three years. The removal of customs duty on semiconductor "
            "manufacturing equipment is expected to accelerate fab construction timelines."
        ),
        "summary": "Budget 2026's Digital India 3.0 push and AI Mission fund lifted IT stocks sharply, with Infosys and TCS rallying. The removal of equalisation levy and reduced freelancer TDS were welcomed by the tech industry.",
        "source": "Economic Times",
        "published_at": _ts(hours_ago=10),
        "topics": ["budget", "technology", "markets", "policy"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-auto-sector-ev-push",
        "title": "Auto Stocks Rev Up: Budget Extends FAME III Subsidies, Cuts EV Battery Import Duty to Zero",
        "content": (
            "The automobile sector emerged as a clear winner from Budget 2026 with the extension of "
            "FAME III subsidies for electric two-wheelers and three-wheelers until March 2028, along "
            "with a complete elimination of customs duty on lithium-ion battery cells. Tata Motors "
            "surged 5.8 percent, M&M gained 4.3 percent, and EV-focused Ola Electric jumped 11 percent "
            "intraday. The budget also launched a Rs 10,000 crore 'Green Mobility Fund' to support "
            "state transport corporations in converting diesel bus fleets to electric. Industry body SIAM "
            "projected that these measures could push India's EV penetration from 6 percent to 15 percent "
            "by FY29. Scrappage policy incentives were also enhanced, with the budget offering a 25 percent "
            "rebate on road tax for new vehicle purchases upon scrapping vehicles older than 15 years. "
            "Analysts at CLSA noted that margin expansion of 150-200bps is likely for OEMs sourcing "
            "battery cells domestically."
        ),
        "summary": "Budget 2026 extends FAME III subsidies and eliminates duty on EV battery cells, sending auto stocks soaring. A Rs 10,000 crore Green Mobility Fund targets conversion of diesel bus fleets.",
        "source": "MoneyControl",
        "published_at": _ts(hours_ago=12),
        "topics": ["budget", "markets", "energy", "policy"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-pharma-healthcare",
        "title": "Healthcare Gets Rs 96,000 Crore Allocation; Pharma Sector Eyes PLI Extension",
        "content": (
            "Union Budget 2026-27 has allocated Rs 96,000 crore for healthcare, a 19 percent increase, "
            "with a special emphasis on expanding Ayushman Bharat coverage to include all senior citizens "
            "above 60 years regardless of income. The Production-Linked Incentive (PLI) scheme for "
            "pharmaceuticals has been extended by two years with an additional outlay of Rs 8,500 crore "
            "focused on biosimilars and complex generics. Sun Pharma, Dr Reddy's, and Divi's Laboratories "
            "gained between 2.5 to 4 percent as markets priced in the extended incentive window. "
            "The budget also announced 200 new 'Atal Jan Arogya Kendras' in Tier-3 cities to bridge the "
            "primary healthcare gap. Medical device imports have seen duty increases from 7.5 to 15 percent "
            "to encourage domestic manufacturing, benefiting companies like Meril Life Sciences and "
            "Trivitron Healthcare. Health insurance premium deductions under Section 80D have been raised "
            "from Rs 25,000 to Rs 40,000 for individuals and Rs 50,000 to Rs 75,000 for senior citizens."
        ),
        "summary": "Healthcare allocation rises 19% to Rs 96,000 crore in Budget 2026 with Ayushman Bharat expansion. Pharma stocks rallied on the extended PLI scheme for biosimilars.",
        "source": "ET Bureau",
        "published_at": _ts(hours_ago=14),
        "topics": ["budget", "policy", "corporate"],
    },

    # ── Market Reactions (3) ──────────────────────────────────────────────────
    {
        "url": "https://demo.etnewsai.com/budget-2026-sensex-nifty-rally",
        "title": "Sensex Surges 1,100 Points, Nifty Crosses 25,000 as Budget Fuels Bull Run",
        "content": (
            "Indian equity benchmarks posted their biggest budget-day rally in five years, with the BSE "
            "Sensex gaining 1,127 points (1.4%) to close at 82,540 and the Nifty 50 finishing at 25,112, "
            "up 342 points. Broad-based buying was led by financials, infrastructure, and auto stocks. "
            "Bank Nifty surged 2.1 percent as the budget's fiscal prudence reinforced expectations of "
            "an RBI rate cut in April. Foreign institutional investors (FIIs) turned net buyers for the "
            "first time in eight sessions, purchasing Rs 4,200 crore worth of equities. The India VIX "
            "fell 18 percent to 12.3, indicating sharply reduced uncertainty. Market breadth was "
            "overwhelmingly positive with 2,847 advances against 612 declines on the BSE. Options data "
            "showed aggressive put writing at the 24,800 strike, suggesting strong support. Analysts at "
            "Morgan Stanley raised their Nifty year-end target to 27,500, citing the budget's 'growth-plus-"
            "consolidation' narrative as a structural positive for risk assets."
        ),
        "summary": "Sensex surged 1,127 points and Nifty crossed 25,000 in the biggest budget-day rally in five years. FIIs turned net buyers and India VIX crashed 18% as uncertainty evaporated.",
        "source": "Economic Times",
        "published_at": _ts(hours_ago=5),
        "topics": ["markets", "budget", "banking"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-bond-market-reaction",
        "title": "Bond Market Cheers Budget: 10-Year Yield Falls Below 6.9% on Fiscal Discipline",
        "content": (
            "The Indian government bond market rallied sharply post-budget, with the benchmark 10-year "
            "G-Sec yield falling 12 basis points to 6.85 percent — its lowest level since November 2023. "
            "The rally was driven by the government's lower-than-expected gross borrowing program of "
            "Rs 14.8 lakh crore for FY27, significantly below Street estimates of Rs 16 lakh crore. "
            "Bond dealers reported heavy buying from provident funds and insurance companies, with "
            "secondary market volumes touching Rs 48,000 crore, nearly double the daily average. The "
            "RBI's indication that it would conduct OMO purchases worth Rs 1.5 lakh crore further "
            "supported sentiment. Corporate bond spreads tightened by 8-10 bps across the AAA curve. "
            "Global rating agency S&P noted that 'India's fiscal consolidation trajectory puts it on "
            "a credible path toward an investment-grade upgrade within 18-24 months'. Gilt funds saw "
            "inflows of Rs 2,800 crore on budget day alone."
        ),
        "summary": "The 10-year G-Sec yield fell to 6.85%, its lowest since November 2023, as the budget's disciplined borrowing program surprised positively. S&P hinted at a potential upgrade within 18-24 months.",
        "source": "Bloomberg Quint",
        "published_at": _ts(hours_ago=7),
        "topics": ["markets", "budget", "economy", "banking"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-rupee-forex-impact",
        "title": "Rupee Strengthens Past 83 Mark Against Dollar as Budget Boosts Forex Sentiment",
        "content": (
            "The Indian rupee appreciated 38 paise to breach the 83-per-dollar level, closing at 82.87 "
            "on budget day, its strongest level in four months. The currency was buoyed by strong FII "
            "equity inflows and a sharp improvement in India's sovereign risk profile following the "
            "budget's fiscal consolidation commitment. Forex dealers noted heavy dollar selling by "
            "exporters looking to lock in rates ahead of expected further rupee appreciation. The RBI "
            "was seen building reserves on the bid side, with forex reserves now estimated at $685 "
            "billion, an all-time high. Emerging market strategists at JPMorgan upgraded the rupee to "
            "'Overweight' in their model portfolio, projecting it could reach 81 per dollar by year-end "
            "on improving current account dynamics. The budget's import duty rationalization — reducing "
            "customs tariffs on 45 items — is expected to compress the trade deficit by $8-10 billion "
            "annually, providing structural support to the currency."
        ),
        "summary": "The rupee strengthened past 83/dollar to a four-month high on budget-driven FII inflows and fiscal discipline. JPMorgan projects it could reach 81/dollar by year-end.",
        "source": "Mint",
        "published_at": _ts(hours_ago=5),
        "topics": ["markets", "economy", "rbi", "budget"],
    },

    # ── Expert / Contrarian Commentary (3) ────────────────────────────────────
    {
        "url": "https://demo.etnewsai.com/budget-2026-raghuram-rajan-critique",
        "title": "Raghuram Rajan Warns Budget's Growth Assumptions Are 'Dangerously Optimistic'",
        "content": (
            "Former RBI Governor Raghuram Rajan has cautioned that the Union Budget 2026-27's revenue "
            "projections are predicated on nominal GDP growth of 10.5 percent, which he termed 'dangerously "
            "optimistic' given global headwinds. Speaking at a Brookings India forum, Rajan pointed out "
            "that the budget assumes GST buoyancy of 1.18, which has historically been achieved only once "
            "in the past five years. 'The numbers look good on paper, but one global recession or oil "
            "spike and the entire consolidation math unravels,' he cautioned. Rajan also criticized the "
            "minimal increase in education spending (7%) versus defence (11%), calling it a 'misalignment "
            "of priorities for a country that needs to invest in human capital'. However, he praised the "
            "capex push and the FRBM amendments, calling them 'long overdue institutional reforms'. "
            "His comments triggered a brief social media debate between supporters citing India's growth "
            "resilience and critics pointing to rural distress and urban unemployment concerns. "
            "The Chief Economic Adviser responded that projections are based on conservative RBI estimates "
            "and multiple global agency forecasts centering India's growth at 6.5-7 percent."
        ),
        "summary": "Former RBI Governor Raghuram Rajan called Budget 2026's growth assumptions 'dangerously optimistic', flagging GST buoyancy risks. He praised the capex push but criticized stagnant education spending.",
        "source": "NDTV Profit",
        "published_at": _ts(hours_ago=24),
        "topics": ["budget", "economy", "policy"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-rural-spending-gap",
        "title": "Opinion: Budget 2026 Has a Rural-Shaped Hole — Why Farmers May Not Be Celebrating",
        "content": (
            "While markets cheered the Union Budget, rural India has reason for muted optimism. MGNREGA "
            "allocation has been pruned by 8 percent to Rs 60,000 crore in nominal terms, a real decline "
            "once inflation is factored in. The agriculture credit target of Rs 22 lakh crore, though "
            "headline-grabbing, merely tracks trend growth and carries no concessional interest rate "
            "sweetener. MSP continues to be announced without a legal guarantee, a long-standing demand "
            "of farmer unions. Crop insurance claims settlement remains abysmally slow — the Comptroller "
            "and Auditor General noted that 40 percent of claims from Kharif 2024 are still pending. "
            "The only notable rural positive is the Rs 15,000 crore allocation for PM-KISAN's expanded "
            "coverage, adding tenant farmers for the first time. Agricultural economists at ICRIER "
            "estimate that the budget's net fiscal impulse to rural India is actually contractionary by "
            "0.2 percent of GDP when adjusted for inflation. 'The budget celebrates Atmanirbhar but "
            "forgets that 45 percent of India still depends on agriculture,' said Prof Ashok Gulati."
        ),
        "summary": "Despite market euphoria, Budget 2026 cuts MGNREGA spending in real terms and offers no MSP legal guarantee. Experts argue the net fiscal impulse to rural India is contractionary.",
        "source": "The Indian Express",
        "published_at": _ts(hours_ago=30),
        "topics": ["budget", "agriculture", "economy", "policy"],
    },
    {
        "url": "https://demo.etnewsai.com/budget-2026-global-fund-managers-view",
        "title": "Global Fund Managers React to Budget: 'India Is Now the Most Investable EM Story'",
        "content": (
            "A Reuters poll of 28 global fund managers conducted within hours of the budget presentation "
            "found that 22 rated it 'positive' or 'very positive' for Indian equities over the next 12 "
            "months. Mark Mobius of Mobius Capital Partners called it 'the most investor-friendly Indian "
            "budget I've seen in 30 years', highlighting the capital gains tax stability and the infrastructure "
            "spending ramp. BlackRock's head of emerging markets, noting India's weight in the MSCI EM "
            "index is now 19.8 percent, said allocations to India-dedicated funds have risen 40 percent "
            "quarter-on-quarter. However, contrarians point out that India's price-to-earnings ratio of "
            "23.5x remains a 60 percent premium to the EM average, and that the 'India premium' could "
            "compress if global risk appetite turns. Hedge fund manager Saurabh Mukherjea argued that even "
            "at current valuations, India's earnings compound at 14-15 percent annually, making it "
            "'expensive for a reason'. The budget's stability on capital gains taxation — no hike despite "
            "revenue pressures — was cited as the single most important factor by 78 percent of respondents."
        ),
        "summary": "A Reuters poll found 78% of global fund managers rated Budget 2026 positively, with Mark Mobius calling it the most investor-friendly in 30 years. India's MSCI EM weight has risen to 19.8%.",
        "source": "Reuters",
        "published_at": _ts(hours_ago=48),
        "topics": ["budget", "markets", "economy", "geopolitics"],
    },
]


# ═════════════════════════════════════════════════════════════════════════════
#  CLUSTER B — Breaking Bankruptcy (Vernacular Audio Demo)
# ═════════════════════════════════════════════════════════════════════════════

CLUSTER_B = [
    {
        "url": "https://demo.etnewsai.com/futureretail-logistics-nclt-insolvency",
        "title": "BREAKING: FutureRetail Logistics Files for NCLT Insolvency — Rs 14,800 Crore Debt at Stake",
        "content": (
            "In a stunning development that has sent shockwaves through India's retail and logistics sector, "
            "FutureRetail Logistics Ltd has filed a voluntary insolvency petition with the National Company "
            "Law Tribunal (NCLT) Mumbai bench under Section 10 of the Insolvency and Bankruptcy Code (IBC), "
            "2016. The company, which operates a fleet of 2,200 warehouses and manages last-mile delivery "
            "for over 40 e-commerce platforms, disclosed outstanding financial creditor claims of Rs 14,800 "
            "crore, including Rs 8,200 crore owed to a consortium of lenders led by State Bank of India, "
            "Punjab National Bank, and IDFC First Bank. Operational creditor claims from vendors, "
            "transporters, and gig workers are estimated at an additional Rs 3,400 crore. The company's "
            "stock, which had already plunged 78 percent over the past six months amid repeated covenant "
            "breaches and liquidity warnings, was immediately halted for trading by the BSE and NSE. In its "
            "filing, the company cited 'acute cash flow deterioration, inability to service debt-service "
            "coverage ratio (DSCR) covenants, and the failure of negotiations with potential strategic "
            "investors including Amazon India and Reliance Retail'. The Committee of Creditors (CoC) is "
            "expected to be constituted within 30 days, with the 330-day Corporate Insolvency Resolution "
            "Process (CIRP) timeline commencing from the date of NCLT admission. ICRA has downgraded the "
            "company's credit rating to 'D' (Default), triggering cross-default clauses on Rs 2,100 crore "
            "of outstanding non-convertible debentures (NCDs). Employee unions representing 45,000 workers "
            "have demanded that the interim resolution professional (IRP) prioritize salary arrears of three "
            "months totaling Rs 340 crore. Legal experts note that this is the largest retail-logistics "
            "insolvency in India since the Jaypee Infratech case and could set precedents for the treatment "
            "of gig-economy workers as operational creditors under the IBC framework. Markets are watching "
            "closely as contagion fears emerge — shares of Delhivery, Ecom Express, and Blue Dart fell "
            "4-7 percent in sympathetic selling."
        ),
        "summary": (
            "FutureRetail Logistics has filed for NCLT insolvency with Rs 14,800 crore in debt, marking "
            "India's largest retail-logistics bankruptcy. The filing triggers cross-default clauses on "
            "NCDs and raises contagion concerns across the logistics sector."
        ),
        "source": "ET NOW Breaking",
        "published_at": _ts(minutes_ago=10),
        "topics": ["corporate", "banking", "markets"],
    },
]


# ═════════════════════════════════════════════════════════════════════════════
#  CLUSTER C — Persona Feed Variety (8 articles)
# ═════════════════════════════════════════════════════════════════════════════

CLUSTER_C = [
    # ── Trader Persona (2): Technical / Chart Analysis ────────────────────────
    {
        "url": "https://demo.etnewsai.com/nifty-technical-analysis-head-shoulders",
        "title": "Nifty 50 Technical Analysis: Inverse Head-and-Shoulders Breakout Targets 26,200",
        "content": (
            "The Nifty 50 has completed a textbook inverse head-and-shoulders pattern on the daily chart, "
            "with the neckline breakout occurring at 25,050 on massive volume of 1.2 billion shares — "
            "3x the 20-day average. The measured move target from the pattern projects to 26,200, "
            "representing 4.6 percent upside from current levels. Key support levels to watch are the "
            "right shoulder low at 24,400 and the 50-day EMA at 24,680, which has acted as dynamic "
            "support throughout the rally. The RSI(14) at 64 indicates bullish momentum without being "
            "overbought, while the MACD histogram has turned positive for the first time in three weeks. "
            "Bollinger Bands are expanding, confirming a volatility expansion regime favorable for "
            "directional trades. Options data shows maximum open interest at the 25,500 call strike "
            "(1.2 crore contracts) and 24,800 put strike (95 lakh contracts), defining the immediate "
            "trading range. The put-call ratio at 1.24 is bullish. Fibonacci retracement of the "
            "previous swing from 25,800 to 23,900 places the 61.8% level at 25,075, which has already "
            "been reclaimed. Traders should consider going long above 25,150 with a stop-loss at 24,750 "
            "and targets at 25,600 and 26,200. Sector rotation analysis shows money flowing from "
            "defensives (pharma, FMCG) into cyclicals (metals, banks), confirming the risk-on nature "
            "of the current move."
        ),
        "summary": "Nifty 50 has broken out of an inverse head-and-shoulders pattern targeting 26,200 with bullish RSI and MACD confirmation. Options data and sector rotation both support the risk-on rally.",
        "source": "TradingView India",
        "published_at": _ts(hours_ago=3),
        "topics": ["markets", "technology"],
    },
    {
        "url": "https://demo.etnewsai.com/bank-nifty-expiry-options-strategy",
        "title": "Bank Nifty Weekly Expiry: Iron Condor Setup for 52,800-54,200 Range Play",
        "content": (
            "With Bank Nifty trading at 53,520, options data for the upcoming weekly expiry suggests a "
            "range-bound setup between 52,800 and 54,200, making an iron condor the optimal strategy. "
            "The implied volatility (IV) for at-the-money options is at 16.2 percent, elevated relative "
            "to the 20-day historical volatility of 13.8 percent, creating a favorable IV premium for "
            "selling strategies. The recommended trade: sell the 54,200 call at Rs 85, buy the 54,700 call "
            "at Rs 42, sell the 52,800 put at Rs 78, and buy the 52,300 put at Rs 35, for a net credit "
            "of Rs 86 per lot. Maximum profit is Rs 86 × 15 (lot size) = Rs 1,290 if Bank Nifty expires "
            "between 52,800-54,200. Maximum risk is Rs 414 × 15 = Rs 6,210 per lot. The risk-reward "
            "ratio is 1:4.8, but the probability of profit (POP) is approximately 68 percent based "
            "on the current IV distribution. Key events to watch: HDFC Bank Q4 results (post-market today) "
            "and the RBI's liquidity data release. The PCR for Bank Nifty is 0.92, neutral-to-slightly "
            "bearish. Delta-adjusted gamma exposure (GEX) analysis shows dealers are long gamma above "
            "54,000, which should cap upside moves mechanically."
        ),
        "summary": "Bank Nifty options data suggests a 52,800-54,200 range for the weekly expiry, favoring an iron condor strategy. Elevated IV at 16.2% creates attractive premium-selling opportunities.",
        "source": "Zerodha Varsity",
        "published_at": _ts(hours_ago=2),
        "topics": ["markets", "banking"],
    },

    # ── CFO Persona (2): Corporate Taxation / Regulatory ──────────────────────
    {
        "url": "https://demo.etnewsai.com/pillar-two-global-minimum-tax-india",
        "title": "Pillar Two Impact: India Notifies 15% Global Minimum Tax Rules — What CFOs Must Know",
        "content": (
            "The Central Board of Direct Taxes (CBDT) has issued final rules implementing the OECD's "
            "Pillar Two Global Anti-Base Erosion (GloBE) framework, effective April 1, 2026. Indian "
            "subsidiaries of multinational enterprises (MNEs) with consolidated revenue exceeding €750 "
            "million will now be subject to a Qualified Domestic Minimum Top-up Tax (QDMTT) ensuring "
            "an effective tax rate (ETR) of at least 15 percent. The rules introduce complex calculations "
            "involving substance-based income exclusions (SBIE), which carve out returns attributable "
            "to tangible assets (8% declining to 5% over 10 years) and payroll (10% declining to 5%). "
            "Deferred tax assets and liabilities must be recomputed under GloBE accounting standards, "
            "which differ materially from Ind-AS 12 in treatment of temporary differences. CFOs must "
            "urgently assess their group's jurisdictional ETR calculations, as SEZ and IFSC tax holidays "
            "may now trigger top-up tax obligations. Deloitte estimates that 800+ Indian entities will "
            "be impacted, with aggregate top-up tax liability of Rs 8,000-12,000 crore in the first "
            "year. Transfer pricing documentation will need to be enhanced to support SBIE claims, and "
            "companies should consider restructuring IP holding arrangements to minimize top-up exposure. "
            "The CBDT has allowed a one-year transitional safe harbour for entities with revenue below "
            "Rs 1,000 crore in the jurisdiction."
        ),
        "summary": "India has notified Pillar Two Global Minimum Tax rules effective April 2026, impacting 800+ MNE subsidiaries. CFOs must reassess jurisdictional ETR calculations as SEZ tax holidays may trigger top-up taxes.",
        "source": "ET CFO",
        "published_at": _ts(hours_ago=20),
        "topics": ["policy", "corporate", "economy"],
    },
    {
        "url": "https://demo.etnewsai.com/gst-input-tax-credit-supreme-court-ruling",
        "title": "Supreme Court Ruling on ITC Reversal: CFOs Face Rs 46,000 Crore Retrospective Tax Risk",
        "content": (
            "A landmark Supreme Court ruling in 'Safari Retreats v. Chief Commissioner of CGST' has "
            "settled the long-debated question of Input Tax Credit (ITC) availability on construction "
            "of immovable property used for providing taxable services. The five-judge constitutional "
            "bench, in a 3:2 majority, held that Section 17(5)(d) of the CGST Act must be read narrowly "
            "— ITC on construction is blocked only when the immovable property is sold, not when it "
            "is leased or rented for taxable supplies. The ruling has retrospective implications: "
            "companies that reversed ITC on mall constructions, commercial office spaces, and industrial "
            "parks used for leasing can now claim refunds estimated at Rs 46,000 crore across the real "
            "estate and REIT sector. However, the dissenting judges warned that this interpretation "
            "'creates asymmetry and potential for tax planning abuse'. CFOs must now reconcile their "
            "GSTR-2B returns, file revised returns where applicable, and engage with the GST department "
            "for refund processing. The government is reportedly considering an amendment to override the "
            "ruling prospectively. Tax advisory firms report a 300 percent surge in client queries since "
            "the judgment was delivered last Thursday."
        ),
        "summary": "The Supreme Court's Safari Retreats ruling allows ITC on construction for leased properties, creating Rs 46,000 crore in potential refund claims. CFOs must urgently reconcile GSTR-2B returns.",
        "source": "Taxmann",
        "published_at": _ts(hours_ago=36),
        "topics": ["policy", "corporate", "economy"],
    },

    # ── Founder Persona (2): Startup Funding / M&A ───────────────────────────
    {
        "url": "https://demo.etnewsai.com/zepto-series-g-funding-unicorn",
        "title": "Zepto Raises $750M Series G at $8.5 Billion Valuation — Largest Quick-Commerce Round Ever",
        "content": (
            "Quick-commerce platform Zepto has closed a $750 million Series G round at a post-money "
            "valuation of $8.5 billion, making it the largest funding round in India's quick-commerce "
            "sector. The round was led by General Atlantic, with participation from existing investors "
            "StepStone Group, Goodwater Capital, and DST Global, along with new entrants Fidelity "
            "Management and Qatar Investment Authority. Co-founder Aadit Palicha announced that funds "
            "will be deployed for dark store expansion to 1,000+ locations, private-label SKU growth "
            "from 800 to 3,000 products, and AI-driven demand forecasting infrastructure. Zepto's "
            "annualized GMV has crossed $3 billion with average delivery time of 8.5 minutes across "
            "12 cities. The company expects to achieve EBITDA breakeven by Q3 FY27, with unit economics "
            "turning positive at Rs 22 contribution margin per order. The funding comes amid a broader "
            "resurgence in Indian startup investment — Q3 FY26 saw $4.8 billion deployed across 210 "
            "deals, a 62 percent year-on-year increase. IPO bankers including JPMorgan and Kotak have "
            "been appointed for a potential $1.5 billion public listing in 2027."
        ),
        "summary": "Zepto raised $750M at $8.5B valuation in the largest quick-commerce funding round ever, led by General Atlantic. The company targets EBITDA breakeven by Q3 FY27 and a potential $1.5B IPO in 2027.",
        "source": "Entrackr",
        "published_at": _ts(hours_ago=16),
        "topics": ["startups", "technology", "corporate"],
    },
    {
        "url": "https://demo.etnewsai.com/swiggy-acquires-dunzo-consolidation",
        "title": "Swiggy Acquires Dunzo in All-Stock Deal Valued at $200M — Quick-Commerce Consolidation Accelerates",
        "content": (
            "Swiggy has announced the acquisition of Dunzo Daily in an all-stock transaction valued at "
            "approximately $200 million, marking a major consolidation move in India's hypercompetitive "
            "quick-commerce landscape. The deal, approved by both boards, will see Dunzo's 150 dark "
            "stores across Bengaluru, Mumbai, and Delhi integrated into Swiggy Instamart's network, "
            "adding an estimated 2 million monthly active users. Dunzo's existing investors — including "
            "Reliance Retail, Google, and Lightbox — will receive Swiggy shares at a 15 percent discount "
            "to the 30-day VWAP, with a 12-month lock-in period. Dunzo CEO Kabeer Biswas will join "
            "Swiggy as VP of New Initiatives, overseeing the integration of Dunzo's B2B logistics "
            "technology into Swiggy's merchant delivery platform. The move comes after Dunzo struggled "
            "to raise follow-on funding, burning through its $75 million January 2024 round with only "
            "three months of runway remaining. Industry analysts view this as inevitable consolidation "
            "in a sector where only two players — Blinkit (Zomato) and Swiggy Instamart — are expected "
            "to survive long-term. The CCI is expected to approve the deal within 45 days given no "
            "anti-competitive concerns. Post-acquisition, Swiggy Instamart's dark store count rises "
            "to 780, narrowing the gap with Blinkit's 850."
        ),
        "summary": "Swiggy acquires Dunzo in a $200M all-stock deal, adding 150 dark stores and 2M users to Instamart. The consolidation highlights the sector's survival dynamics as only Blinkit and Instamart remain viable.",
        "source": "Inc42",
        "published_at": _ts(hours_ago=22),
        "topics": ["startups", "technology", "corporate"],
    },

    # ── Student Persona (2): Educational Explainers ──────────────────────────
    {
        "url": "https://demo.etnewsai.com/explainer-what-is-inflation-cpi",
        "title": "Explainer: What Is Inflation and Why Does the RBI Target 4%? A Beginner's Guide",
        "content": (
            "Inflation is the rate at which the general level of prices for goods and services rises "
            "over time, reducing the purchasing power of money. If inflation is 6 percent, a basket of "
            "groceries that cost Rs 1,000 last year now costs Rs 1,060. India measures inflation primarily "
            "through the Consumer Price Index (CPI), which tracks the prices of a fixed basket of 299 "
            "items including food, fuel, clothing, housing, and services. The Reserve Bank of India (RBI) "
            "has been mandated by the government to target CPI inflation at 4 percent, with a tolerance "
            "band of 2-6 percent. Why 4 percent? Too-low inflation (or deflation) discourages spending "
            "and investment, as people expect prices to fall further. Too-high inflation erodes savings, "
            "hurts fixed-income earners like pensioners, and creates economic uncertainty. The RBI controls "
            "inflation mainly through the repo rate — the interest rate at which commercial banks borrow "
            "from the central bank. When inflation rises, the RBI hikes the repo rate, making borrowing "
            "expensive, which cools demand and eventually prices. Conversely, rate cuts boost spending. "
            "Food inflation in India is particularly volatile due to dependence on monsoons — a bad "
            "harvest can spike vegetable and pulse prices overnight. Core inflation (excluding food and "
            "fuel) better reflects underlying demand pressures and is currently at 3.8 percent, well "
            "within the RBI's comfort zone. Understanding inflation is crucial for personal finance: "
            "if your fixed deposit earns 7 percent and inflation is 5 percent, your real return is only "
            "2 percent."
        ),
        "summary": "Inflation measures how fast prices rise, reducing your money's purchasing power — India uses CPI to track it. The RBI targets 4% inflation using the repo rate to balance growth and price stability.",
        "source": "ET Wealth",
        "published_at": _ts(hours_ago=40),
        "topics": ["economy", "rbi", "inflation"],
    },
    {
        "url": "https://demo.etnewsai.com/explainer-how-stock-market-works",
        "title": "Explainer: How Does the Stock Market Work? Understanding Sensex, Nifty, and Your First Investment",
        "content": (
            "The stock market is a marketplace where shares of publicly listed companies are bought and "
            "sold. When you buy a share of Reliance Industries, you're buying a tiny piece of ownership "
            "in the company. India has two main stock exchanges: the Bombay Stock Exchange (BSE), "
            "established in 1875, and the National Stock Exchange (NSE), launched in 1992. The Sensex is "
            "the benchmark index of the BSE, tracking 30 of the largest and most-traded companies. The "
            "Nifty 50, operated by the NSE, tracks 50 major companies. When people say 'the market is up "
            "500 points', they typically mean the Sensex rose by 500 points from the previous day's close. "
            "Stock prices move based on supply and demand. If more people want to buy a stock than sell it, "
            "the price goes up — and vice versa. Company earnings, economic data, government policies, "
            "and even global events affect investor sentiment and thus stock prices. To invest, you need "
            "a demat account (to hold shares electronically) and a trading account (to place buy/sell "
            "orders), both opened through a broker like Zerodha, Groww, or Angel One. For beginners, "
            "experts recommend starting with index funds or ETFs, which spread your money across many "
            "stocks automatically. The power of compounding means even Rs 5,000 invested monthly in a "
            "Nifty index fund growing at 12 percent annually can become Rs 50 lakh in 20 years. Remember: "
            "investing in stocks carries risk, and you should only invest money you won't need in the "
            "short term."
        ),
        "summary": "The stock market lets you buy and sell ownership shares in companies through exchanges like BSE and NSE. Beginners should start with index funds and leverage compounding for long-term wealth creation.",
        "source": "ET Wealth",
        "published_at": _ts(hours_ago=44),
        "topics": ["markets", "economy", "mutual funds"],
    },
]


# ═════════════════════════════════════════════════════════════════════════════
#  INSERTION LOGIC
# ═════════════════════════════════════════════════════════════════════════════

ALL_ARTICLES = CLUSTER_A + CLUSTER_B + CLUSTER_C


async def seed():
    """Seed the SQLite database and both ChromaDB collections."""
    # 1. Initialize the database schema
    print("━" * 60)
    print("  ET NewsAI — Seed Data Script")
    print("━" * 60)
    print(f"\n[1/4] Initializing database at {os.path.abspath(os.getenv('DB_PATH', './etnewsai.db'))} ...")
    await init_db()
    print("      ✔ Database schema ready.\n")

    # 2. Initialize ChromaDB
    print("[2/4] Connecting to ChromaDB ...")
    chroma_path = os.getenv("CHROMA_PATH", "./chroma_store")
    chroma_client = chromadb.PersistentClient(
        path=chroma_path,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = chroma_client.get_or_create_collection("articles")
    long_collection = chroma_client.get_or_create_collection("articles_longterm")
    print(f"      ✔ ChromaDB collections ready at {os.path.abspath(chroma_path)}")
    print(f"        • articles:          {collection.count()} existing vectors")
    print(f"        • articles_longterm:  {long_collection.count()} existing vectors\n")

    # 3. Pre-warm the embedding model (first call downloads / loads weights)
    print("[3/4] Loading embedding model (sentence-transformers/all-MiniLM-L6-v2) ...")
    test_emb = get_embedding("warmup")
    print(f"      ✔ Model loaded. Embedding dimension: {len(test_emb)}\n")

    # 4. Insert articles
    total = len(ALL_ARTICLES)
    print(f"[4/4] Inserting {total} articles into SQLite + ChromaDB ...\n")

    for idx, article_data in enumerate(ALL_ARTICLES, start=1):
        # Build article dict matching ingestion.py's format
        article_id = _id(article_data["url"])
        article = {
            "id": article_id,
            "title": article_data["title"],
            "content": article_data["content"],
            "summary": article_data["summary"],
            "url": article_data["url"],
            "source": article_data["source"],
            "published_at": article_data["published_at"],
            "topics": article_data["topics"],
            "embedded": 0,
        }

        # SQLite insert
        await save_article(article)

        # Embed
        text_to_embed = f"{article['title']}. {article['summary']}"
        embedding = get_embedding(text_to_embed)

        metadata = {
            "title": article["title"],
            "source": article["source"],
            "published_at": article["published_at"],
            "topics": json.dumps(article["topics"]),
            "url": article["url"],
            "summary": article["summary"],
            "id": article["id"],
        }

        # Upsert into both collections
        collection.upsert(
            ids=[article_id],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[text_to_embed],
        )
        long_collection.upsert(
            ids=[article_id],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[text_to_embed],
        )

        # Mark as embedded
        await mark_embedded(article_id)

        # Determine cluster label
        if article_data in CLUSTER_A:
            cluster = "A-Budget"
        elif article_data in CLUSTER_B:
            cluster = "B-Breaking"
        else:
            cluster = "C-Persona"

        print(f"  [{idx:2d}/{total}] [{cluster:10s}] {article['title'][:65]}...")

    # Final report
    print(f"\n{'━' * 60}")
    print(f"  ✅  SEEDING COMPLETE")
    print(f"{'━' * 60}")
    print(f"  • Articles inserted into SQLite:    {total}")
    print(f"  • Vectors in 'articles':            {collection.count()}")
    print(f"  • Vectors in 'articles_longterm':   {long_collection.count()}")
    print(f"  • Embedding dimension:              {len(test_emb)}")
    print(f"  • Clusters:  A={len(CLUSTER_A)} budget  |  B={len(CLUSTER_B)} breaking  |  C={len(CLUSTER_C)} persona")
    print(f"{'━' * 60}\n")


# ── Standalone entry point ──────────────────────────────────────────────────
if __name__ == "__main__":
    asyncio.run(seed())
