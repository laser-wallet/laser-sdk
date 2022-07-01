import { ethers, utils, BigNumber } from "ethers";
import { laser } from "../src";
import { ZERO, FACTORY_GOERLI, SINGLETON_GOERLI } from "../src/constants";
import dotenv from "dotenv";
import { TransactionInfo, Address, BlockOutput } from "../src/types";
import { Helper, Laser } from "../src/laser";

dotenv.config();

// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(`${process.env.PK}`);

const walletAddress = "0x0d9E90520Dfa989F73f7f2E07D7e4B7Df6B2a115";

const providerUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

/**
 *  ** ** ** ** E X A M P L E S ** ** ** **** ** ** ** * * * * * **
 */

/**
 * @dev Simple view examples to interact with Laser.
 */
async function viewLaser(): Promise<void> {
    const wallet = new laser.Laser(provider, owner, walletAddress);

    const walletOwner = await wallet.getOwner();
    const nonce = await wallet.getNonce();
    const version = await wallet.getVersion();
    const bal = await wallet.getBalance();
    const chainInfo = await wallet.getChainInfo();


    if (chainInfo.name === "mainnet") {
        const daiBal = await wallet.getConvertedTokenBalance("0x6B175474E89094C44Da98b954EedeAC495271d0F");
        console.log("dai balance: ", daiBal);
        const ens = "roherrera.eth";
        const convertedAddress = await wallet.verifyAddress(ens);
        console.log("converted address: ", convertedAddress);
    }

    console.log("chain info: ", chainInfo);
    console.log("wallet owner: ", walletOwner);
    console.log("nonce: ", nonce);
    console.log("version: ", version);
    console.log("bal: ", utils.formatEther(bal), "ETH");
}



/**
 * Example to send Eth.
 */
async function sendEther(): Promise<void> {
    /**
     * Example to send ETH
     */
    const to = "0x0cf5C6d3c1122504091EAd6a3Dc5BD31f7BbeDE3";
    const amount = 0.002; // amount in ETH not WEI.

    let txInfo: TransactionInfo;
    const wallet = new laser.Laser(provider, owner, walletAddress);


    // We get the base fee to suggest gas price to the user.
    const baseFee = await wallet.getBaseFee();

    // We suggest 2 GWEI for miner's tip.
    const maxPriorityFeePerGas = 2000000000;

    // Formula for maxFeePerGas as suggested by block native.
    const maxFeePerGas = BigNumber.from(2).mul(baseFee).add(maxPriorityFeePerGas);

    // This are the suggested parameters, although the user can change them.
    txInfo = {
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasTip: 35000, // This is not accurate.
    };
    
    const transaction =  await wallet.sendEth(to, amount, txInfo);

    /**
     * Once we have the transaction, we simulate it and send it (through the relayer.)
     */
    const relayerWallet = new ethers.Wallet(`${process.env.RELAYER_PK}`);
    const relayer = new laser.Laser(provider, relayerWallet, walletAddress);

    // We first simulate the transaction:
    try {
        const callGas = await relayer.simulateTransaction(transaction);
        console.log("callGas -->", callGas.toString());
    } catch (e) {
        throw Error(`Simulation error: ${e}`);
    }

    // If the simulation suceeds, we send the transaction.
    try {
        const result = await relayer.execTransaction(transaction);
    } catch (e) {
        throw Error(`Error with the transaction: ${e}`);
    }
}





sendEther();