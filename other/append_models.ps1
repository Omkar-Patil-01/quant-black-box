$ErrorActionPreference = "Stop"

# Read academyData.ts
$academyData = Get-Content "C:\New folder\Model-terminal\src\shared\academyData.ts" -Raw

# === DOMAIN 1: macro_factor_models.ts ===
$d1 = Get-Content "C:\New folder\macro_factor_models.ts" -Raw
$d1 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 1: Factor Models`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d1

# === DOMAIN 2: tool_f90291cc ===
$d2raw = Get-Content "C:\Users\Pavan\.local\share\opencode\tool-output\tool_f90291ccf001kSsOuREIz9ISwV" -Raw
$d2 = ""
if ($d2raw -match '````typescript\r?\n([\s\S]*?)\r?\n````') { $d2 = $Matches[1] }
# Fix IDs
$d2 = $d2 -replace "id: 'ARIMA'", "id: 'ARIMA'"
$d2 = $d2 -replace "id: 'GARCH'", "id: 'GARCH'"
$d2 = $d2 -replace "id: 'VAR_ECONOMETRIC'", "id: 'VAR_ECONOMETRIC'"
$d2 = $d2 -replace "id: 'ECM'", "id: 'ECM'"
$d2 = $d2 -replace "id: 'KALMAN_FILTER'", "id: 'KALMAN_FILTER'"
$d2 = $d2 -replace "id: 'GRANGER_CAUSALITY'", "id: 'GRANGER_CAUSALITY'"
$d2 = $d2 -replace "id: 'BOLLINGER_BANDS'", "id: 'BOLLINGER_BANDS'"
$d2 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 2: Statistical Arbitrage & Econometrics`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d2

# === DOMAIN 3: tool_f902ea8a ===
$d3raw = Get-Content "C:\Users\Pavan\.local\share\opencode\tool-output\tool_f902ea8a3001IcB8KMdQhjLwRe" -Raw
$d3 = ""
if ($d3raw -match '````typescript\r?\n([\s\S]*?)\r?\n````') { $d3 = $Matches[1] }
# Fix IDs
$d3 = $d3 -replace "id: 'binomial'", "id: 'BINOMIAL'"
$d3 = $d3 -replace "id: 'heston'", "id: 'HESTON'"
$d3 = $d3 -replace "id: 'sabr'", "id: 'SABR'"
$d3 = $d3 -replace "id: 'local_vol'", "id: 'LOCAL_VOL'"
$d3 = $d3 -replace "id: 'vix_variance'", "id: 'VIX_VARIANCE'"
$d3 = $d3 -replace "id: 'lmm'", "id: 'LMM'"
$d3 = $d3 -replace "id: 'heston_nandi'", "id: 'HESTON_NANDI'"
$d3 = $d3 -replace "id: 'rough_bergomi'", "id: 'ROUGH_BERGOMI'"
$d3 = $d3 -replace "id: 'vanna_volga'", "id: 'VANNA_VOLGA'"
$d3 = $d3 -replace "id: 'hull_white'", "id: 'HULL_WHITE'"
$d3 = $d3 -replace "id: 'black_karasinski'", "id: 'BLACK_KARASINSKI'"
$d3 = $d3 -replace "id: 'lsv_model'", "id: 'LSV_MODEL'"
$d3 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 3: Derivatives Pricing & Volatility`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d3

# === DOMAIN 4: tool_f9034bcb ===
$d4raw = Get-Content "C:\Users\Pavan\.local\share\opencode\tool-output\tool_f9034bcbc001gmpb5jAy5HZ0qB" -Raw
$d4 = ""
if ($d4raw -match '````typescript\r?\n([\s\S]*?)\r?\n````') { $d4 = $Matches[1] }
$d4 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 4: Portfolio Construction & Risk Management`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d4

# === DOMAIN 5: model-registrations.ts ===
$d5raw = Get-Content "C:\New folder\Model-terminal\docs\model-registrations.ts" -Raw
# Remove comment headers
$d5 = $d5raw -replace '// =============================================================================\r?\n// MODEL REGISTRATIONS.*?\r?\n// =============================================================================\r?\n\r?\n', ''
$d5 = $d5 -replace '// ───.*?─────────────────────────────────────────────────────\r?\n', ''
$d5 = $d5 -replace '// ───.*?─────────────────────────────────────\r?\n', ''
# Fix IDs
$d5 = $d5 -replace "id: 'vwap-twap'", "id: 'VWAP_TWAP'"
$d5 = $d5 -replace "id: 'implementation-shortfall'", "id: 'IMPLEMENTATION_SHORTFALL'"
$d5 = $d5 -replace "id: 'lob-simulation'", "id: 'LOB_SIMULATION'"
$d5 = $d5 -replace "id: 'tca'", "id: 'TCA'"
$d5 = $d5 -replace "id: 'glosten-milgrom'", "id: 'GLOSTEN_MILGROM'"
$d5 = $d5 -replace "id: 'kyle-lambda'", "id: 'KYLE_LAMBDA'"
$d5 = $d5 -replace "id: 'price-impact-amihud'", "id: 'PRICE_IMPACT_AMIHUD'"
$d5 = $d5 -replace "id: 'pin-model'", "id: 'PIN_MODEL'"
$d5 = $d5 -replace "id: 'vpin-model'", "id: 'VPIN_MODEL'"
$d5 = $d5 -replace "id: 'mrr-model'", "id: 'MRR_MODEL'"
$d5 = $d5 -replace "id: 'asymmetric-amihud'", "id: 'ASYMMETRIC_AMIHUD'"
$d5 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 5: Market Microstructure`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d5

# === DOMAIN 6: tool_f9045b53 ===
$d6raw = Get-Content "C:\Users\Pavan\.local\share\opencode\tool-output\tool_f9045b53c001ZwT6pNOwkJ46Xm" -Raw
$d6 = ""
if ($d6raw -match '````typescript\r?\n([\s\S]*?)\r?\n````') { $d6 = $Matches[1] }
$d6 = "`n// ═══════════════════════════════════════════════════════════════════════`n// Domain 6: Machine Learning & Alternative Data`n// ═══════════════════════════════════════════════════════════════════════`n`n" + $d6

# === DOMAIN 7: Generate 3 entries ===
$d7 = @'

// ═══════════════════════════════════════════════════════════════════════
// Domain 7: Advanced Portfolio & Alternative Risk
// ═══════════════════════════════════════════════════════════════════════

register({
  id: 'DEEP_HEDGING_RL',
  name: 'Deep Hedging with Reinforcement Learning',
  domain: 'Bleeding Edge & Quantum Finance',
  domainColor: DOMAIN_COLORS['Bleeding Edge & Quantum Finance'],
  theoreticalContext: `Deep Hedging with Reinforcement Learning learns optimal hedging policies for derivative portfolios by training a neural network policy in a simulated market environment. Unlike classical delta-hedging which assumes Black-Scholes dynamics and continuous rebalancing, the RL agent learns a non-linear mapping from market state observations (spot price, time to expiry, current hedge position) to hedging actions that minimize expected PnL variance under realistic transaction costs. The policy network is trained using policy gradient methods (PDE-constrained RL) where the reward function penalizes both unhedged risk and excessive trading costs. The key insight is that transaction costs create a fundamental trade-off: frequent rebalancing reduces risk but incurs costs, while infrequent rebalancing saves costs but increases exposure. The learned policy naturally discovers optimal rebalancing frequency, hedge ratios, and risk aversion that depend on the current market state — capabilities that closed-form BSM delta cannot provide. Empirical results show that deep hedging produces 20-40% lower hedging error than BSM delta in the presence of transaction costs, with the advantage growing as costs increase.`,
  baselineAssumptions: [
    'The policy network π_θ(a|s) can approximate the optimal hedging strategy from observed market states.',
    'The simulated market environment (GBM or local vol) is a reasonable approximation of the true data-generating process.',
    'Transaction costs are proportional to trade size and known to the agent during training.',
    'The agent observes the current spot price, time to maturity, and existing hedge position at each rebalancing step.',
    'The reward function based on PnL variance (or Sharpe ratio) correctly captures the hedging objective.',
    'The training environment provides sufficient episode diversity to generalize to unseen market conditions.',
  ],
  mathematicalFoundation: [
    'min_θ E[Σ_{t=0}^{T-1} β^t · PnL_t(δ_t^θ)] — expected discounted PnL objective',
    'PnL_t = δ_{t-1}(S_t - S_{t-1}) - c · S_t |δ_t - δ_{t-1}| — per-step PnL with transaction costs',
    'π_θ(δ_t | S_t, t, δ_{t-1}) = Neural network policy mapping state to hedge position',
    'L_θ = E_π[Σ_t ∇_θ log π_θ(a_t|s_t) · R_t] — policy gradient update',
    'Variance reduction = 1 - Var(PnL_RL) / Var(PnL_BSM) — improvement over BSM delta benchmark',
  ],
  implementationCode: `import numpy as np
from scipy.stats import norm

def simulate_gbm(S0, r, sigma, T, n_steps, n_paths):
    dt = T / n_steps
    Z = np.random.standard_normal((n_paths, n_steps))
    increments = (r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z
    S = np.zeros((n_paths, n_steps + 1))
    S[:, 0] = S0
    S[:, 1:] = S0 * np.exp(np.cumsum(increments, axis=1))
    return S

def deep_hedge_episode(S, K, T, r, sigma, cost_rate, n_steps, policy):
    n_paths = S.shape[0]
    dt = T / n_steps
    hedge = np.zeros(n_paths)
    pnl = np.zeros(n_paths)
    positions = []

    for t in range(n_steps):
        state = np.column_stack([
            S[:, t] / K,
            np.full(n_paths, (n_steps - t) / n_steps),
            hedge
        ])
        target_hedge = policy(state)
        trades = target_hedge - hedge
        trade_cost = cost_rate * np.abs(trades) * S[:, t]
        pnl += hedge * np.diff(S[:, t:t+2], axis=1).flatten() - trade_cost
        hedge = target_hedge
        positions.append(hedge.copy())

    pnl += hedge * (np.maximum(S[:, -1] - K, 0) - np.maximum(S[:, 0] - K, 0))
    return pnl, np.array(positions)

def simple_policy_nn(state, weights, biases):
    x = state
    for i in range(len(weights) - 1):
        x = np.maximum(0, x @ weights[i] + biases[i])
    return np.tanh(x @ weights[-1] + biases[-1]).flatten() * 2.0

def train_deep_hedge(S0, K, T, r, sigma, cost_rate, n_steps=50, n_episodes=200):
    S = simulate_gbm(S0, r, sigma, T, n_steps, n_episodes)
    np.random.seed(42)
    input_dim = 3
    hidden_dim = 32
    weights = [
        np.random.randn(input_dim, hidden_dim) * 0.01,
        np.random.randn(hidden_dim, hidden_dim) * 0.01,
        np.random.randn(hidden_dim, 1) * 0.01,
    ]
    biases = [
        np.zeros(hidden_dim),
        np.zeros(hidden_dim),
        np.zeros(1),
    ]

    lr = 0.001
    best_var = np.inf
    for ep in range(min(n_episodes, 50)):
        pnl, _ = deep_hedge_episode(S, K, T, r, sigma, cost_rate, n_steps,
                                      lambda s: simple_policy_nn(s, weights, biases))
        var = np.var(pnl)
        if var < best_var:
            best_var = var
    return {
        'pnl_std': np.sqrt(best_var),
        'pnl_mean': np.mean(pnl),
        'sharpe': np.mean(pnl) / np.sqrt(best_var) if best_var > 0 else 0,
    }
`,
  inputOutputSpec: [
    { input: 'S0, K, T, r, σ — option and market parameters for hedging environment', output: 'Hedged PnL distribution across simulated episodes with reduced variance vs BSM delta' },
    { input: 'Transaction cost rate c — proportional cost per unit traded', output: 'Learned rebalancing policy that adapts frequency to market state and cost level' },
    { input: 'Hedging steps N — number of discrete rebalancing points', output: 'Hedge position trajectory δ_t showing state-dependent optimal actions' },
    { input: 'Policy network architecture (hidden layers, activation)', output: 'Training reward curve showing convergence to optimal hedging performance' },
    { input: 'Number of training episodes E — affects policy convergence quality', output: 'PnL variance reduction percentage relative to BSM delta benchmark' },
  ],
  failureModes: [
    { condition: 'Simulated environment does not match real market dynamics (model risk)', consequence: 'Learned policy performs well in simulation but poorly in live hedging due to distribution shift', mitigation: 'Use ensemble of simulation models (GBM + local vol + rough vol); apply domain randomization during training' },
    { condition: 'Transaction cost rate is miscalibrated relative to actual execution costs', consequence: 'Policy either over-hedges (costs too low) or under-hedges (costs too high) in production', mitigation: 'Use adaptive cost estimation from recent execution data; retrain periodically with realized cost distribution' },
    { condition: 'Insufficient training episodes leading to poor policy convergence', consequence: 'Policy network underfits and produces suboptimal hedge ratios with high variance', mitigation: 'Monitor training loss convergence; use curriculum learning with increasing complexity; validate on held-out episodes' },
    { condition: 'Distribution shift in market regimes not seen during training', consequence: 'Policy fails catastrophically during extreme events (flash crashes, volatility spikes)', mitigation: 'Include stress scenarios in training data; add a risk overlay that reverts to BSM delta during extreme regimes' },
  ],
});

register({
  id: 'PPO_ALGORITHM',
  name: 'Proximal Policy Optimization',
  domain: 'Bleeding Edge & Quantum Finance',
  domainColor: DOMAIN_COLORS['Bleeding Edge & Quantum Finance'],
  theoreticalContext: `Proximal Policy Optimization (PPO), introduced by Schulman et al. (2017) at OpenAI, is a policy gradient method that achieves reliable training stability by constraining policy updates to stay within a trust region around the previous policy. PPO addresses the fundamental challenge in RL that large policy updates can cause catastrophic performance collapse, while overly conservative updates lead to slow convergence. The clipped surrogate objective L^CLIP(θ) = E_t[min(r_t(θ) A_t, clip(r_t(θ), 1-ε, 1+ε) A_t)] ensures that the probability ratio r_t(θ) = π_θ(a|s) / π_θ_old(a|s) stays within [1-ε, 1+ε], where ε is typically 0.1-0.2. This simple clipping mechanism provides the stability of Trust Region Policy Optimization (TRPO) without requiring second-order optimization or complex constraint handling. In financial applications, PPO is used to train agents for portfolio optimization, optimal execution, dynamic hedging, and market making, where the action space is continuous (trade sizes, rebalancing amounts) and the reward signal is noisy (stochastic returns). PPO's advantage over DQN or A2C in these settings is its sample efficiency and stable convergence, which are critical when each training episode involves expensive Monte Carlo simulation of market dynamics.`,
  baselineAssumptions: [
    'The policy π_θ(a|s) is parameterized by a neural network with differentiable outputs.',
    'The clipping parameter ε ∈ [0.1, 0.2] provides sufficient trust region constraint without being overly restrictive.',
    'Advantage estimates A_t are computed via Generalized Advantage Estimation (GAE) with discount factor γ and λ.',
    'The environment provides scalar reward signals at each time step that correlate with the long-term objective.',
    'Mini-batch updates over collected trajectories provide sufficient gradient signal per iteration.',
    'The action space is continuous and bounded, suitable for Gaussian policy parameterization.',
  ],
  mathematicalFoundation: [
    'L^CLIP(θ) = E_t[min(r_t(θ) A_t, clip(r_t(θ), 1-ε, 1+ε) A_t)] — clipped surrogate objective',
    'r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t) — probability ratio between new and old policy',
    'Â_t = Σ_{l=0}^{T-t} (γλ)^l δ_{t+l},  δ_t = r_t + γV(s_{t+1}) - V(s_t) — GAE advantage estimation',
    'L^VF(θ) = (V_θ(s_t) - V_t^target)^2 — value function loss for critic training',
    'L(θ) = L^CLIP(θ) - c_1 L^VF(θ) + c_2 S[π_θ] — total loss with entropy bonus',
  ],
  implementationCode: `import numpy as np

class PPOAgent:
    def __init__(self, state_dim, action_dim, hidden=64, lr=3e-4, gamma=0.99,
                 lam=0.95, clip_eps=0.2, epochs=10, batch_size=64):
        self.gamma = gamma
        self.lam = lam
        self.clip_eps = clip_eps
        self.epochs = epochs
        self.batch_size = batch_size

        scale1 = np.sqrt(2.0 / state_dim)
        self.W1 = np.random.randn(state_dim, hidden) * scale1
        self.b1 = np.zeros(hidden)
        self.W2 = np.random.randn(hidden, hidden) * np.sqrt(2.0 / hidden)
        self.b2 = np.zeros(hidden)
        self.W_mu = np.random.randn(hidden, action_dim) * 0.01
        self.b_mu = np.zeros(action_dim)
        self.W_v = np.random.randn(hidden, 1) * 0.01
        self.b_v = np.zeros(1)
        self.W_logstd = np.zeros(action_dim)
        self.lr = lr

    def _forward(self, s):
        h = np.maximum(0, s @ self.W1 + self.b1)
        h = np.maximum(0, h @ self.W2 + self.b2)
        mu = h @ self.W_mu + self.b_mu
        v = (h @ self.W_v + self.b_v).flatten()
        log_std = self.W_logstd
        return mu, log_std, v

    def get_action(self, s):
        mu, log_std, v = self._forward(s.reshape(1, -1))
        std = np.exp(log_std)
        action = mu + std * np.random.randn(*mu.shape)
        return np.clip(action.flatten(), -2, 2), v[0]

    def compute_gae(self, rewards, values, dones):
        T = len(rewards)
        advantages = np.zeros(T)
        last_gae = 0
        for t in reversed(range(T)):
            next_val = values[t + 1] if t + 1 < T else 0
            delta = rewards[t] + self.gamma * next_val * (1 - dones[t]) - values[t]
            advantages[t] = last_gae = delta + self.gamma * self.lam * (1 - dones[t]) * last_gae
        returns = advantages + values[:T]
        return advantages, returns

    def update(self, states, actions, old_log_probs, advantages, returns):
        for _ in range(self.epochs):
            mu, log_std, v_pred = self._forward(states)
            std = np.exp(log_std)
            new_log_probs = -0.5 * ((actions - mu) / (std + 1e-8))**2 - np.log(std + 1e-8)
            new_log_probs = new_log_probs.sum(axis=-1)
            ratios = np.exp(new_log_probs - old_log_probs)
            clipped = np.clip(ratios, 1 - self.clip_eps, 1 + self.clip_eps)
            surr1 = ratios * advantages
            surr2 = clipped * advantages
            policy_loss = -np.mean(np.minimum(surr1, surr2))
            value_loss = np.mean((v_pred[:len(returns)] - returns)**2)
            loss = policy_loss + 0.5 * value_loss
        return loss
`,
  inputOutputSpec: [
    { input: 'State vector s_t — market observations (prices, positions, indicators)', output: 'Action a_t — continuous trading signal or position size from Gaussian policy' },
    { input: 'Reward r_t — portfolio return, Sharpe ratio improvement, or PnL-based signal', output: 'Value estimate V(s_t) — expected future cumulative reward from current state' },
    { input: 'GAE parameters γ (discount) and λ (advantage decay)', output: 'Advantage estimates Â_t quantifying how much better action a_t was than average' },
    { input: 'Clipping parameter ε — trust region half-width for policy updates', output: 'Clipped surrogate objective ensuring stable monotonic policy improvement' },
    { input: 'Training epochs and batch size — controls gradient update frequency', output: 'Policy loss and value loss curves showing training convergence' },
  ],
  failureModes: [
    { condition: 'Clip parameter ε too large (> 0.3)', consequence: 'Policy updates are too aggressive, causing instability similar to vanilla policy gradient', mitigation: 'Reduce ε to 0.1-0.2; increase the number of epochs per update to compensate for smaller steps' },
    { condition: 'Advantage estimates have high bias or variance', consequence: 'Policy gradient direction is unreliable, leading to slow or incorrect convergence', mitigation: 'Use GAE with λ ≈ 0.95 for bias-variance balance; compute advantages over complete episodes only' },
    { condition: 'Reward signal is too sparse or noisy for the financial environment', consequence: 'Agent cannot distinguish good from bad actions, resulting in random policy behavior', mitigation: 'Dense the reward with intermediate signals (per-period Sharpe); use reward shaping with potential-based adjustments' },
    { condition: 'Exploration is insufficient — policy converges to a local optimum', consequence: 'Agent misses better strategies that require departing from the initial policy', mitigation: 'Add entropy bonus to the objective; initialize policy with larger action noise; use multiple random seeds for training' },
    { condition: 'State representation is incomplete or contains look-ahead bias', consequence: 'Policy performs well in backtest but fails in live trading due to information leakage', mitigation: 'Use only past information in state; add random delays to observations; validate with walk-forward out-of-sample testing' },
  ],
});

register({
  id: 'DQN_AGENT',
  name: 'Deep Q-Network Agent',
  domain: 'Bleeding Edge & Quantum Finance',
  domainColor: DOMAIN_COLORS['Bleeding Edge & Quantum Finance'],
  theoreticalContext: `The Deep Q-Network (DQN), introduced by Mnih et al. (2015) from DeepMind, combines Q-learning with deep neural networks to approximate the action-value function Q(s, a) in high-dimensional state spaces. The key innovations that enabled stable training of deep RL agents are experience replay — storing transitions (s, a, r, s') in a replay buffer and sampling random mini-batches to break temporal correlations — and a target network — a periodically updated copy of the Q-network that provides stable targets for the Bellman backup. The loss function L = E[(r + γ max_a' Q_target(s', a') - Q(s, a))²] minimizes the temporal difference error between the current Q-estimate and the bootstrapped target. In financial applications, DQN is particularly suited to discrete action spaces: for example, choosing between {buy, hold, sell} at each time step, or selecting among a finite set of position sizes. The discrete nature of DQN makes it interpretable for traders who want to understand which market conditions trigger specific actions. Extensions like Double DQN (decoupling action selection from evaluation) and Dueling DQN (separating state value from action advantage) further improve performance in noisy financial environments.`,
  baselineAssumptions: [
    'The Q-function Q(s, a) can be approximated by a neural network with sufficient capacity.',
    'The discrete action space is small enough (typically < 10 actions) for Q-value enumeration.',
    'Experience replay with random mini-batches provides i.i.d. samples that stabilize training.',
    'The target network is updated every C steps (C ≈ 1000) to provide stationary regression targets.',
    'The discount factor γ is chosen to balance immediate rewards against long-term value accumulation.',
    'The ε-greedy exploration strategy decays from ε=1.0 to ε=0.01 over training to balance exploration and exploitation.',
  ],
  mathematicalFoundation: [
    'Q(s, a) = E[r + γ max_a' Q(s', a') | s, a] — Bellman optimality equation',
    'L(θ) = E[(r + γ max_a' Q_target(s', a'; θ⁻) - Q(s, a; θ))²] — DQN temporal difference loss',
    'Q_target uses θ⁻ (target network parameters) updated every C steps — reduces bootstrapping instability',
    'π*(s) = argmax_a Q(s, a) — greedy policy derived from learned Q-function',
    'ε-greedy: π(s) = random action with prob ε, argmax_a Q(s, a) with prob 1-ε — exploration strategy',
    'Double DQN: a* = argmax_a Q(s', a; θ), target = r + γ Q(s', a*; θ⁻) — decoupled action selection',
  ],
  implementationCode: `import numpy as np
from collections import deque

class DQNAgent:
    def __init__(self, state_dim, n_actions=3, hidden=64, lr=1e-3,
                 gamma=0.99, epsilon_start=1.0, epsilon_end=0.01,
                 epsilon_decay=0.995, buffer_size=10000, batch_size=32,
                 target_update=100):
        self.n_actions = n_actions
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update = target_update
        self.memory = deque(maxlen=buffer_size)
        self.steps = 0

        s1 = np.sqrt(2.0 / state_dim)
        self.W1 = np.random.randn(state_dim, hidden) * s1
        self.b1 = np.zeros(hidden)
        self.W2 = np.random.randn(hidden, hidden) * np.sqrt(2.0 / hidden)
        self.b2 = np.zeros(hidden)
        self.W_out = np.random.randn(hidden, n_actions) * 0.01
        self.b_out = np.zeros(n_actions)

        self.W1_t = self.W1.copy()
        self.b1_t = self.b1.copy()
        self.W2_t = self.W2.copy()
        self.b2_t = self.b2.copy()
        self.W_out_t = self.W_out.copy()
        self.b_out_t = self.b_out.copy()
        self.lr = lr

    def _q_values(self, s, W1, b1, W2, b2, W_out, b_out):
        h = np.maximum(0, s @ W1 + b1)
        h = np.maximum(0, h @ W2 + b2)
        return h @ W_out + b_out

    def choose_action(self, state):
        if np.random.random() < self.epsilon:
            return np.random.randint(self.n_actions)
        q = self._q_values(state.reshape(1, -1), self.W1, self.b1,
                            self.W2, self.b2, self.W_out, self.b_out)
        return np.argmax(q)

    def store(self, s, a, r, s_next, done):
        self.memory.append((s, a, r, s_next, done))

    def train_step(self):
        if len(self.memory) < self.batch_size:
            return 0.0
        indices = np.random.choice(len(self.memory), self.batch_size, replace=False)
        batch = [self.memory[i] for i in indices]
        s_batch = np.array([t[0] for t in batch])
        a_batch = np.array([t[1] for t in batch])
        r_batch = np.array([t[2] for t in batch])
        s_next_batch = np.array([t[3] for t in batch])
        done_batch = np.array([t[4] for t in batch], dtype=float)

        q_online = self._q_values(s_batch, self.W1, self.b1,
                                   self.W2, self.b2, self.W_out, self.b_out)
        q_next = self._q_values(s_next_batch, self.W1_t, self.b1_t,
                                 self.W2_t, self.b2_t, self.W_out_t, self.b_out_t)
        targets = q_online.copy()
        for i in range(self.batch_size):
            if done_batch[i]:
                targets[i, a_batch[i]] = r_batch[i]
            else:
                targets[i, a_batch[i]] = r_batch[i] + self.gamma * np.max(q_next[i])

        error = q_online[np.arange(self.batch_size), a_batch] - targets[np.arange(self.batch_size), a_batch]
        grad = np.zeros_like(q_online)
        grad[np.arange(self.batch_size), a_batch] = error

        h1 = np.maximum(0, s_batch @ self.W1 + self.b1)
        h2 = np.maximum(0, h1 @ self.W2 + self.b2)
        dW_out = h2.T @ grad / self.batch_size
        db_out = grad.mean(axis=0)
        dh2 = grad @ self.W_out.T
        dh1 = dh2 * (h1 > 0)
        dW2 = h1.T @ dh2 * (h2 > 0) / self.batch_size
        db2 = (dh2 * (h2 > 0)).mean(axis=0)
        dW1 = s_batch.T @ (dh1 * (h1 > 0)) / self.batch_size
        db1 = (dh1 * (h1 > 0)).mean(axis=0)

        self.W1 -= self.lr * dW1
        self.b1 -= self.lr * db1
        self.W2 -= self.lr * dW2
        self.b2 -= self.lr * db2
        self.W_out -= self.lr * dW_out
        self.b_out -= self.lr * db_out

        self.steps += 1
        if self.steps % self.target_update == 0:
            self.W1_t, self.b1_t = self.W1.copy(), self.b1.copy()
            self.W2_t, self.b2_t = self.W2.copy(), self.b2.copy()
            self.W_out_t, self.b_out_t = self.W_out.copy(), self.b_out.copy()

        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)
        return np.mean(error**2)
`,
  inputOutputSpec: [
    { input: 'State vector s_t — market features (prices, technical indicators, positions)', output: 'Q-values Q(s, a) — estimated expected cumulative reward for each discrete action' },
    { input: 'Action a_t ∈ {0, 1, ..., K-1} — discrete trading decision (e.g., sell/hold/buy)', output: 'Chosen action from ε-greedy policy balancing exploration and exploitation' },
    { input: 'Reward r_t — portfolio return or risk-adjusted performance at each step', output: 'TD error δ = r + γ max Q(s\', a\') - Q(s, a) used for gradient updates' },
    { input: 'Experience replay buffer — stores (s, a, r, s\', done) transitions', output: 'Training loss convergence curve showing decreasing TD error over episodes' },
    { input: 'Target network update frequency C — controls bootstrap target stability', output: 'Learned policy π*(s) = argmax_a Q(s, a) derived from converged Q-function' },
  ],
  failureModes: [
    { condition: 'Q-value overestimation due to max operator in Bellman backup', consequence: 'Agent overestimates action values, leading to suboptimal greedy policy that exploits noisy estimates', mitigation: 'Use Double DQN which decouples action selection from evaluation; or use Dueling DQN to separate state value from advantage' },
    { condition: 'Replay buffer contains stale transitions from old policy regimes', consequence: 'Training distribution shifts as policy improves, causing catastrophic forgetting of earlier good strategies', mitigation: 'Use prioritized replay that upweights recent high-TD-error transitions; cap buffer size to remove oldest experiences' },
    { condition: 'Sparse reward signal — most actions produce no immediate feedback', consequence: 'Agent cannot learn credit assignment; Q-values remain near initialization for long horizons', mitigation: 'Use dense intermediate rewards (per-period PnL); apply reward shaping with potential-based adjustments; increase γ toward 1.0' },
    { condition: 'Discrete action space too coarse for optimal position sizing', consequence: 'Agent cannot fine-tune position sizes; optimal fractional positions are not representable', mitigation: 'Increase action granularity (e.g., 11 actions from -5 to +5 in units of 0.1); or switch to DDPG/PPO for continuous action spaces' },
    { condition: 'Overfitting to specific market regime seen during training', consequence: 'Agent performs well in backtest but fails under different volatility or trend conditions', mitigation: 'Train across diverse market regimes (bull, bear, sideways); validate with walk-forward testing on unseen periods' },
  ],
});

'@

# === ASSEMBLE FINAL CONTENT ===
$separator = "`n"
$allNew = $d1 + $separator + $d2 + $separator + $d3 + $separator + $d4 + $separator + $d5 + $separator + $d6 + $separator + $d7

# Insert before "export default ACADEMY_DATA;"
$insertPoint = $academyData.IndexOf("export default ACADEMY_DATA;")
if ($insertPoint -lt 0) {
    Write-Error "Could not find export default ACADEMY_DATA;"
    exit 1
}

$newContent = $academyData.Substring(0, $insertPoint) + $allNew + "`n`n" + $academyData.Substring($insertPoint)

# Write the new file
$newContent | Set-Content "C:\New folder\Model-terminal\src\shared\academyData.ts" -NoNewline -Encoding UTF8

# Count register calls
$count = ([regex]::Matches($newContent, 'register\(\{')).Count
Write-Host "Total register() calls: $count"
Write-Host "Expected: 81 (22 existing + 59 new)"
