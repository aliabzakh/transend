/** Server-only settings. Never import this from a client component. */
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const env = {
  get rpcUrl() {
    return process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
  },
  get passphrase() {
    return process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
  },
  get contractId() {
    return need("CONTRACT_ID");
  },
  get usdcAsset() {
    return need("USDC_ASSET");
  },
  get usdcContractId() {
    return need("USDC_CONTRACT_ID");
  },
  get issuerSecret() {
    return need("ISSUER_SECRET");
  },
  get adminSecret() {
    return need("ADMIN_SECRET");
  },
  get verifierSecret() {
    return need("VERIFIER_SECRET");
  },
  get sponsorSecret() {
    return need("SPONSOR_SECRET");
  },
  get keyEncryptionKey() {
    return need("KEY_ENCRYPTION_KEY");
  },
  get pinPepper() {
    return need("PIN_PEPPER");
  },
  get sessionSecret() {
    return need("SESSION_SECRET");
  },
  get forecastMode(): "rules" | "model" {
    return process.env.FORECAST_MODEL_MODE === "model" ? "model" : "rules";
  },
};
