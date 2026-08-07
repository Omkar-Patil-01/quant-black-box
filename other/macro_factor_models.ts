register({
  id: 'FF3',
  name: 'Fama-French 3-Factor Model',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Fama-French 3-Factor Model extends the Capital Asset Pricing Model (CAPM) by augmenting the single market risk premium with two additional systematic factors: size (SMB) and value (HML). Eugene Fama and Kenneth French demonstrated in 1993 that small-cap stocks historically outperformed large-cap stocks, and value stocks (high book-to-market) outperformed growth stocks (low book-to-market), even after controlling for market beta. The model posits that these three factors collectively explain the vast majority of cross-sectional variation in expected equity returns, offering a significantly higher explanatory power than CAPM alone. By capturing size and value premia that CAPM ignores, the model provides a more complete risk-reward framework for asset pricing, portfolio evaluation, and cost-of-equity estimation. The empirical success of FF3 laid the foundation for the broader family of multi-factor models and fundamentally reshaped how practitioners and academics decompose equity returns into compensated risk exposures.`,
  baselineAssumptions: [
    'Investors are rational mean-variance optimizers who hold well-diversified portfolios.',
    'SMB captures a compensation for bearing size-related risk that is priced in equilibrium.',
    'HML captures a compensation for distress or value-related risk that is priced in equilibrium.',
    'The three factors are the only sources of systematic risk; idiosyncratic risk is diversifiable.',
    'Factor loadings (betas) are stable and linearly related to expected returns.',
  ],
  mathematicalFoundation: [
    'E(Ri) - Rf = αi + βi[E(Rm) - Rf] + si·E(SMB) + hi·E(HML)',
    'SMB = 1/3(Small Value + Small Neutral + Small Growth) - 1/3(Big Value + Big Neutral + Big Growth)',
    'HML = 1/2(Small Value + Big Value) - 1/2(Small Growth + Big Growth)',
    'Ri,t - Rf,t = αi + βi(Rm,t - Rf,t) + si·SMBt + hi·HMLt + εi,t',
  ],
  implementationCode: `import numpy as np
from scipy.optimize import minimize

def fama_french_3_factor(returns, market_returns, smb, hml, rf):
    T = len(returns)
    excess_returns = returns - rf
    M = np.column_stack([np.ones(T), market_returns - rf, smb, hml])
    betas, residuals, rank, sv = np.linalg.lstsq(M, excess_returns, rcond=None)
    alpha, beta_m, beta_smb, beta_hml = betas
    fitted = M @ betas
    ss_res = np.sum((excess_returns - fitted) ** 2)
    ss_tot = np.sum((excess_returns - np.mean(excess_returns)) ** 2)
    r_squared = 1 - ss_res / ss_tot
    return {
        "alpha": alpha,
        "beta_market": beta_m,
        "beta_smb": beta_smb,
        "beta_hml": beta_hml,
        "r_squared": r_squared,
        "residuals": residuals,
    }

def expected_return(capm_expected, beta_smb, beta_hml, smb_premium, hml_premium):
    return capm_expected + beta_smb * smb_premium + beta_hml * hml_premium`,
  inputOutputSpec: [
    { input: 'stock_returns: array of monthly/daily stock excess returns over the risk-free rate', output: 'alpha: Jensen\'s alpha representing abnormal return not explained by the three factors' },
    { input: 'market_returns: array of market portfolio returns matching the same time horizon', output: 'factor_betas: dictionary of loadings for market, size (SMB), and value (HML) factors' },
    { input: 'smb, hml: factor mimicking portfolio returns for size and value dimensions', output: 'r_squared: proportion of return variance explained by the three-factor model' },
    { input: 'rf: risk-free rate series (e.g., 1-month T-bill yield)', output: 'expected_return: cost of equity estimate under the FF3 framework given estimated factor premia' },
  ],
  failureModes: [
    {
      condition: 'Sample period does not represent the current economic regime (e.g., growth-stock dominance).',
      consequence: 'SMB and HML betas are estimated with bias, leading to incorrect cost-of-equity calculations.',
      mitigation: 'Use rolling-window estimation or regime-switching models to capture time-varying factor sensitivities.',
    },
    {
      condition: 'Stock has characteristics outside the value-growth and small-large spectrums (e.g., REITs, SPACs).',
      consequence: 'Factor premiums are poorly calibrated, and the model underestimates true risk.',
      mitigation: 'Augment with additional sector-specific factors or use conditional factor models that adapt to asset type.',
    },
    {
      condition: 'Survivorship bias or look-ahead bias in the construction of SMB and HML factor portfolios.',
      consequence: 'Historical factor premia are overstated, inflating expected return projections.',
      mitigation: 'Use point-in-time datasets (e.g., CRSP/Compustat with delisting adjustments) and out-of-sample validation.',
    },
  ],
});

register({
  id: 'FAMA_FRENCH_5',
  name: 'Fama-French 5-Factor Model',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Fama-French 5-Factor Model, published in 2015, extends the original 3-factor model by adding profitability (RMW) and investment (CMA) factors based on Novy-Marx (2013) and Titman, Wei, and Xie (2004). RMW captures the premium earned by firms with robust (high) operating profitability over weak (low) profitability firms, while CMA captures the premium for firms that invest conservatively versus aggressively. The inclusion of these two factors was motivated by the observation that profitable firms with low investment rates earn higher average returns, consistent with the theoretical prediction that such firms are less exposed to distress risk. Notably, the 5-factor model renders the value factor (HML) largely redundant, as the profitability and investment factors subsume much of HML's explanatory power. The model achieves a substantially higher cross-sectional R² in explaining the dispersion of expected returns across stocks compared to the 3-factor specification, making it one of the most powerful empirical asset pricing models available.`,
  baselineAssumptions: [
    'Operating profitability and investment rates are priced systematic risk factors in equilibrium.',
    'RMW and CMA capture distinct risk dimensions not subsumed by market, size, or value factors.',
    'HML becomes redundant when RMW and CMA are included due to their combined explanatory overlap.',
    'Factor loadings remain relatively stable over the estimation horizon.',
    'The cross-section of returns is fully described by the five linear factor exposures.',
  ],
  mathematicalFoundation: [
    'E(Ri) - Rf = αi + βi·E(MKT) + si·E(SMB) + wi·E(RMW) + ci·E(CMA)',
    'RMW = 1/3(Small Robust + Neutral Robust + Big Robust) - 1/3(Small Weak + Neutral Weak + Big Weak)',
    'CMA = 1/3(Small Conservative + Neutral Conservative + Big Conservative) - 1/3(Small Aggressive + Neutral Aggressive + Big Aggressive)',
    'Ri,t - Rf,t = αi + βi·MKTt + si·SMBt + wi·RMWt + ci·CMAt + εi,t',
  ],
  implementationCode: `import numpy as np
from scipy.optimize import least_squares

def fama_french_5_factor(returns, market_returns, smb, rmw, cma, rf):
    T = len(returns)
    excess_returns = returns - rf
    M = np.column_stack([np.ones(T), market_returns - rf, smb, rmw, cma])
    betas, residuals, rank, sv = np.linalg.lstsq(M, excess_returns, rcond=None)
    alpha, beta_mkt, beta_smb, beta_rmw, beta_cma = betas
    fitted = M @ betas
    ss_res = np.sum((excess_returns - fitted) ** 2)
    ss_tot = np.sum((excess_returns - np.mean(excess_returns)) ** 2)
    r_squared = 1 - ss_res / ss_tot
    adj_r2 = 1 - (1 - r_squared) * (T - 1) / (T - 5 - 1)
    return {
        "alpha": alpha,
        "beta_market": beta_mkt,
        "beta_smb": beta_smb,
        "beta_rmw": beta_rmw,
        "beta_cma": beta_cma,
        "r_squared": r_squared,
        "adj_r_squared": adj_r2,
    }

def five_factor_expected_return(betas, premia):
    """betas and premia are dicts with keys: mkt, smb, rmw, cma"""
    return sum(betas[k] * premia[k] for k in ["mkt", "smb", "rmw", "cma"])`,
  inputOutputSpec: [
    { input: 'returns: stock return series aligned with factor return frequencies', output: 'alpha: Jensen\'s alpha from the 5-factor regression, measuring unexplained abnormal return' },
    { input: 'market_returns: market portfolio return series over the same period', output: 'factor_betas: loadings on MKT, SMB, RMW, and CMA capturing five dimensions of systematic exposure' },
    { input: 'rmw, cma: robust-minus-weak profitability and conservative-minus-aggressive investment factor returns', output: 'r_squared / adj_r_squared: goodness-of-fit measures showing improved explanatory power over FF3' },
    { input: 'rf: risk-free rate series used to compute excess returns', output: 'expected_cost_of_equity: forward-looking equity cost estimate using forecast factor premia and estimated betas' },
  ],
  failureModes: [
    {
      condition: 'HML factor included alongside RMW and CMA, leading to multicollinearity in the factor matrix.',
      consequence: 'Inflated standard errors on factor betas; unstable and unreliable coefficient estimates.',
      mitigation: 'Remove HML from the regression specification or use principal component analysis to orthogonalize factors.',
    },
    {
      condition: 'Operating profitability measure uses accounting data subject to reporting lags and revisions.',
      consequence: 'RMW betas are estimated with measurement error, attenuating the true profitability premium.',
      mitigation: 'Use lagged accounting data (e.g., t-2 reporting convention) and apply measurement-error-robust estimation techniques.',
    },
    {
      condition: 'Investment factor CMA captures corporate behavior that varies sharply across industries (e.g., tech vs. utilities).',
      consequence: 'Cross-industry heterogeneity inflates residual variance and distorts factor premium estimates.',
      mitigation: 'Estimate industry-adjusted CMA or run sector-specific sub-regressions to control for sector effects.',
    },
  ],
});

register({
  id: 'DDM',
  name: 'Dividend Discount Model (Gordon Growth)',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Dividend Discount Model, most commonly in its Gordon Growth form, is one of the oldest and most theoretically grounded equity valuation models, tracing its roots to the work of Myron Gordon in 1959. The model values a stock as the present value of all future dividends, assuming dividends grow at a constant perpetuity rate g. Under the constant-growth assumption, the model reduces to the elegant closed-form expression P = D1 / (k - g), where D1 is the next expected dividend, k is the required rate of return (cost of equity), and g is the perpetual dividend growth rate. The model is most appropriate for mature, stable-dividend-paying companies where the dividend growth rate is expected to remain relatively constant over time. Its primary limitation is its sensitivity to the relationship between k and g: when g approaches k, the estimated price diverges to infinity, requiring careful calibration. Despite its simplicity, the DDM remains a cornerstone of intrinsic valuation and serves as the theoretical foundation for more complex multi-stage dividend discount models.`,
  baselineAssumptions: [
    'The company pays dividends that grow at a constant rate g in perpetuity.',
    'The required rate of return k is greater than the dividend growth rate (k > g).',
    'Dividends are the primary mechanism through which value is returned to shareholders.',
    'The growth rate g is driven by sustainable long-term earnings growth, not short-term fluctuations.',
    'Market conditions and risk premiums remain stable enough to justify a single discount rate.',
  ],
  mathematicalFoundation: [
    'P0 = D1 / (k - g)  (Gordon Growth closed-form solution)',
    'D1 = D0 × (1 + g)  (next period dividend as a function of current dividend and growth)',
    'g = ROE × (1 - payout ratio)  (sustainable growth rate from retention-based growth equation)',
    'k = rf + β × MRP  (cost of equity derived from CAPM for discount rate input)',
  ],
  implementationCode: `import numpy as np

def gordon_growth_ddm(D0, k, g):
    if k <= g:
        raise ValueError("Cost of equity (k) must exceed growth rate (g) for convergence.")
    D1 = D0 * (1 + g)
    fair_value = D1 / (k - g)
    return {"fair_value_per_share": fair_value, "D1": D1}

def multistage_ddm(dividends_forecast, terminal_growth, k, years):
    present_value = 0.0
    for t, div in enumerate(dividends_forecast[:years], start=1):
        present_value += div / ((1 + k) ** t)
    terminal_div = dividends_forecast[min(years, len(dividends_forecast) - 1)] * (1 + terminal_growth)
    terminal_value = terminal_div / (k - terminal_growth)
    present_value += terminal_value / ((1 + k) ** years)
    return {"present_value_of_dividends": present_value, "terminal_value_pv": terminal_value / ((1 + k) ** years), "total_fair_value": present_value}

def implied_growth_rate(D0, k, target_price):
    """Solve for the implied constant growth rate given a target price."""
    from scipy.optimize import brentq
    def objective(g):
        return D0 * (1 + g) / (k - g) - target_price
    return brentq(objective, 0.0001, k - 0.0001)`,
  inputOutputSpec: [
    { input: 'D0: current annual dividend per share paid by the company', output: 'fair_value_per_share: estimated intrinsic value under constant-growth assumptions (P = D1 / (k-g))' },
    { input: 'k: required rate of return (cost of equity) typically derived from CAPM or build-up method', output: 'D1: expected dividend in the next period, serving as the numerator in the Gordon Growth formula' },
    { input: 'g: constant perpetuity growth rate of dividends (must be less than k for model convergence)', output: 'sensitivity_range: fair value under varying assumptions of k and g to produce valuation bands' },
    { input: 'dividends_forecast: projected dividend stream for multi-stage variant over the explicit forecast horizon', output: 'terminal_value_pv: present value of the perpetuity-based terminal value at the horizon date' },
  ],
  failureModes: [
    {
      condition: 'Dividend growth rate g is estimated to be close to or exceeding the cost of equity k.',
      consequence: 'Model produces infinitely large or extremely volatile fair-value estimates with no economic meaning.',
      mitigation: 'Enforce a hard constraint that g < k by at least 200-300 bps; use sensitivity tables or bounded optimization.',
    },
    {
      condition: 'Company does not pay dividends or has a volatile, irregular dividend policy (e.g., tech growth firms).',
      consequence: 'DDM cannot be applied meaningfully; fair value estimate is either undefined or unreliable.',
      mitigation: 'Use DCF or FCFE models instead, or apply a two-stage DDM with an assumed future dividend initiation date.',
    },
    {
      condition: 'Sustainable growth rate g is set above the long-term nominal GDP growth rate without justification.',
      consequence: 'Overestimates future value creation and inflates the intrinsic value estimate significantly.',
      mitigation: 'Cap g at long-term nominal GDP growth (typically 4-6%) and cross-validate with earnings growth history.',
    },
  ],
});

register({
  id: 'DCF',
  name: 'Discounted Cash Flow (WACC-Based Enterprise Valuation)',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Discounted Cash Flow model using the Weighted Average Cost of Capital (WACC) approach is the most widely used intrinsic valuation method in corporate finance and investment banking. The model values the entire enterprise by discounting projected Unlevered Free Cash Flows (UFCF) at the WACC, then subtracting net debt to arrive at equity value. WACC represents the blended cost of capital across all providers of capital—debt holders and equity shareholders—weighted by their respective market-value proportions in the firm's capital structure. The enterprise value derived from the DCF is then allocated to equity holders by subtracting net debt (total debt minus cash and equivalents) and other non-equity claims. This framework is theoretically superior to simpler models because it explicitly accounts for the firm's capital structure, tax shield benefits of debt, and the required return demanded by all capital providers simultaneously. The DCF model's flexibility allows for scenario analysis, sensitivity testing, and incorporation of company-specific growth assumptions, making it indispensable for valuing firms with complex capital structures, changing growth profiles, or non-dividend-paying equities.`,
  baselineAssumptions: [
    'The firm\'s free cash flows can be projected with reasonable accuracy over a 5-10 year explicit forecast horizon.',
    'A terminal value captures the present value of all cash flows beyond the explicit forecast period.',
    'WACC accurately reflects the risk-adjusted blended cost of all capital employed by the firm.',
    'The capital structure (debt-to-equity ratio) used in WACC calculation reflects the target long-run structure.',
    'Tax rates, interest rates, and market risk premia remain relatively stable or can be forecasted over the projection period.',
  ],
  mathematicalFoundation: [
    'EV = Σ(UFCFt / (1+WACC)^t) + TV / (1+WACC)^n  (enterprise value from discounted UFCF plus terminal value)',
    'WACC = (E/V)·ke + (D/V)·kd·(1-T)  (weighted average cost of capital)',
    'UFCF = EBIT×(1-T) + D&A - CapEx - ΔNWC  (unlevered free cash flow calculation)',
    'Equity Value = EV - Net Debt = EV - (Total Debt - Cash & Equivalents)',
  ],
  implementationCode: `import numpy as np
from scipy.optimize import brentq

def wacc_calculation(equity_weight, debt_weight, cost_equity, cost_debt, tax_rate):
    return equity_weight * cost_equity + debt_weight * cost_debt * (1 - tax_rate)

def dcf_valuation(ufcf_projections, terminal_growth, wacc, total_debt, cash):
    n = len(ufcf_projections)
    pv_cashflows = sum(ufcf / ((1 + wacc) ** (t + 1)) for t, ufcf in enumerate(ufcf_projections))
    terminal_ufcf = ufcf_projections[-1] * (1 + terminal_growth)
    terminal_value = terminal_ufcf / (wacc - terminal_growth)
    pv_terminal = terminal_value / ((1 + wacc) ** n)
    enterprise_value = pv_cashflows + pv_terminal
    equity_value = enterprise_value - total_debt + cash
    return {
        "enterprise_value": enterprise_value,
        "pv_cashflows": pv_cashflows,
        "terminal_value": terminal_value,
        "pv_terminal": pv_terminal,
        "equity_value": equity_value,
    }

def sensitivity_matrix(ufcf_projections, growth_range, wacc_range, total_debt, cash):
    matrix = {}
    for g in growth_range:
        for w in wacc_range:
            matrix[(g, w)] = dcf_valuation(ufcf_projections, g, w, total_debt, cash)["equity_value"]
    return matrix

def implied_wacc(equity_value, ufcf_projections, terminal_growth, total_debt, cash):
    def objective(wacc):
        return dcf_valuation(ufcf_projections, terminal_growth, wacc, total_debt, cash)["equity_value"] - equity_value
    return brentq(objective, 0.01, 0.50)`,
  inputOutputSpec: [
    { input: 'ufcf_projections: array of projected unlevered free cash flows for the explicit forecast period (e.g., 5-10 years)', output: 'enterprise_value: total value of the firm\'s operations, representing the present value of all future UFCF' },
    { input: 'terminal_growth: perpetual growth rate of UFCF beyond the forecast horizon (typically 2-4%)', output: 'pv_cashflows: present value of explicitly forecasted free cash flows during the projection period' },
    { input: 'wacc: weighted average cost of capital incorporating equity risk premium, debt cost, and capital structure', output: 'equity_value: estimated total equity value after subtracting net debt from enterprise value' },
    { input: 'total_debt, cash: market values of the firm\'s outstanding debt and liquid cash/equivalents', output: 'sensitivity_matrix: enterprise and equity values under a grid of terminal growth and WACC assumptions' },
  ],
  failureModes: [
    {
      condition: 'Terminal value constitutes more than 80% of total enterprise value, dominating the valuation.',
      consequence: 'Small changes in terminal growth rate or WACC produce massive swings in fair value, undermining reliability.',
      mitigation: 'Cross-check terminal value against a perpetual growth model consistent with GDP growth; use multiples-based sanity check.',
    },
    {
      condition: 'WACC is estimated using current market conditions that differ materially from the firm\'s long-run risk profile.',
      consequence: 'Discount rate is miscalibrated, leading to systematic over- or under-valuation of the enterprise.',
      mitigation: 'Use target capital structure, forward-looking risk-free rates, and scenario-specific WACC for each case.',
    },
    {
      condition: 'Cash flow projections are based on management guidance without independent verification or stress testing.',
      consequence: 'Projections embed optimistic bias, inflating enterprise value beyond what fundamentals support.',
      mitigation: 'Apply top-down cross-checks (e.g., revenue as % of GDP), historical growth rates, and peer-comparable projections.',
    },
  ],
});

register({
  id: 'FCFE',
  name: 'Free Cash Flow to Equity Model',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Free Cash Flow to Equity (FCFE) model values equity directly by discounting the cash flows available specifically to equity holders after all operating expenses, reinvestment needs, and debt obligations have been met. FCFE represents the maximum amount of cash a company could distribute to its shareholders without impairing its operations or financial flexibility. Unlike the DCF/WACC approach which values the entire enterprise first, FCFE discounts at the cost of equity (ke) rather than WACC, providing a more direct equity valuation that is particularly useful when the firm's capital structure changes significantly over time. The model is especially well-suited for valuing financial institutions, banks, and firms with target leverage ratios, as these entities manage debt dynamically and their free cash flows to equity depend explicitly on net borrowing capacity. By capturing the equity-specific cash flows directly, FCFE avoids the double-counting risk inherent in enterprise-value-to-equity conversions when leverage is changing, making it the preferred model for analysts working with variable-capital-structure firms.`,
  baselineAssumptions: [
    'The cost of equity ke accurately reflects the risk borne exclusively by equity holders.',
    'Net borrowing (new debt minus debt repayments) can be projected or is a constant fraction of equity value.',
    'FCFE captures all cash flows distributable to shareholders without impairing operational capacity.',
    'The firm maintains adequate liquidity and does not face distress risk that would alter the debt capacity trajectory.',
    'Reinvestment needs (CapEx and working capital) are forecastable and independent of financing decisions.',
  ],
  mathematicalFoundation: [
    'FCFE = Net Income + D&A - CapEx - ΔNWC + Net Borrowing  (cash flow available to equity holders)',
    'FCFE = EBIT×(1-T) + D&A - CapEx - ΔNWC - Net Debt Repayment + Interest×(1-T)  (alternative unlevered-to-levered form)',
    'Equity Value = Σ(FCFEt / (1+ke)^t) + TV_equity / (1+ke)^n  (present value of FCFE streams)',
    'ke = rf + β_equity × MRP  (cost of equity via CAPM used as the equity-specific discount rate)',
  ],
  implementationCode: `import numpy as np

def fcfe_calculation(net_income, depreciation, capex, delta_nwc, net_debt_issued):
    """Calculate Free Cash Flow to Equity from financial statement inputs."""
    return net_income + depreciation - capex - delta_nwc + net_debt_issued

def fcfe_valuation(fcfe_projections, ke, terminal_growth):
    n = len(fcfe_projections)
    pv_fcfe = sum(cf / ((1 + ke) ** (t + 1)) for t, cf in enumerate(fcfe_projections))
    terminal_fcfe = fcfe_projections[-1] * (1 + terminal_growth)
    terminal_value = terminal_fcfe / (ke - terminal_growth)
    pv_terminal = terminal_value / ((1 + ke) ** n)
    equity_value = pv_fcfe + pv_terminal
    return {
        "equity_value": equity_value,
        "pv_fcfe": pv_fcfe,
        "terminal_value_equity": terminal_value,
        "pv_terminal": pv_terminal,
    }

def fcfe_with_dynamic_leverage(net_income, depreciation, capex, delta_nwc, debt_ratio, ke, terminal_growth):
    """Project FCFE assuming net borrowing is a fixed ratio of reinvestment."""
    net_borrowing = debt_ratio * (capex + delta_nwc - depreciation)
    fcfe = net_income + depreciation - capex - delta_nwc + net_borrowing
    return fcfe

def per_share_fcfe(equity_value, diluted_shares_outstanding):
    return equity_value / diluted_shares_outstanding`,
  inputOutputSpec: [
    { input: 'net_income: reported net income available to common shareholders after preferred dividends', output: 'equity_value: total intrinsic value of the company\'s equity, convertible to per-share value by dividing by share count' },
    { input: 'depreciation, capex, delta_nwc: non-cash charges, capital expenditures, and changes in net working capital', output: 'pv_fcfe: present value of all explicitly forecasted free cash flows to equity during the projection period' },
    { input: 'net_debt_issued: net new borrowing (issuances minus repayments) over the forecast period', output: 'terminal_value_equity: value of all FCFE beyond the explicit horizon, calculated as a growing perpetuity' },
    { input: 'ke: cost of equity discount rate (CAPM-derived) reflecting equity-specific risk, not blended WACC', output: 'per_share_value: estimated fair value per share based on FCFE-derived equity value and diluted share count' },
  ],
  failureModes: [
    {
      condition: 'Net borrowing assumptions are unrealistic (e.g., firm takes on debt it cannot service).',
      consequence: 'FCFE is inflated by assumed net borrowing, producing an overstated equity value.',
      mitigation: 'Cap net borrowing at sustainable leverage ratios; use target debt-to-equity ratios derived from credit ratings.',
    },
    {
      condition: 'Cost of equity ke is estimated using historical betas that do not reflect current risk profile.',
      consequence: 'Discount rate is misaligned with forward-looking risk, distorting the present value of future FCFE.',
      mitigation: 'Use forward-looking implied betas, adjust for target leverage, and incorporate current market risk premium.',
    },
    {
      condition: 'Firm faces financial distress or is near bankruptcy, causing debt capacity to collapse.',
      consequence: 'Net borrowing capacity disappears, and FCFE projections become unreliable as the going-concern assumption fails.',
      mitigation: 'Apply distress-adjusted discount rates or switch to a liquidation-based valuation when financial health deteriorates.',
    },
  ],
});

register({
  id: 'FCFF',
  name: 'Free Cash Flow to Firm Model',
  domain: 'Macro & Cross-Sectional Factor Models',
  domainColor: DOMAIN_COLORS['Macro & Cross-Sectional Factor Models'],
  theoreticalContext: `The Free Cash Flow to Firm (FCFF) model, also known as the Unlevered Free Cash Flow (UFCF) model, values the entire firm by discounting cash flows available to all capital providers—both debt and equity holders—at the WACC. FCFF represents the cash generated by operations that is distributable to all investors after covering operating expenses and necessary reinvestment, but before any debt service payments. This makes FCFF conceptually superior for valuing firms with changing capital structures, as it isolates operational cash generation capacity from financing decisions. The FCFF approach is the preferred method for valuing private companies, project finance, and leveraged buyouts where the capital structure is expected to change materially over time. By valuing the firm on an unlevered basis, FCFF avoids the complications of projecting debt schedules and interest tax shields, which are instead captured implicitly through the WACC discount rate. The model is particularly robust when applied to multi-business conglomerates or firms undergoing restructuring, where debt levels and financing mix are in flux.`,
  baselineAssumptions: [
    'The firm\'s unlevered free cash flows are forecastable over a meaningful explicit projection period.',
    'WACC remains a valid discount rate throughout the projection period, reflecting the evolving capital structure.',
    'Operating cash flows are independent of financing decisions in the unlevered framework.',
    'Terminal value captures the long-run competitive equilibrium and steady-state cash flow generation.',
    'Capital expenditures and working capital requirements are driven by revenue growth, not financing constraints.',
  ],
  mathematicalFoundation: [
    'FCFF = EBIT×(1-T) + D&A - CapEx - ΔNWC  (unlevered free cash flow to all capital providers)',
    'WACC = (E/V)·ke + (D/V)·kd·(1-T)  (blended discount rate reflecting all sources of capital)',
    'Enterprise Value = Σ(FCFFt / (1+WACC)^t) + TV / (1+WACC)^n  (present value of all future FCFF)',
    'Terminal Value = FCFFn × (1+g) / (WACC - g)  (Gordon Growth terminal value based on steady-state FCFF)',
  ],
  implementationCode: `import numpy as np

def fcff_calculation(ebit, tax_rate, depreciation, capex, delta_nwc):
    """Calculate Free Cash Flow to Firm from operating inputs."""
    nopat = ebit * (1 - tax_rate)
    return nopat + depreciation - capex - delta_nwc

def fcff_valuation(fcff_projections, wacc, terminal_growth, total_debt, non_equity_claims, shares):
    n = len(fcff_projections)
    pv_fcff = sum(cf / ((1 + wacc) ** (t + 1)) for t, cf in enumerate(fcff_projections))
    terminal_fcff = fcff_projections[-1] * (1 + terminal_growth)
    terminal_value = terminal_fcff / (wacc - terminal_growth)
    pv_terminal = terminal_value / ((1 + wacc) ** n)
    enterprise_value = pv_fcff + pv_terminal
    equity_value = enterprise_value - total_debt + non_equity_claims
    per_share = equity_value / shares
    return {
        "enterprise_value": enterprise_value,
        "pv_fcff": pv_fcff,
        "terminal_value": terminal_value,
        "equity_value": equity_value,
        "per_share_value": per_share,
    }

def wacc_from_components(cost_equity, cost_debt, tax_rate, equity_value, debt_value):
    total_value = equity_value + debt_value
    we = equity_value / total_value
    wd = debt_value / total_value
    return we * cost_equity + wd * cost_debt * (1 - tax_rate)

def cross_check_fcff_dcf(enterprise_value_fcff, enterprise_value_dcf, tolerance=0.05):
    """Verify FCFF and DCF enterprise values are within tolerance."""
    pct_diff = abs(enterprise_value_fcff - enterprise_value_dcf) / enterprise_value_dcf
    return {"within_tolerance": pct_diff <= tolerance, "pct_difference": pct_diff}`,
  inputOutputSpec: [
    { input: 'ebit: earnings before interest and taxes representing operating profitability of the firm', output: 'enterprise_value: total value of the firm\'s operations to all capital providers, derived from discounted FCFF streams' },
    { input: 'tax_rate: effective corporate tax rate applied to EBIT to compute NOPAT (Net Operating Profit After Tax)', output: 'pv_fcff: present value of all explicitly forecasted unlevered free cash flows during the projection period' },
    { input: 'capex, delta_nwc: capital expenditures and working capital changes needed to sustain projected revenue growth', output: 'equity_value: enterprise value adjusted for debt and non-equity claims, representing value attributable to common shareholders' },
    { input: 'wacc: blended cost of capital incorporating equity risk, debt cost, tax shields, and target capital structure', output: 'per_share_value: fair value per share after dividing equity value by diluted shares outstanding' },
  ],
  failureModes: [
    {
      condition: 'WACC is held constant while the firm\'s actual leverage ratio changes materially over the projection period.',
      consequence: 'Valuation misprices risk because the discount rate does not reflect the evolving capital structure.',
      mitigation: 'Recalculate WACC each year using projected target leverage ratios; use APV (Adjusted Present Value) for extreme leverage changes.',
    },
    {
      condition: 'CapEx and working capital projections are disconnected from revenue growth assumptions.',
      consequence: 'FCFF is either overstated (under-investment) or understated (excessive investment), distorting enterprise value.',
      mitigation: 'Anchor CapEx and NWC assumptions to historical intensity ratios and validate against peer benchmarks.',
    },
    {
      condition: 'Terminal value is based on a growth rate that exceeds the firm\'s sustainable long-run return on invested capital.',
      consequence: 'Terminal value dominates the valuation with economically implausible perpetuity assumptions.',
      mitigation: 'Enforce g < ROIC and cross-validate terminal value against comparable multiples (EV/EBITDA, EV/Revenue).',
    },
  ],
});
