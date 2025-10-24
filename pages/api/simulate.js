// /pages/api/simulate.js
// STEP 1: Core Voro engine — local simulation (no Supabase yet)

import { tanh } from "mathjs";

// 1️⃣ --- Constants & settings ---
const A = 1.0;             // tanh amplitude (controls max swing)
const MU_UP = 0.4;         // flow boost when market buying
const MU_DOWN = 0.3;       // flow boost when market selling
const S_SHORT = 0.75;      // shorting efficiency
const L0 = 100000;         // base liquidity depth
const ALPHA = 500;         // liquidity growth per user
const USERS = 1000;        // active users (for scaling example)
const P0 = 100;            // IPO/base price

// 2️⃣ --- Simulated market state (with some variation) ---
let T_long = 50000 + (Math.random() - 0.5) * 10000;        // total long tokens
let T_short = 30000 + (Math.random() - 0.5) * 6000;       // total short tokens
let B_H = 6000 + (Math.random() - 0.5) * 2000;            // recent buy volume
let S_H = 4000 + (Math.random() - 0.5) * 2000;            // recent sell+short volume

// 3️⃣ --- STEP 1: Compute formulas in order ---

// (1) Net confidence
const T_eff = T_long - S_SHORT * T_short;

// (2) Flow ratio
const f = (B_H - S_H) / (B_H + S_H + 1e-9);

// (3) Flow ratio applied before tanh
const T_eff_prime = T_eff * (1 + (f > 0 ? MU_UP * f : MU_DOWN * f));

// (4) Global liquidity scaling
const L_global = L0 + ALPHA * USERS;

// (5) Final price using tanh
const P = P0 * (1 + A * tanh(T_eff_prime / L_global));

// (6) Output
export default function handler(req, res) {
  return res.status(200).json({
    P0,
    L_global,
    T_long: Math.round(T_long),
    T_short: Math.round(T_short),
    B_H: Math.round(B_H),
    S_H: Math.round(S_H),
    f: f.toFixed(3),
    T_eff: T_eff.toFixed(2),
    T_eff_prime: T_eff_prime.toFixed(2),
    newPrice: P.toFixed(2),
  });
}
