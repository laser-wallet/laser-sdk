import { ethers, utils } from "ethers";
import { laser } from "../src";
import { ENTRY_POINT_GOERLI } from "../src/constants";
import dotenv from "dotenv";
import { UserOperation, TransactionInfo } from "../src/types";
import { entryPointAbi } from "../src/abis/TestEntryPoint.json";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(
    "0x029e8dda138cd055f391fe18b093cc8baad599d735509f90e0d31ff2ef82ec89"
);

const walletAddress = "0xEEbedA17604F37FC60e1b20959e01a7c4BD56d4B";

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const relayer = new ethers.Wallet(`${process.env.PK}`, provider);

// Interacts with a laser wallet.
// The wallet is deployed using the factory, example in: deploy_proxy.ts
async function viewCalls(): Promise<void> {
    /**
     * laserView is just to be more precise and differentiate between view and state changing methods.
     * It only requires a provider, it can be used to fetch data off-chain.
     */
    const laserView = new laser.View(provider, walletAddress);
    // This methods are also accessible through laser.
    const laserWallet = new laser.Laser(provider, owner, walletAddress);

    // Basic view calls, you can user 'laserView or laserWallet', both work.
    const version = await laserView.getVersion();
    const nonce = await laserWallet.getNonce();
    const networkId = await laserView.getNetworkId();
    const entryPoint = await laserView.getEntryPoint();
    const _owner = await laserWallet.getOwner();
    const recoveryOwner = await laserView.getRecoveryOwner();

    console.log(`Wallet version: ${version}`);
    console.log(`nonce: ${nonce}`);
    console.log(`network id: ${networkId}`);
    console.log(`Entry Point: ${entryPoint}`);
    console.log(`Owner: ${_owner}`);
    console.log(`recovery owner: ${recoveryOwner}`);
}


/**
 * This are methods that primarily change the state. 
 * The user op gets sent to the EntryPoint... 
 */
async function call(): Promise<void> {
    const laserWallet = new laser.Laser(provider, owner, walletAddress);
    const newGuardian = ethers.Wallet.createRandom().address;

    const txInfo: TransactionInfo = {
        callGas: 200000, // These values are not properly measured...
        maxFeePerGas: 100000000,
        maxPriorityFeePerGas: 100000000,
    };

    // We create the user op. 
    const userOp: UserOperation = await laserWallet.sendEth(await laserWallet.getOwner(), 0.01, txInfo );
    
    const entryPoint = new ethers.Contract(ENTRY_POINT_GOERLI, entryPointAbi, relayer);

    try {
        await entryPoint.handleOps([userOp], relayer.address);
    } catch(e) {
        throw e;
    }
}

call();


