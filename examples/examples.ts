import { ethers } from "ethers";
import { Laser } from "../src/index";
import { bundleTransactions } from "../src/utils";
import { owner } from "./deploy-laser";

const provider = new ethers.providers.JsonRpcProvider(" http://127.0.0.1:8545/");
const wallet = "0xe886BD0de365C01c5F8bAFE9e763cde2C36F01a4";

// Hardhat private keys.
const guardian = new ethers.Wallet("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", provider);
const recoveryOwner = new ethers.Wallet("0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa");
const random = ethers.Wallet.createRandom().address;

async function addGuardian() {
    const laserOwner = new Laser(provider, owner, wallet);
    const nonce = (await laserOwner.getWalletState()).nonce;
    const tx1 = await laserOwner.addGuardian(random, Number(nonce));

    const laserGuardian = new Laser(provider, guardian, wallet);
    const tx2 = await laserGuardian.addGuardian(random, Number(nonce));

    const transaction = bundleTransactions(tx2, tx1); // bundleTransactions groups them correctly, the order does not matter.

    await laserOwner.execTransaction(transaction);
}

async function sendEth() {
    const laserOwner = new Laser(provider, owner, wallet);
    const nonce = (await laserOwner.getWalletState()).nonce;
    const tx1 = await laserOwner.sendEth(random, 1, Number(nonce));

    const laserRecoveryOwner = new Laser(provider, recoveryOwner, wallet);
    const tx2 = await laserRecoveryOwner.sendEth(random, 1, Number(nonce));

    const transaction = bundleTransactions(tx2, tx1); // bundleTransactions groups them correctly, the order does not matter.

    let bal = await provider.getBalance(random);
    console.log("bal -->", bal.toString());
    await laserOwner.execTransaction(transaction);

    bal = await provider.getBalance(random);
    console.log("bal -->", bal.toString());
}

async function state() {
    const laser = new Laser(provider, owner, wallet);
    console.log(await laser.getWalletState());
}
