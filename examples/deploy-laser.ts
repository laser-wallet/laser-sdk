import { ethers } from "ethers";

import { LaserFactory } from "../src/sdk/LaserFactory";

const provider = new ethers.providers.JsonRpcProvider(" http://127.0.0.1:8545/");

// Hardhat accounts.
export const owner = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const guardians = [new ethers.Wallet("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e").address];
const recoveryOwners = [
    new ethers.Wallet("0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa").address,
];

const factory = new LaserFactory(provider, owner);

async function deploy() {
    const SALT = Math.floor(Math.random() * 1000);
    const addr = await factory.preComputeAddress(owner.address, recoveryOwners, guardians, SALT);
    console.log("addr -->", addr);
    const tr = await factory.createWallet(owner.address, recoveryOwners, guardians, SALT, owner);
}
