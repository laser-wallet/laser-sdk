import dotenv from "dotenv";
import { ethers, BigNumber } from "ethers";
import { Laser } from "../src";
import { Transaction, PackedSignatures, TransactionInfo } from "../src/types";
import { encodeFunctionData, packSignatures } from "../src/utils";

import { RECOVERY_OWNER1, GUARDIAN1 } from "./constants";

dotenv.config();

/**
 * Example to send eth.
 */
async function lockWallet() {
    const owner = new ethers.Wallet(`${process.env.PK}`);

    const relayer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    const providerUrl = "http://127.0.0.1:8545/";
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    const walletAddress = "0x43fcB33c50DBDd49cecE91Ad96D92D44dd266242";
    const LASER_MODULE = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const LASER_HELPER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    /// fee data.
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const maxFeePerGas = BigNumber.from(2).mul(BigNumber.from(baseFee)).add(BigNumber.from(maxPriorityFeePerGas));
    const gasLimit = 300000;

    const txInfo: TransactionInfo = {
        maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas ? maxPriorityFeePerGas : 0,
        gasLimit,
        relayer: relayer.address,
    };

    const relayerLaser = new Laser(provider, relayer, walletAddress, LASER_MODULE, LASER_HELPER);

    // Recovery Owner
    const recoveryOwnerLaser = new Laser(provider, RECOVERY_OWNER1, walletAddress, LASER_MODULE, LASER_HELPER);
    const transaction = await recoveryOwnerLaser.lockWallet(txInfo);
    const recoveryOwnerSignature = transaction.signatures;

    // Guardian
    const guardianLaser = new Laser(provider, GUARDIAN1, walletAddress, LASER_MODULE, LASER_HELPER);
    const guardianSignature = (await guardianLaser.lockWallet(txInfo)).signatures;

    const packedSigs: PackedSignatures = {
        funcName: "lock",
        signature1: recoveryOwnerSignature,
        signature2: guardianSignature,
    };

    const sigs = packSignatures(packedSigs);
    transaction.signatures = sigs;
    console.log(transaction);
    try {
        await relayerLaser.execFromModule(transaction, "lock");
    } catch (e) {
        throw Error(`Error sending eth: ${e}`);
    }
}

lockWallet();
