import { ethers } from "ethers";
import { Laser } from "../src/index";
import { bundleTransactions } from "../src/utils";
import { owner } from "./deploy-laser";

const provider = new ethers.providers.JsonRpcProvider(" http://127.0.0.1:8545/");
const wallet = "0x1BDEde894F7986ECB610bd4Bf6278e5F6a173A53";

// Hardhat private keys.
const guardian = new ethers.Wallet("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", provider);
const recoveryOwner = new ethers.Wallet("0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa");
const random = ethers.Wallet.createRandom().address;

const laserOwner = new Laser(provider, owner, wallet);
const laserGuardian = new Laser(provider, guardian, wallet);
const laserROwner = new Laser(provider, recoveryOwner, wallet);

async function sendEth() {
    await owner.sendTransaction({
        to: wallet,
        value: ethers.utils.parseEther("2"),
    });
    const nonce = (await laserOwner.getWalletState()).nonce;
    const tx1 = await laserOwner.sendEth(random, 0.2, Number(nonce));

    const tx2 = await laserGuardian.sendEth(random, 0.2, Number(nonce));

    const transaction = bundleTransactions(tx2, tx1); // bundleTransactions groups them correctly, the order does not matter.
    let bal = await provider.getBalance(random);
    const gaslimit = 1000000;
    await laserOwner.execTransaction(transaction, guardian, gaslimit);

    bal = await provider.getBalance(random);
    console.log("bal -->", bal.toString());
}

async function addGuardian() {
    const newOwner = new ethers.Wallet("0xf1d6cbcda6030a8ac808c692ebcd90218aaab9e48a1e303b6c4aa4490ffd4990");
    const laserOwner = new Laser(provider, newOwner, wallet);
    const nonce = (await laserOwner.getWalletState()).nonce;
    const tx1 = await laserOwner.addGuardian(random, nonce);

    const laserGuardian = new Laser(provider, guardian, wallet);
    const tx2 = await laserGuardian.addGuardian(random, nonce);

    const transaction = bundleTransactions(tx1, tx2);

    await laserGuardian.execTransaction(transaction, guardian, 1000000);

    const state = await laserGuardian.getWalletState();

    const guardians = state.guardians;

    // This only works when running a local blockchain.
    // Normally, it takes some time to update.
    guardians.map((guardian) => {
        if (guardian.toLowerCase() === random.toLowerCase()) {
            console.log("guardian added");
        }
    });
}

async function getState(): Promise<void> {
    const state = await laserOwner.getWalletState();
    console.log(state);
}

async function recoverWallet(): Promise<void> {
    const newOwner = new ethers.Wallet("0xf1d6cbcda6030a8ac808c692ebcd90218aaab9e48a1e303b6c4aa4490ffd4990");
    console.log("new owner -->", newOwner.address);
    const nonce = (await laserROwner.getWalletState()).nonce;
    const tx1 = await laserROwner.recover(newOwner.address, nonce);
    const tx2 = await laserGuardian.recover(newOwner.address, nonce);

    const transaction = bundleTransactions(tx1, tx2);
    await laserGuardian.execTransaction(transaction, guardian, 500000);
}

async function unlockWallet(): Promise<void> {
    const nonce = (await laserOwner.getWalletState()).nonce;
    const tx1 = await laserOwner.unlockWallet(nonce);
    const tx2 = await laserGuardian.unlockWallet(nonce);

    const transaction = bundleTransactions(tx2, tx1);

    await laserGuardian.execTransaction(transaction, guardian, 500000);
}
