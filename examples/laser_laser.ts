import { ethers, utils, BigNumber } from "ethers";
import dotenv from "dotenv";
import { Laser } from "../src/sdk/Laser";
import { Helper } from "../src/sdk/Helper";
import { TransactionInfo } from "../src/types";

dotenv.config();

// We create the relayer ...
// The relayer pays for gas costs, in this case, it would be us ...
const relayer = new ethers.Wallet(`${process.env.PK}`);

const owner = new ethers.Wallet(`${process.env.PK}`);

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletAddress = "0x3D0ED98DBF7614417257172B7834F314e940ED3D";

const laser = new Laser(provider, owner, walletAddress);

/**
 * @dev Example to exec a Laser transaction.
 */
(async function () {
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const maxFeePerGas = BigNumber.from(2).mul(BigNumber.from(baseFee)).mul(BigNumber.from(maxPriorityFeePerGas));
    const gasLimit = 400000;

    const txInfo: TransactionInfo = {
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas ? maxPriorityFeePerGas : 2000000000,
        gasLimit: gasLimit,
        relayer: relayer.address,
    };

    const newOwner = "0x1d303ee27641b83E103d0977BAA9c5993A8743D9";
    const transaction = await laser.changeOwner(newOwner, txInfo);

    const relayerLaser = new Laser(provider, relayer, walletAddress);

    // reverts on error
    await Helper.simulateTransaction(provider, walletAddress, transaction);

    try {
        await relayerLaser.execTransaction(transaction);
    } catch (e) {
        throw Error(`Error in execTransaction: ${e}`);
    }
})();
