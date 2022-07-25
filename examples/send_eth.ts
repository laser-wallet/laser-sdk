import dotenv from "dotenv";
import { ethers, BigNumber } from "ethers";
import { Laser } from "../src";
import { TransactionInfo } from "../src/types";

dotenv.config();

/**
 * Example to send eth.
 */
async function sendEth() {
    const owner = new ethers.Wallet(`${process.env.PK}`);

    const relayer = new ethers.Wallet("");
    const providerUrl = "";
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    const walletAddress = "";
    const LASER_MODULE = "";
    const LASER_HELPER = "";

    const laser = new Laser(provider, owner, walletAddress, LASER_MODULE, LASER_HELPER);

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

    // We get the signed transaction.
    const transaction = await laser.sendEth(owner.address, 0.01, txInfo);

    try {
        await relayerLaser.execTransaction(transaction);
    } catch (e) {
        throw Error(`Error sending eth: ${e}`);
    }
}

sendEth();
