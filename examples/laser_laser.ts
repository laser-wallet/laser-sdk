import { ethers, utils, BigNumber } from "ethers";
import dotenv from "dotenv";
import { Laser } from "../src/sdk/Laser";
import { Helper } from "../src/sdk/Helper";
import { TransactionInfo } from "../src/types";

import {
    RELAYER,
    GUARDIAN1,
    GUARDIAN2,
    GUARDIANS,
    RECOVERY_OWNER1,
    RECOVERY_OWNER2,
    RECOVERY_OWNERS,
} from "./constants";

dotenv.config();

const owner = new ethers.Wallet("6e509eb668b2f09f6253d7dbe7cfbf14a6131a2f0ed44ae623ca12635af7f5eb");
// const RELAYER = owner;

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const localHost = "http://127.0.0.1:8545/";

const provider = new ethers.providers.JsonRpcProvider(localHost);
const walletAddress = "0x227A1b90e1Dcdb59116997a0d37d4C33E80C113A";

const laser = new Laser(provider, owner, walletAddress);

/**
 * @dev Example to exec a Laser transaction.
 */
(async function () {
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const maxFeePerGas = BigNumber.from(2).mul(BigNumber.from(baseFee)).add(BigNumber.from(maxPriorityFeePerGas));
    const gasLimit = 300000;

    const txInfo: TransactionInfo = {
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas ? maxPriorityFeePerGas : 2000000000,
        gasLimit: gasLimit,
        relayer: RELAYER.address,
    };

    const guardians = await laser.getGuardians();
    const transaction = await laser.sendEth(guardians[0], 0.01, txInfo);

    const relayerLaser = new Laser(provider, RELAYER, walletAddress);

    const relayerBal = await provider.getBalance(RELAYER.address);

    await Helper.simulateTransaction(provider, walletAddress, transaction);

    try {
        const tx = await relayerLaser.execTransaction(transaction);
        const receipt = await tx.wait();
        const gasPrice = receipt.effectiveGasPrice.toString();
        const relayerPostBalance = await provider.getBalance(RELAYER.address);
        const diff = BigNumber.from(relayerBal).sub(relayerPostBalance);
        const gasDiff = diff.div(gasPrice);
        console.log("gas dif -->", gasDiff.toString());
        console.log("gas price -->", gasPrice.toString());
        const ethDiff = relayerBal.sub(relayerPostBalance);

        console.log("eth dif -->", ethers.utils.formatEther(ethDiff));
    } catch (e) {
        throw Error(`Error in execTransaction: ${e}`);
    }
})();

// sending eth: 63123
// adding recovery owner (guardian): 93895
// eliminating a recovery owner (guardian): 71 k.

// 351219
