import type { FormulaDef } from '../components/FormulaModal'

export const BS_FORMULAS: FormulaDef[] = [
  {
    label: 'Call Price',
    tex: String.raw`C = S_0 N(d_1) - K e^{-rT} N(d_2)`,
  },
  {
    label: 'Put Price',
    tex: String.raw`P = K e^{-rT} N(-d_2) - S_0 N(-d_1)`,
  },
  {
    label: 'd₁',
    tex: String.raw`d_1 = \frac{\ln(S_0 / K) + \left(r + \frac{\sigma^2}{2}\right) T}{\sigma \sqrt{T}}`,
  },
  {
    label: 'd₂',
    tex: String.raw`d_2 = d_1 - \sigma \sqrt{T}`,
  },
  {
    label: 'Delta (call)',
    tex: String.raw`\Delta_c = N(d_1)`,
  },
]

export const HESTON_FORMULAS: FormulaDef[] = [
  {
    label: 'Stock SDE',
    tex: String.raw`dS_t = r S_t\, dt + \sqrt{v_t}\, S_t\, dW_t^{(1)}`,
  },
  {
    label: 'Variance SDE',
    tex: String.raw`dv_t = \kappa\left(\theta - v_t\right) dt + \sigma_v \sqrt{v_t}\, dW_t^{(2)},\quad \rho = \text{corr}(dW^{(1)}, dW^{(2)})`,
  },
  {
    label: 'Forward Variance',
    tex: String.raw`\mathbb{E}[v_T] = \theta + (v_0 - \theta) e^{-\kappa T}`,
  },
  {
    label: 'Feller Condition',
    tex: String.raw`2\kappa\theta \geq \sigma_v^2`,
  },
  {
    label: 'Full-Truncation Euler (2D paths)',
    tex: String.raw`v_{t+1} = v_t + \kappa(\theta - v_t^{+})\Delta t + \sigma_v\sqrt{v_t^{+}\Delta t}\,Z_2`,
  },
  {
    label: 'References',
    ref: `Heston, S. (1993), "A Closed-Form Solution for Options with Stochastic Volatility", Rev. Fin. Studies 6(2), 327–343 — Table 1.
Bates, D. (1996), "Jumps and Stochastic Volatility", Rev. Fin. Studies 9(1), 69–107.
Bakshi, Cao & Chen (1997), J. Finance 52(5), 2003–2049 — stochastic-volatility parameter set.
Albrecher, Mayer, Schoutens & Tistaert (2006/07), "The Little Heston Trap" — the call price must take the φ₂ root with ψ on the (−∞,−1) branch; the naive principal square root mis-prices whenever 2κθ < σ². This implementation uses the trap-safe root.
Andersen, Lake & Offengenden (2016) — fully truncated Heston characteristic function.

The 2D PATHS view is a Monte Carlo simulation of the two SDEs above: full truncation (v+ = max(v,0)) in the drift and the diffusion, log-Euler for spot, 60 steps, mulberry32 seeded so a run is reproducible.`,
  },
]

export const BL_FORMULAS: FormulaDef[] = [
  {
    label: 'Equilibrium Returns',
    tex: String.raw`\Pi = \lambda\, \Sigma\, w_{mkt}`,
  },
  {
    label: 'Posterior Returns',
    tex: String.raw`\mu^{*} = \left[(\tau\Sigma)^{-1} + P^\top \Omega^{-1} P\right]^{-1} \left[(\tau\Sigma)^{-1} \Pi + P^\top \Omega^{-1} Q\right]`,
  },
  {
    label: 'Posterior Covariance',
    tex: String.raw`\Sigma^{*} = \Sigma + \left[(\tau\Sigma)^{-1} + P^\top \Omega^{-1} P\right]^{-1}`,
  },
]

export const MC_FORMULAS: FormulaDef[] = [
  {
    label: 'Geometric Brownian Motion',
    tex: String.raw`S_t = S_0 \exp\left(\left(\mu - \frac{\sigma^2}{2}\right) t + \sigma W_t\right)`,
  },
  {
    label: 'CRRA Expected Utility',
    tex: String.raw`\mathbb{E}[U(W)] = \begin{cases} \frac{W^{1-\gamma} - 1}{1 - \gamma}, & \gamma \neq 1 \\ \ln W, & \gamma = 1 \end{cases}`,
  },
  {
    label: '95% Confidence Interval',
    tex: String.raw`\bar{W} \pm 1.96\, \frac{s_W}{\sqrt{N}}`,
  },
]

export const APT_FORMULAS: FormulaDef[] = [
  {
    label: 'Linear Factor Model',
    tex: String.raw`\mathbb{E}[R_i] = r_f + \beta_i^{M} \lambda_{M} + \beta_i^{S} \lambda_{S} + \beta_i^{V} \lambda_{V} + \alpha_i`,
  },
  {
    label: 'Expected Return',
    tex: String.raw`\mathbb{E}[R] = r + \beta_M \lambda_M + \beta_S \lambda_S + \beta_V \lambda_V`,
  },
]

export const KF_FORMULAS: FormulaDef[] = [
  {
    label: 'State Transition',
    tex: String.raw`\mathbf{x}_t = \mathbf{F}\mathbf{x}_{t-1} + \mathbf{w}_t, \quad \mathbf{w}_t \sim \mathcal{N}(\mathbf{0}, \mathbf{Q})`,
  },
  {
    label: 'Observation',
    tex: String.raw`y_t = \mathbf{H}\mathbf{x}_t + v_t, \quad v_t \sim \mathcal{N}(0, R)`,
  },
  {
    label: 'Predict State',
    tex: String.raw`\hat{\mathbf{x}}_{t|t-1} = \mathbf{F}\hat{\mathbf{x}}_{t-1|t-1}`,
  },
  {
    label: 'Predict Covariance',
    tex: String.raw`\mathbf{P}_{t|t-1} = \mathbf{F}\mathbf{P}_{t-1}\mathbf{F}' + \mathbf{Q}`,
  },
  {
    label: 'Kalman Gain',
    tex: String.raw`\mathbf{K}_t = \mathbf{P}_{t|t-1}\mathbf{H}'(\mathbf{H}\mathbf{P}_{t|t-1}\mathbf{H}' + \mathbf{R})^{-1}`,
  },
  {
    label: 'Update State',
    tex: String.raw`\hat{\mathbf{x}}_{t|t} = \hat{\mathbf{x}}_{t|t-1} + \mathbf{K}_t(y_t - \mathbf{H}\hat{\mathbf{x}}_{t|t-1})`,
  },
  {
    label: 'Update Covariance',
    tex: String.raw`\mathbf{P}_{t|t} = (\mathbf{I} - \mathbf{K}_t\mathbf{H})\mathbf{P}_{t|t-1}`,
  },
]
