import { ethers, utils } from "ethers";
import { laser } from "../src";
import {
    ENTRY_POINT_GOERLI,
    ZERO,
    FACTORY_MAINNET,
    SINGLETON_MAINNET,
    ENTRY_POINT_MAINNET,
} from "../src/constants";
import dotenv from "dotenv";
import { UserOperation, TransactionInfo, Address } from "../src/types";
import { entryPointAbi } from "../src/abis/TestEntryPoint.json";
import { encodeFunctionData } from "../src/utils/index";
import { Helper, Laser } from "../src/laser";
import { abi } from "../src/abis/LaserWallet.json";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(`${process.env.PK}`);

const walletAddress = "0xc8613B4F1D78b3935a2d41973353C353427049a1";

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
    const entryPoint = await wallet.getEntryPoint();

    console.log("wallet owner: ", walletOwner);
    console.log("nonce: ", nonce);
    console.log("version: ", version);
    console.log("entry point: ", entryPoint);
}


/**
 * @dev Examples to populate a UserOperation.
 */
async function createUserOp(): Promise<void> {
    const wallet = new laser.Laser(provider, owner, walletAddress);

    /**
     * Example to populate an op to change the owner:
     */
    const newOwner = ethers.Wallet.createRandom().address;
    const txInfo: TransactionInfo = {
        maxFeePerGas: 45000000000,
        maxPriorityFeePerGas: 2000000000, // The values are hardcoded for the example (not accurate).
    };
    const changeOwneruserOp = await wallet.changeOwner(newOwner, txInfo);
    console.log("change owner user op --> ", changeOwneruserOp);

    /**
     * Example to populate an op that sends eth:
     */
    const to = ethers.Wallet.createRandom().address;
    const amount = 0.0001;
    const sendEthUserOp = await wallet.sendEth(to, amount, txInfo);
    console.log("send eth user op -->", sendEthUserOp);
}



/**
 * @dev Examples to send a UserOperation to the EntryPoint from the relayer.
 * The UserOperation object gets sent from the app.
 */
async function relay(userOp: UserOperation): Promise<void> {
    // Private key of the relayer, it needs to have eth to pay for the initial gas costs.
    const relayerPrivateKey = process.env.PK; 
    const relayer = new ethers.Wallet(`${relayerPrivateKey}`);
    const laserRelayer = new laser.Laser(provider, relayer, userOp.sender);
    
    // First we simulate the transaction on the EntryPoint. 
    try {
        const { preOpGas, prefund} = await laserRelayer.simulateOperation(userOp);
        console.log("preOpGas -->", preOpGas.toString());
        console.log("prefund -->", prefund.toString());
    } catch(e) {
        throw Error(`Simulation failed: ${e}`);
    }

    ///@todo Populate correct gas price:
    // return min(maxFeePerGas, maxPriorityFeePerGas + block.basefee);
    const gasPrice = userOp.maxFeePerGas; 

    const entryPoint = new ethers.Contract(ENTRY_POINT_GOERLI, entryPointAbi, relayer);

    // Now we call the entry point.
    try {
        entryPoint.handleOps([userOp], relayer.address)
    } catch(e) {
        throw Error(`Error calling the entry point: ${e}`);
    }
}









