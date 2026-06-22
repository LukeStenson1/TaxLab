"""
Authoritative IRS tax-reference data, grounded in official IRS Revenue Procedures,
COLA notices, and publications. All figures below come from official IRS sources
(see SOURCES). These figures are injected into the analysis prompt so that the AI's
calculations and thresholds are anchored to official numbers rather than model memory.

ANNUAL MAINTENANCE:
  To keep TaxLens current year-to-year, add a new entry to TAX_REFERENCE each year
  using the IRS inflation-adjustment Revenue Procedure (e.g. Rev. Proc. 2024-40 for
  2025) and the IRS COLA notice for retirement limits. Update CURRENT_TAX_YEAR.
  Nothing else needs to change — the prompt builder reads every year listed here.
"""

CURRENT_TAX_YEAR = 2025

# Statutory (not inflation-indexed) thresholds
NIIT_THRESHOLD = {
    "single": 200000,
    "head of household": 200000,
    "married filing jointly": 250000,
    "married filing separately": 125000,
}
CTC_PHASEOUT_START = {
    "single": 200000,
    "head of household": 200000,
    "married filing separately": 200000,
    "married filing jointly": 400000,
}
# Education credits (AOTC/LLC) MAGI phaseout ranges
EDU_CREDIT_PHASEOUT = {
    "single": [80000, 90000],
    "head of household": [80000, 90000],
    "married filing jointly": [160000, 180000],
    "married filing separately": [0, 0],  # MFS generally cannot claim
}

TAX_REFERENCE = {
    2023: {
        "rev_proc": "Rev. Proc. 2022-38; IRS Notice 2022-55 (retirement COLA)",
        "standard_deduction": {
            "single": 13850,
            "married filing jointly": 27700,
            "married filing separately": 13850,
            "head of household": 20800,
        },
        "brackets": {
            "single": [[0, 0.10], [11000, 0.12], [44725, 0.22], [95375, 0.24], [182100, 0.32], [231250, 0.35], [578125, 0.37]],
            "married filing jointly": [[0, 0.10], [22000, 0.12], [89450, 0.22], [190750, 0.24], [364200, 0.32], [462500, 0.35], [693750, 0.37]],
            "married filing separately": [[0, 0.10], [11000, 0.12], [44725, 0.22], [95375, 0.24], [182100, 0.32], [231250, 0.35], [346875, 0.37]],
            "head of household": [[0, 0.10], [15700, 0.12], [59850, 0.22], [95350, 0.24], [182100, 0.32], [231250, 0.35], [578100, 0.37]],
        },
        "ltcg_0_max": {"single": 44625, "married filing jointly": 89250, "married filing separately": 44625, "head of household": 59750},
        "ltcg_15_max": {"single": 492300, "married filing jointly": 553850, "married filing separately": 276900, "head of household": 523050},
        "qbi_threshold": {"single": 182100, "married filing separately": 182100, "married filing jointly": 364200, "head of household": 182100},
        "retirement": {"limit_401k": 22500, "catchup_401k": 7500, "limit_ira": 6500, "catchup_ira": 1000, "sep_max": 66000},
    },
    2024: {
        "rev_proc": "Rev. Proc. 2023-34; IRS Notice 2023-75 (retirement COLA)",
        "standard_deduction": {
            "single": 14600,
            "married filing jointly": 29200,
            "married filing separately": 14600,
            "head of household": 21900,
        },
        "brackets": {
            "single": [[0, 0.10], [11600, 0.12], [47150, 0.22], [100525, 0.24], [191950, 0.32], [243725, 0.35], [609350, 0.37]],
            "married filing jointly": [[0, 0.10], [23200, 0.12], [94300, 0.22], [201050, 0.24], [383900, 0.32], [487450, 0.35], [731200, 0.37]],
            "married filing separately": [[0, 0.10], [11600, 0.12], [47150, 0.22], [100525, 0.24], [191950, 0.32], [243725, 0.35], [365600, 0.37]],
            "head of household": [[0, 0.10], [16550, 0.12], [63100, 0.22], [100500, 0.24], [191950, 0.32], [243700, 0.35], [609350, 0.37]],
        },
        "ltcg_0_max": {"single": 47025, "married filing jointly": 94050, "married filing separately": 47025, "head of household": 63000},
        "ltcg_15_max": {"single": 518900, "married filing jointly": 583750, "married filing separately": 291850, "head of household": 551350},
        "qbi_threshold": {"single": 191950, "married filing separately": 191950, "married filing jointly": 383900, "head of household": 191950},
        "retirement": {"limit_401k": 23000, "catchup_401k": 7500, "limit_ira": 7000, "catchup_ira": 1000, "sep_max": 69000},
    },
    2025: {
        "rev_proc": "Rev. Proc. 2024-40; IRS COLA notice 2024 (retirement limits)",
        "standard_deduction": {
            "single": 15000,
            "married filing jointly": 30000,
            "married filing separately": 15000,
            "head of household": 22500,
        },
        "brackets": {
            "single": [[0, 0.10], [11925, 0.12], [48475, 0.22], [103350, 0.24], [197300, 0.32], [250525, 0.35], [626350, 0.37]],
            "married filing jointly": [[0, 0.10], [23850, 0.12], [96950, 0.22], [206700, 0.24], [394600, 0.32], [501050, 0.35], [751600, 0.37]],
            "married filing separately": [[0, 0.10], [11925, 0.12], [48475, 0.22], [103350, 0.24], [197300, 0.32], [250525, 0.35], [375800, 0.37]],
            "head of household": [[0, 0.10], [17000, 0.12], [64850, 0.22], [103350, 0.24], [197300, 0.32], [250500, 0.35], [626350, 0.37]],
        },
        "ltcg_0_max": {"single": 48350, "married filing jointly": 96700, "married filing separately": 48350, "head of household": 64750},
        "ltcg_15_max": {"single": 533400, "married filing jointly": 600050, "married filing separately": 300000, "head of household": 566700},
        "qbi_threshold": {"single": 197300, "married filing separately": 197300, "married filing jointly": 394600, "head of household": 197300},
        "retirement": {"limit_401k": 23500, "catchup_401k": 7500, "limit_ira": 7000, "catchup_ira": 1000, "sep_max": 70000},
    },
}

SOURCES = [
    "IRS Rev. Proc. (annual inflation adjustments) — irs.gov/newsroom",
    "IRS COLA Increases for Dollar Limitations on Retirement Plans — irs.gov/retirement-plans",
    "IRS Topic No. 409, Capital Gains and Losses — irs.gov/taxtopics/tc409",
    "IRS Form 8960 & Instructions, Net Investment Income Tax — irs.gov/forms-pubs",
    "IRS Section 199A Qualified Business Income Deduction — irs.gov/newsroom/qualified-business-income-deduction",
    "IRS Education Credits (AOTC & LLC) — irs.gov/credits-deductions/individuals/education-credits-aotc-and-llc",
    "IRS Schedule 8812, Child Tax Credit — irs.gov/forms-pubs/about-schedule-8812-form-1040",
]


def sources_for_year(year: int) -> list:
    ref = TAX_REFERENCE.get(int(year)) if year else None
    out = []
    if ref:
        out.append(f"IRS official figures for TY{year}: {ref['rev_proc']}")
    out.extend(SOURCES)
    return out


def _fmt(d: dict) -> str:
    return ", ".join(f"{k}=${v:,}" for k, v in d.items())


def reference_prompt_block() -> str:
    """Compact, machine-readable block of OFFICIAL IRS figures for all supported years."""
    lines = [
        "OFFICIAL IRS REFERENCE FIGURES (use these EXACT numbers — never invent thresholds).",
        f"NIIT MAGI thresholds (all years, statutory): {_fmt(NIIT_THRESHOLD)}.",
        f"Child Tax Credit MAGI phaseout START (all years, statutory): {_fmt(CTC_PHASEOUT_START)}.",
        f"Education credit (AOTC/LLC) MAGI phaseout ranges: single/HOH $80,000–$90,000; MFJ $160,000–$180,000; MFS not eligible.",
        "",
    ]
    for year in sorted(TAX_REFERENCE.keys()):
        r = TAX_REFERENCE[year]
        lines.append(f"--- Tax Year {year} (source: {r['rev_proc']}) ---")
        lines.append(f"  Standard deduction: {_fmt(r['standard_deduction'])}.")
        lines.append(
            f"  Retirement limits: 401(k) ${r['retirement']['limit_401k']:,} (+${r['retirement']['catchup_401k']:,} catch-up 50+); "
            f"IRA ${r['retirement']['limit_ira']:,} (+${r['retirement']['catchup_ira']:,} catch-up 50+); "
            f"SEP-IRA up to 25% of net SE earnings, max ${r['retirement']['sep_max']:,}."
        )
        lines.append(f"  Long-term capital gains 0% rate applies up to taxable income: {_fmt(r['ltcg_0_max'])}; 15% rate up to: {_fmt(r['ltcg_15_max'])}; 20% above.")
        lines.append(f"  QBI (Sec. 199A) phase-in threshold: {_fmt(r['qbi_threshold'])}.")
        lines.append(f"  Ordinary brackets {year}: {r['brackets']}")
        lines.append("")
    return "\n".join(lines)
