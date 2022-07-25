import { ethers, utils, BigNumber } from "ethers";
import dotenv from "dotenv";
import { Laser } from "../src/sdk/Laser";
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

import { simulateLaserTransaction } from "../src/utils";

dotenv.config();

const owner = new ethers.Wallet(`${process.env.PK}`);
// const RELAYER = owner;

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const localHost = "http://127.0.0.1:8545/";

const provider = new ethers.providers.JsonRpcProvider(localHost);
const walletAddress = "0x8931335e0db8E39767c6d84b59a8Df71223F3Da4";

const LASER_MODULE = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const laser = new Laser(provider, owner, walletAddress, LASER_MODULE);

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

    const random = ethers.Wallet.createRandom().address;
    const transaction = await laser.sendEth(random, 0.001, txInfo);
    const relayerLaser = new Laser(provider, RELAYER, walletAddress, LASER_MODULE);

    const relayerBal = await provider.getBalance(RELAYER.address);

    // const simulationResult = await simulateLaserTransaction(provider, walletAddress, transaction);
    // console.log("simulation result -->", simulationResult.toString());

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
