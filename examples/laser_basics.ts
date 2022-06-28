import { ethers, utils, BigNumber } from "ethers";
import { laser } from "../src";
import { ZERO, FACTORY_GOERLI, SINGLETON_GOERLI } from "../src/constants";
import dotenv from "dotenv";
import { TransactionInfo, Address, BlockOutput } from "../src/types";
import { Helper, Laser } from "../src/laser";
import { abi } from "../src/abis/LaserWallet.json";

dotenv.config();

// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(`${process.env.PK}`);

const walletAddress = "";

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
    const amount = 0.038; // amount in ETH not WEI.

    let txInfo: TransactionInfo;
    const wallet = new laser.Laser(provider, owner, walletAddress);

    await wallet.listenBlocks();


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
        gasTip: 35000, // The gas tip is the amount of calldata to start the transaction.
    };
    
    const r = ethers.Wallet.createRandom().address;

    const transaction = await wallet.sendEth(to, amount, txInfo);
    console.log(transaction);

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

/**
 * Example to send ERC-20 token.
 */
async function sendToken(): Promise<void> {
    /**
     * Example to send a token transaction.
     */
    const to = "";

    let txInfo: TransactionInfo;
    const wallet = new laser.Laser(provider, owner, walletAddress);

    await wallet.listenBlocks();
    // We get the base fee to suggest gas price to the user.
    const baseFee = await wallet.getBaseFee();

    // // We suggest 2 GWEI for miner's tip.
    const maxPriorityFeePerGas = 2000000000;

    // Formula for maxFeePerGas as suggested by block native.
    const maxFeePerGas = BigNumber.from(2).mul(baseFee).add(maxPriorityFeePerGas);

    // This are the suggested parameters, although the user can change them.
    txInfo = {
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasTip: 35000, // The gas tip is the amount of calldata to start the transaction.
    };
    const r = ethers.Wallet.createRandom().address;

    const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    const usdcBalance = await wallet.getConvertedTokenBalance(usdc);
    console.log("usdc token balance -->", usdcBalance);
    const transaction = await wallet.transferERC20(usdc, to, usdcBalance, txInfo);

    /**
     * Once we have the transaction, we simulate it and send it (through the relayer.)
     */
    const relayerWallet = new ethers.Wallet(`${process.env.RELAYER_PK}`);
    const relayer = new laser.Laser(provider, relayerWallet, walletAddress);

    // We first simulate the transaction:
    try {
        const callGas = await relayer.simulateTransaction(transaction);
    } catch(e) {
        throw Error(`Simulation error: ${e}`);
    }

    // If the simulation suceeds, we send the transaction.
    try {
        const result = await relayer.execTransaction(transaction);
    } catch(e) {
        throw Error(`Error with the transaction: ${e}`);
    }
}


