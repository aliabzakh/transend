import { Keypair, Operation } from "@stellar/stellar-sdk";
import { classic } from "./submit";
import { issuer, sponsor, usdcAsset } from "./network";

/**
 * A custodial demo account (sender or shop) with zero XLM: the sponsor pays its
 * base reserve and its USDC trustline reserve, so it never holds or spends XLM.
 */
export async function createSponsoredAccount(): Promise<Keypair> {
  const kp = Keypair.random();
  const sp = sponsor();
  await classic(
    sp,
    [
      Operation.beginSponsoringFutureReserves({ sponsoredId: kp.publicKey() }),
      Operation.createAccount({ destination: kp.publicKey(), startingBalance: "0" }),
      Operation.changeTrust({ asset: usdcAsset(), source: kp.publicKey() }),
      Operation.endSponsoringFutureReserves({ source: kp.publicKey() }),
    ],
    [kp],
  );
  return kp;
}

/**
 * Testnet only: stands in for the CAD to USDC on-ramp (SEP-24 is mocked) by issuing
 * demo USDC to a sender's wallet.
 */
export async function issueDemoUsdc(destination: string, amountUsd: number): Promise<string> {
  const res = await classic(issuer(), [
    Operation.payment({ destination, asset: usdcAsset(), amount: amountUsd.toFixed(7) }),
  ]);
  return res.hash;
}
