import { BigNumberish, ethers, BigNumber } from "ethers";
import { Laser, LaserView } from "../src";
import dotenv from "dotenv";
import { Address } from "../src/types";

import { encodeWalletData } from "../src/utils/utils";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_KEY}`);
const signer = new ethers.Wallet(`0x${process.env.PK}`, provider);

const itx = new ethers.providers.InfuraProvider(
    "goerli", // or 'ropsten', 'rinkeby', 'kovan', 'mainnet'
    `${process.env.INFURA_KEY}`
);

const walletAddress = "0x999aA618c0732DD1a3235d01E6C6c76C9D8617f8";
const schedule = "fast";

const laser = new Laser(provider, signer, walletAddress);

async function executeTransaction() {
    const gasLimit = 300000;
    const txInfo = {
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        gasLimit,
        relayer: signer.address,
    };
    const tx = await laser.sendEth(ethers.Wallet.createRandom().address, 0.0001, txInfo);

    await laser.estimateGas(tx);
}

executeTransaction();
