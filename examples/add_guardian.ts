import dotenv from "dotenv";
import { ethers, BigNumber } from "ethers";
import { Laser } from "../src";
import { TransactionInfo } from "../src/types";

dotenv.config();

// Hardhat account.
const relayer = new ethers.Wallet("");
/**
 * Example to send eth.
 */
async function addGuardian() {
    const owner = new ethers.Wallet(`${process.env.PK}`);

    const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
    const localHost = "http://127.0.0.1:8545/"; // Hardhat network.
    const provider = new ethers.providers.JsonRpcProvider(localHost);

    const walletAddress = "";

    const laser = new Laser(provider, owner, walletAddress);
    await laser.init();

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

    const relayerLaser = new Laser(provider, relayer, walletAddress);
    await relayerLaser.init();

    // We get the signed transaction.
    const newGuardian = ethers.Wallet.createRandom().address;
    const transaction = await laser.addGuardian(newGuardian, txInfo);

    try {
        await relayerLaser.execTransaction(transaction);
    } catch (e) {
        throw Error(`Error sending eth: ${e}`);
    }
}

addGuardian();
