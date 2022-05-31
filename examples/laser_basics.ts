import { ethers, utils } from "ethers";
import { Laser } from "../src";
import dotenv from "dotenv";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// We create a signer (needs to have eth)
const signer = new ethers.Wallet(`${process.env.PK}`);


// This is the wallet of the user (created in deploy_proxy.ts)... 
const walletAddress = "0xf5C40B2D53478C414D9fDE1763D9fb8A8F0Ba657";

// Infura Key
const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;


const laser = new Laser(providerUrl, signer, walletAddress, "");




// Interacts with a laser wallet. 
// The wallet is deployed using the factory, example in: deploy_proxy.ts
async function main() : Promise<void> {
    const version = await laser.getVersion();
    const nonce = await laser.getNonce();
    const networkId = await laser.getNetworkId();

    const owner = await laser.getOwner();

    // Should be true ..
    const isOwner = await laser.isOwner(owner);


    console.log(`Laser version: ${version}`);
    console.log(`Laser nonce: ${nonce}`);
    console.log(`Laser networkId: ${networkId}`);
    console.log(`Laser owner: ${owner}`);
    console.log(`isOwner ?: ${isOwner}`);
}


main();