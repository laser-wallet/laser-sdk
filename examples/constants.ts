import { ethers } from "ethers";

/**
 * All of these wallets are Hardhat's deterministic accounts.
 * Do not use for production (private keys are compromised).
 */
export const RELAYER = new ethers.Wallet("0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82");

const g = ethers.Wallet.createRandom().address;
export const GUARDIAN1 = new ethers.Wallet("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba");

export const GUARDIAN2 = new ethers.Wallet("0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897");

export const GUARDIANS = [GUARDIAN1.address];

export const RECOVERY_OWNER1 = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

export const RECOVERY_OWNER2 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

export const RECOVERY_OWNERS = [RECOVERY_OWNER1.address];
