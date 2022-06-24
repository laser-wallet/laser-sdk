import { ethers, utils, BigNumber } from "ethers";
import { laser } from "../src";
import {
    ZERO,
    FACTORY_GOERLI,
    SINGLETON_GOERLI
} from "../src/constants";
import dotenv from "dotenv";
import { TransactionInfo, Address } from "../src/types";
import { Helper, Laser } from "../src/laser";
import { abi } from "../src/abis/LaserWallet.json";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(`${process.env.PK}`);

const walletAddress = "0xC4157E0Fc052f26426777Ac7b593FA2d35089DCc";

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
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

    console.log("wallet owner: ", walletOwner);
    console.log("nonce: ", nonce);
    console.log("version: ", version);
}


/**
 * Example to make a transaction.
 */
async function sendEther(): Promise<void> {
    
    /**
     * Example to send ETH
     */
    const to = "0x0cf5C6d3c1122504091EAd6a3Dc5BD31f7BbeDE3";
    const amount = 0.000001; // amount in ETH not WEI. 

    console.log("to -->", to);
    let txInfo: TransactionInfo;
    const wallet = new laser.Laser(provider, owner, walletAddress);

    // We get the base fee to suggest gas price to the user.
    const baseFee = await wallet.getBaseFee();
    
    // We suggest 2 GWEI for miner's tip.
    const maxPriorityFeePerGas = 2000000000;

    // Formula for maxFeePerGas as suggested by block native.
    const maxFeePerGas =  BigNumber.from(2).mul(baseFee).add(maxPriorityFeePerGas);
    
    // This are the suggested parameters, although the user can change them.
    txInfo = {
        maxFeePerGas: maxFeePerGas, 
        maxPriorityFeePerGas: maxPriorityFeePerGas, 
        gasTip: 30000 // The gas tip is the amount of calldata to start the transaction.
    }

    try {
        await wallet.sendEth(to, amount, txInfo);
    } catch(e) {
        throw Error(`Error with the operation: ${e}`);
    }
}


/**
 * Example to make an internal transaction.
 */
async function laserChangeOwner(): Promise<void> {
    
    /**
     * Example to change the owner.
     */

    const newOwner = ethers.Wallet.createRandom().address;
    console.log("new owner -->", newOwner);
    let txInfo: TransactionInfo;
    const wallet = new laser.Laser(provider, owner, walletAddress);

    // We get the base fee to suggest gas price to the user.
    const baseFee = await wallet.getBaseFee();
    
    // We suggest 2 GWEI for miner's tip.
    const maxPriorityFeePerGas = 2000000000;

    // Formula for maxFeePerGas as suggested by block native.
    const maxFeePerGas =  BigNumber.from(2).mul(baseFee).add(maxPriorityFeePerGas);
    
    // This are the suggested parameters, although the user can change them.
    txInfo = {
        maxFeePerGas: maxFeePerGas, 
        maxPriorityFeePerGas: maxPriorityFeePerGas, 
        gasTip: 30000 // The gas tip is the amount of calldata to start the transaction.
    }

    try {
        await wallet.changeOwner(newOwner, txInfo);
    } catch(e) {
        throw Error(`Error with the operation: ${e}`);
    }

}

