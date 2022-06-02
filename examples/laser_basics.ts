import { ethers, utils } from "ethers";
import { Laser } from "../src";
import { ENTRY_POINT_GOERLI } from "../src/constants";
import dotenv from "dotenv";
import {UserOperation, TransactionInfo} from "../src/types";
import {entryPointAbi} from "../src/abis/TestEntryPoint.json";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();


// This is the owner of the wallet that was deployed in deploy_proxy...
const owner = new ethers.Wallet(
    "0x029e8dda138cd055f391fe18b093cc8baad599d735509f90e0d31ff2ef82ec89"
);

// This is the wallet of the owner (created in deploy_proxy.ts)...
const walletAddress = "0xd1d875f0992D332787F93C1a90e462B8026610A0";

// Infura Key
const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

// This is the relayer (needs to have ETH)-
const relayer = new ethers.Wallet(`${process.env.PK}`, new ethers.providers.JsonRpcProvider(providerUrl));

const laser = new Laser(providerUrl, owner, walletAddress, "");

// Interacts with a laser wallet.
// The wallet is deployed using the factory, example in: deploy_proxy.ts
async function basicChecks(): Promise<void> {
    // Basic checks
    const version = await laser.getVersion();
    const nonce = await laser.getNonce();
    const networkId = await laser.getNetworkId();

    const _owner = await laser.getOwner();

    // Should be true ..
    const isOwner = await laser.isOwner(_owner);

    console.log(`Laser version: ${version}`);
    console.log(`Laser nonce: ${nonce}`);
    console.log(`Laser networkId: ${networkId}`);
    console.log(`Laser owner: ${owner}`);
    console.log(`isOwner ?: ${isOwner}`);

    // Just to do basic checks ....
    console.log(await laser.getOwner() === owner.address);
    console.log(await laser.getEntryPoint() === ENTRY_POINT_GOERLI);
}


// We are funding the wallet so it has enough eth to make transactions... 
async function fundWallet(): Promise<void> {
    const bal = ethers.utils.parseEther("0.01");
    try {
        await relayer.sendTransaction({to: walletAddress, value: bal});
        console.log("sucess ... ");
    } catch(e) {
        throw Error(`${e}`);
    }
}




// Basic function to send Eth ... 
// This function should be call by the relayer... 
async function sendEth(): Promise<void> {
    const bal = await laser.getBalanceInEth();

    if (bal < 0.005) {
        throw Error(`Not enough balance: ${bal} ETH`);
    }

    /**
     * We are sending ETH to a this address ... 
     */
    const to = "0x11a9E352394aDD8596594422A6d8ceA59B73aF0e";
    const value = 0.005; // The SDK converts it to WEI ... 

    let userOp: UserOperation;
    /**
     * Step1: We need to get the userOp object with the transaction data.
     *  The sdk gives us that properly formatted ... 
     */
    // I hardcoded these values ... .they should be properly handled by simulation. 
    // Check the UserOperation object for description, or read: https://eips.ethereum.org/EIPS/eip-4337
    const txInfo: TransactionInfo = {
        callGas: 200000, 
        maxFeePerGas: 1000000000,
        maxPriorityFeePerGas: 1000000000,
    };

    userOp = await laser.sendEth(to, value, txInfo);
    console.log("user op -->", userOp);


    /**
     * Step2: Now that we have the user operation, the relayer needs to send the transaction to the EntryPoint. 
     */
    const entryPoint = new ethers.Contract(ENTRY_POINT_GOERLI, entryPointAbi, relayer);

    /**
     *  function handleOps(UserOperation[] calldata ops, address payable beneficiary) public 
     *  We can send more than one userOp per transactions. This is useful when we have many users ....
     */
    try {
        await entryPoint.handleOps([userOp], relayer.address);
        console.log("sucess ...");
    } catch(e) {
        throw Error(`Error: ${e}`);
    }
}


sendEth();