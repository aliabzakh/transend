import { db, schema } from "@/db";
import * as escrow from "../stellar/escrow";
import { checkStake, checkUnstake, maxStakeUsd, savingsSplit } from "../savings/rules";
import { HttpError } from "./http";
import { senderKeypair } from "./senders";
import { ownCard } from "./cards";
import { postMessage } from "./messages";

type User = typeof schema.users.$inferSelect;

const cents = (n: number) => Math.round(n * 100) / 100;

/** Savings view for one card. Only its sender can read it. */
export async function savingsView(user: User, cardId: string) {
  const { card } = await ownCard(user, cardId);
  const [chain, cfg] = await Promise.all([escrow.getCard(card.id), escrow.getSavings()]);
  if (!chain) throw new HttpError(404, "not_found");
  const split = savingsSplit(chain);
  return {
    cardId: card.id,
    status: chain.status,
    ...split,
    earnedUsd: cents(chain.yieldCreditedUsd + escrow.pendingYieldUsd(chain, cfg)),
    apyBps: cfg.apyBps,
    speedup: cfg.speedup,
    stakingPaused: cfg.stakingPaused,
    minStakeUsd: cfg.minStakeUsd,
    minLiquidUsd: cfg.minLiquidUsd,
    maxStakeNowUsd: maxStakeUsd(chain, cfg),
  };
}

export async function stakeFor(user: User, cardId: string, amountUsd: number) {
  const { card } = await ownCard(user, cardId);
  const amount = cents(Number(amountUsd));
  const [chain, cfg] = await Promise.all([escrow.getCard(card.id), escrow.getSavings()]);
  if (!chain) throw new HttpError(404, "not_found");
  const refusal = checkStake(chain, amount, cfg);
  if (refusal) throw new HttpError(409, refusal, { maxUsd: maxStakeUsd(chain, cfg), minUsd: cfg.minStakeUsd });
  const res = await escrow.stake(senderKeypair(user), card.id, amount);
  await db.insert(schema.transfers).values({ kind: "stake", cardId: card.id, senderId: user.id, amountUsd: amount, txHash: res.hash });
  await postMessage(user.id, card.id, "info", "Transend", `US$${amount.toFixed(2)} set aside to grow.`, res.hash);
  return { txHash: res.hash, ...(await savingsView(user, card.id)) };
}

export async function unstakeFor(user: User, cardId: string, amountUsd: number) {
  const { card } = await ownCard(user, cardId);
  const amount = cents(Number(amountUsd));
  const chain = await escrow.getCard(card.id);
  if (!chain) throw new HttpError(404, "not_found");
  const refusal = checkUnstake(chain, amount);
  if (refusal) throw new HttpError(409, refusal, { maxUsd: chain.stakedUsd });
  const res = await escrow.unstake(senderKeypair(user), card.id, amount);
  await db.insert(schema.transfers).values({ kind: "unstake", cardId: card.id, senderId: user.id, amountUsd: amount, txHash: res.hash });
  await postMessage(user.id, card.id, "info", "Transend", `US$${amount.toFixed(2)} moved back. Available now.`, res.hash);
  return { txHash: res.hash, ...(await savingsView(user, card.id)) };
}

/** Admin: the demo rate, the yield reserve, the kill switch and the demo clock. */
export async function adminSavings(action: string, value: unknown) {
  const n = Number(value);
  switch (action) {
    case "set_apy":
      if (!Number.isInteger(n) || n < 0 || n > 2000) throw new HttpError(400, "bad_input");
      return escrow.setApy(n);
    case "fund":
      if (!(n > 0) || n > 100_000) throw new HttpError(400, "bad_input");
      return escrow.fundYieldReserve(n);
    case "pause":
      return escrow.pauseStaking();
    case "unpause":
      return escrow.unpauseStaking();
    case "speedup":
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) throw new HttpError(400, "bad_input");
      return escrow.setSpeedup(n);
    default:
      throw new HttpError(400, "bad_action");
  }
}
