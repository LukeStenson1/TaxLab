"""Default learning-center content, ordered from most basic/most relevant to
more advanced/less common. Seeded into the `learning_sections` collection on
first run. Admins can add / edit / hide / delete / reorder afterward."""

DEFAULT_SECTIONS = [
    {
        "slug": "filing-status-requirements",
        "title": "Filing status: which one applies to you?",
        "category": "Filing basics",
        "body": "Your filing status sets your tax brackets and standard deduction. Single: unmarried (or legally separated) on Dec 31. Married filing jointly (MFJ): married on Dec 31; both spouses' income and deductions combine on one return — usually the lowest tax. Married filing separately (MFS): married but file apart; sometimes used to protect against a spouse's liability, but you lose several credits. Head of household (HoH): unmarried AND you paid more than half the cost of keeping up a home for a qualifying person (often a child) more than half the year — it gives a bigger standard deduction and wider brackets than single. Qualifying surviving spouse: available for two years after a spouse's death if you have a dependent child.",
    },
    {
        "slug": "what-is-a-dependent",
        "title": "What counts as a dependent?",
        "category": "Filing basics",
        "body": "A dependent is someone you financially support who meets IRS tests. There are two types: a 'qualifying child' and a 'qualifying relative'. A qualifying child must be your child, stepchild, foster child, sibling, or their descendant; under 19 (or under 24 if a full-time student, or any age if permanently disabled); live with you more than half the year; and not provide more than half of their own support. A qualifying relative can be older, must have gross income below a set limit (~$5,050 for 2025), and must receive more than half their support from you. Claiming dependents can unlock the Child Tax Credit, Credit for Other Dependents, and head-of-household status.",
    },
    {
        "slug": "standard-vs-itemized",
        "title": "Standard deduction vs. itemizing",
        "category": "Deductions & credits",
        "body": "Everyone can subtract the standard deduction from income — for 2025 (including the OBBBA increase) that's $15,750 single, $31,500 married filing jointly, and $23,625 head of household. Alternatively you can itemize: add up mortgage interest, state and local taxes (capped at $10,000), charitable gifts, and large medical expenses. You take whichever is larger. Most people take the standard deduction; itemizing usually wins only with a mortgage, high state taxes, or big donations.",
    },
    {
        "slug": "marginal-vs-effective",
        "title": "Marginal vs. effective tax rate",
        "category": "Tax basics",
        "body": "Your marginal rate is the rate on your NEXT dollar of income — your top bracket. Your effective rate is your AVERAGE rate across all income. Because the U.S. uses graduated brackets, income is taxed in layers, so your effective rate is almost always lower than your marginal rate. The smartest deductions (like a pre-tax 401(k)) save you money at your marginal rate.",
    },
    {
        "slug": "how-effective-rate-calculated",
        "title": "How-to: calculate your effective tax rate",
        "category": "How-to calculations",
        "body": "Effective rate = Total tax ÷ Taxable income (some use AGI as the denominator). Example: a single filer with $64,000 taxable income. Tax = 10% of the first $11,925 ($1,193) + 12% of the next $36,550 ($4,386) + 22% of the remaining $15,525 ($3,416) = about $8,995. Effective rate = 8,995 ÷ 64,000 ≈ 14% — well below the 22% marginal bracket. This layering is why a raise never lowers your take-home pay overall.",
    },
    {
        "slug": "child-tax-credit",
        "title": "Child Tax Credit & dependent credits",
        "category": "Deductions & credits",
        "body": "The Child Tax Credit is worth up to $2,000 per qualifying child under 17 and directly reduces your tax bill (credits beat deductions dollar-for-dollar). It phases out above $200,000 single / $400,000 MFJ. For other dependents who don't qualify (older children, relatives), there's a $500 Credit for Other Dependents. You must have a valid SSN for the child.",
    },
    {
        "slug": "capital-gains-rates",
        "title": "Capital gains: short-term vs. long-term",
        "category": "Investments",
        "body": "Sell an investment held MORE than one year and the profit is a long-term capital gain, taxed at preferential federal rates of 0%, 15%, or 20% depending on income. Held one year or less? It's a short-term gain, taxed at your ordinary income rate (much higher). Holding just past the one-year mark can dramatically cut the tax. Most states tax all gains as ordinary income.",
    },
    {
        "slug": "roth-vs-traditional",
        "title": "Roth vs. Traditional retirement accounts",
        "category": "Retirement",
        "body": "Traditional 401(k)/IRA: contributions are pre-tax (lower your taxable income now), but withdrawals in retirement are taxed. Roth: contributions are after-tax (no deduction now), but qualified withdrawals are tax-free forever. Rule of thumb: choose Traditional if you expect a lower tax rate in retirement, Roth if you expect a higher one (or want tax-free flexibility). Many people split between both.",
    },
    {
        "slug": "hsa-fsa",
        "title": "HSA & FSA — tax-free health dollars",
        "category": "Deductions & credits",
        "body": "A Health Savings Account (HSA), paired with a high-deductible health plan, is triple tax-advantaged: contributions are deductible, growth is tax-free, and withdrawals for medical costs are tax-free. 2025 limits are about $4,300 (individual) / $8,550 (family). A Flexible Spending Account (FSA) is employer-based, also pre-tax, but is mostly use-it-or-lose-it each year. Both lower your taxable income.",
    },
    {
        "slug": "self-employment-tax",
        "title": "Self-employment & FICA tax",
        "category": "Self-employment",
        "body": "Employees split Social Security + Medicare (FICA) tax with their employer (7.65% each). Self-employed people pay both halves — the 15.3% self-employment tax — on 92.35% of net earnings. The good news: you deduct half of it, can deduct business expenses, may qualify for the 20% QBI deduction, and can open a SEP-IRA or Solo 401(k) to shelter more income.",
    },
    {
        "slug": "how-to-quarterly-taxes",
        "title": "How-to: estimate quarterly taxes",
        "category": "How-to calculations",
        "body": "If you have income without withholding (freelance, rental, investments), the IRS expects quarterly estimated payments. A simple method: estimate your total annual tax, subtract any W-2 withholding, and divide the remainder by 4. 'Safe harbor': you generally avoid penalties if you pay at least 90% of this year's tax or 100% of last year's (110% if your AGI was over $150,000). Due dates are roughly April 15, June 15, Sept 15, and Jan 15. Set aside ~25–30% of self-employment income to be safe.",
    },
    {
        "slug": "qbi-deduction",
        "title": "QBI — the 20% small-business deduction",
        "category": "Self-employment",
        "body": "Under Section 199A, many self-employed people and pass-through owners can deduct up to 20% of qualified business income. It phases out for certain service businesses above income thresholds (around $197,300 single / $394,600 MFJ for 2025). If you have 1099 or Schedule C income, ask your CPA whether you qualify and how to maximize it.",
    },
    {
        "slug": "wash-sale-rule",
        "title": "The wash-sale rule",
        "category": "Investments",
        "body": "When you sell an investment at a loss to harvest the tax benefit, the wash-sale rule disallows the loss if you buy the same (or a 'substantially identical') security within 30 days before or after the sale. The disallowed loss is added to the cost basis of the new shares. To stay clean, wait 31 days or buy a similar-but-not-identical fund.",
    },
    {
        "slug": "niit",
        "title": "NIIT — Net Investment Income Tax",
        "category": "Investments",
        "body": "An extra 3.8% federal tax on investment income (interest, dividends, capital gains, rental income) once your modified AGI crosses $200,000 (single) or $250,000 (married filing jointly). Only the income above the threshold is taxed. Timing capital gains across years can help you stay under the line.",
    },
    {
        "slug": "rmds",
        "title": "RMDs — Required Minimum Distributions",
        "category": "Retirement",
        "body": "Starting at age 73, the IRS requires you to withdraw a minimum amount from Traditional IRAs and 401(k)s each year — and those withdrawals are taxable. Missing an RMD triggers a stiff penalty (now 25%, reduced to 10% if corrected promptly). Roth IRAs have no RMDs during the owner's lifetime, which is part of their appeal.",
    },
    {
        "slug": "amt",
        "title": "AMT — Alternative Minimum Tax",
        "category": "Advanced",
        "body": "A parallel tax system that ensures high-income taxpayers with many deductions still pay a minimum. You compute tax both the normal way and the AMT way, then pay the higher. Common triggers: exercising incentive stock options (ISOs), very large state-tax or miscellaneous deductions, and certain private-activity bond interest.",
    },
    {
        "slug": "step-up-basis",
        "title": "Step-up in basis",
        "category": "Advanced",
        "body": "When you inherit an asset, its cost basis usually 'steps up' to the fair market value on the date of death. That means heirs can often sell inherited stock or property with little or no capital-gains tax. It's a major reason estate-planning and holding appreciated assets until death can be tax-efficient — discuss specifics with a professional.",
    },
]
