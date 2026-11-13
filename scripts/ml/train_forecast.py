"""
Trains the cash-demand forecast: gradient-boosted quantile regression (p10, p50, p90)
on the synthetic sample data, and exports the trees as JSON for pure-TypeScript scoring
in web/lib/risk/model.ts. Never runs in production.

The model replaces the rules baseline only if its p50 beats the baseline's mean
absolute error by at least 10% on the held-out last 14 days of each shop. The result
is written into the JSON ("chosen") either way, so the dashboard can say which
forecaster is live.

Usage: npm run ml:train   (after npm run ml:export)
"""
import csv
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

HERE = Path(__file__).resolve().parent
DATA = HERE / "data" / "sample_payouts.csv"
OUT = HERE.parent.parent / "web" / "lib" / "risk" / "model.json"
FEATURES = ["dow", "dom", "month_start", "after_topup", "school_fees", "year_end", "tense", "ma7", "lag7", "waiting_share"]
QUANTILES = {"p10": 0.1, "p50": 0.5, "p90": 0.9}
PARAMS = dict(n_estimators=200, max_depth=3, learning_rate=0.05, min_samples_leaf=8, subsample=0.9, random_state=7)


def load():
    with DATA.open() as f:
        rows = list(csv.DictReader(f))
    X = np.array([[float(r[k]) for k in FEATURES] for r in rows])
    y = np.array([float(r["y"]) for r in rows])
    base = np.array([float(r["baseline_p50"]) for r in rows])
    hold = np.array([r["holdout"] == "1" for r in rows])
    return X, y, base, hold


def export_model(m: GradientBoostingRegressor, X: np.ndarray) -> dict:
    trees = []
    for est in m.estimators_[:, 0]:
        t = est.tree_
        trees.append(
            {
                "l": t.children_left.tolist(),
                "r": t.children_right.tolist(),
                "f": [int(v) for v in t.feature.tolist()],
                "t": [round(float(v), 6) for v in t.threshold.tolist()],
                "v": [round(float(v), 6) for v in t.value[:, 0, 0].tolist()],
            }
        )
    init = float(m._raw_predict_init(X[:1])[0, 0])
    exported = {"init": round(init, 6), "lr": m.learning_rate, "trees": trees}
    # The JSON must reproduce scikit-learn's predictions.
    mine = np.array([score(exported, x) for x in X[:200]])
    theirs = m.predict(X[:200])
    if not np.allclose(mine, theirs, atol=1e-3):
        sys.exit(f"export mismatch: max diff {np.abs(mine - theirs).max()}")
    return exported


def score(q: dict, x) -> float:
    y = q["init"]
    for t in q["trees"]:
        n = 0
        while t["l"][n] != -1:
            n = t["l"][n] if x[t["f"][n]] <= t["t"][n] else t["r"][n]
        y += q["lr"] * t["v"][n]
    return y


def main():
    X, y, base, hold = load()
    Xtr, ytr = X[~hold], y[~hold]
    models = {}
    for name, alpha in QUANTILES.items():
        m = GradientBoostingRegressor(loss="quantile", alpha=alpha, **PARAMS)
        m.fit(Xtr, ytr)
        models[name] = m

    pred = models["p50"].predict(X[hold])
    model_mae = float(np.mean(np.abs(pred - y[hold])))
    base_mae = float(np.mean(np.abs(base[hold] - y[hold])))
    improvement = 100.0 * (base_mae - model_mae) / base_mae
    cover = float(np.mean((models["p10"].predict(X[hold]) <= y[hold]) & (y[hold] <= models["p90"].predict(X[hold]))))
    chosen = improvement >= 10.0

    out = {
        "version": "gbr-quantile-v1",
        "features": FEATURES,
        "trainedOn": "synthetic sample data (not real withdrawals)",
        "metrics": {
            "baselineMae": round(base_mae, 2),
            "modelMae": round(model_mae, 2),
            "improvementPct": round(improvement, 1),
            "holdoutDays": 14,
            "p10p90Coverage": round(cover, 2),
            "chosen": chosen,
        },
        "quantiles": {name: export_model(m, X) for name, m in models.items()},
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print(f"baseline MAE {base_mae:.2f}  model MAE {model_mae:.2f}  improvement {improvement:.1f}%  "
          f"p10-p90 coverage {cover:.0%}  -> {'model' if chosen else 'rules'} wins")
    print(f"wrote {OUT.relative_to(HERE.parent.parent)}")


if __name__ == "__main__":
    main()
