import { ethers, utils } from "ethers";
import { LaserFactory } from "../src";
import dotenv from "dotenv";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// We create a signer (needs to have eth)
const signer = new ethers.Wallet(`${process.env.PK}`);

// Infura Key
const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const goerliChainId = 5;

// We create the factory ...
const factory = new LaserFactory(providerUrl, goerliChainId, signer);


// This function creates a new wallet and logs the address to the terminal. 
// It listents to the event ProxyCreation...
async function main(): Promise<void> {
    const bal = await factory.provider.getBalance(signer.address);

    // We check that the signer has enough eth (at least 0.1).
    if (Number(utils.formatEther(bal)) < 0.1) {
        throw Error(`Not enough balance: ${utils.formatEther(bal)} ETH`);
    }

    // We create a random owner ...
    const owner = ethers.Wallet.createRandom();

    // We create a random guardian ...
    const guardian = ethers.Wallet.createRandom();

    // This is not the real entry point, but it is ok to use it for this example ..
    // This is actually the factory address.
    const fakeEntryPoint = "0xcCed5B88f14f1e133680117d01dEFeB38fC9a5A3";

    // We  listen to the event ...
    await factory.on();

    try {
        // It takes some time, around 1 min.
        await factory.createProxyWithCreate2(owner.address, [guardian.address], fakeEntryPoint);
    } catch(e) {
        throw Error(`Error with createProxy ${e}`);
    }
}


main();
