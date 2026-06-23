// Plain-English definitions for tax terms, reused across the site via InfoTooltip.
// Written for people who are NOT tax experts.

const GLOSSARY = {
  agi:
    "Adjusted Gross Income — your total income minus certain adjustments like retirement contributions and student-loan interest. It's the starting point for calculating your tax.",
  taxableIncome:
    "The part of your income that's actually taxed, after subtracting your standard or itemized deductions from your AGI.",
  federalTax:
    "The total federal income tax you owe for the year — before counting any withholding or payments you've already made.",
  stateTax:
    "An estimate of the income tax your state charges, on top of federal tax. Nine states (like Texas and Florida) have no income tax. This is a simplified estimate using your state's typical rate.",
  combinedTax:
    "Federal tax plus your estimated state income tax — the fuller picture of what you actually pay.",
  effectiveRate:
    "Your average federal tax rate across all income. Formula: Federal tax ÷ Taxable income. It's usually lower than your top tax bracket (your marginal rate).",
  combinedEffectiveRate:
    "Your average rate when you add federal AND state tax together. Formula: (Federal tax + State tax) ÷ Taxable income.",
  marginalRate:
    "The tax rate on your NEXT dollar of income — your top tax bracket. It's different from your effective (average) rate, which spreads across all your income.",
  capitalGainsRate:
    "The long-term rate applied to your capital gains and qualified dividends — 0%, 15%, or 20% federally, depending on your taxable income. Most states tax gains as regular income.",
  standardDeduction:
    "A flat amount everyone can subtract from income instead of itemizing. For 2025 it's $15,750 (single), $31,500 (married filing jointly), and $23,625 (head of household).",
  itemized:
    "Adding up specific deductions (mortgage interest, state taxes, charity, etc.) instead of taking the standard deduction. You pick whichever is larger.",
  contribution401k:
    "Money you put into an employer retirement plan before taxes. It lowers your taxable income today — you pay tax later when you withdraw in retirement. 2025 limit: $23,500 (under age 50).",
  ira:
    "A personal retirement account. Traditional IRA contributions may reduce your taxable income now. 2025 limit: $7,000 (under age 50).",
  additionalIncome:
    "Extra taxable income — a raise, bonus, or side gig. This increases your taxable income and the tax you owe.",
  charitable:
    "Donations to qualified charities can reduce your taxable income — but only if you itemize deductions instead of taking the standard deduction.",
  capitalGains:
    "Profit from selling an investment (like a stock) you held for MORE than one year. These get lower federal tax rates (0%, 15%, or 20%). Held one year or less? It's a 'short-term' gain, taxed as ordinary income.",
  qualifiedDividends:
    "Dividends from U.S. (and many foreign) stocks you've held long enough. They're taxed at the lower long-term capital-gains rates instead of your regular income rate.",
  bondInterest:
    "Interest from corporate bonds, CDs, and savings accounts is taxed as ordinary income. Tip: interest from municipal (state/local government) bonds is usually FEDERALLY TAX-FREE — and often tax-free in your home state too.",
  taxLossHarvest:
    "Selling losing investments to offset gains. Up to $3,000 of net losses can also reduce your ordinary income each year; any extra carries over to future years.",
  niit:
    "Net Investment Income Tax — an extra 3.8% tax on investment income once your income crosses $200,000 (single) or $250,000 (married filing jointly).",
  ctc:
    "Child Tax Credit — a credit (up to $2,000 per qualifying child) that directly lowers your tax bill, phasing out at higher incomes.",
  aotc:
    "Education tax credits (American Opportunity & Lifetime Learning) that lower your tax for tuition and qualifying school costs, phasing out at higher incomes.",
  qbi:
    "Qualified Business Income deduction (Section 199A) — lets many self-employed people and small-business owners deduct up to 20% of their business income.",
  bracketProximity:
    "How close your income is to jumping into the next, higher tax bracket — where your next dollars would be taxed at a higher rate.",
  retirement:
    "Opportunities to save more in tax-advantaged retirement accounts (401(k), IRA), which can lower your taxable income now.",
  selfEmployment:
    "Income from freelancing, contracting, or running your own business. It carries self-employment tax (Social Security + Medicare) but also unlocks deductions like the QBI deduction and a SEP-IRA.",
  deductions:
    "Amounts you subtract from income before tax is calculated — either the standard deduction or your itemized deductions, whichever is larger.",
  credits:
    "Dollar-for-dollar reductions of the tax you owe (e.g., Child Tax Credit, education credits). Credits are more valuable than deductions of the same size.",
  underpayment:
    "If you don't pay enough tax during the year (through withholding or estimated payments), the IRS can charge an underpayment penalty.",
  dependents:
    "People you financially support (like children) who can qualify you for credits such as the Child Tax Credit.",
  filingStatus:
    "How you file your return (single, married filing jointly, etc.). It sets your tax brackets and standard deduction.",
  goal:
    "Your main financial focus this year. We use it to prioritize the insights that matter most to you.",
  dollarImpact:
    "A rough estimate of the dollars at stake — potential tax savings or extra cost — so you can prioritize what to discuss with a CPA.",
};

export default GLOSSARY;
