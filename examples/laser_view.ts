import { ethers } from "ethers";
import { Laser, LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const localHost = "http://127.0.0.1:8545/"; // Hardhat network.

const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const walletAddress = "0x999aA618c0732DD1a3235d01E6C6c76C9D8617f8";

const laser = new Laser(provider, ethers.Wallet.createRandom(), walletAddress);

/**
 * Example to get the current state of the wallet.
 */
(async function () {
    // init the class.
    await laser.init();

    const walletState = await laser.getWalletState();

    console.log("owner: ", walletState.owner);
    console.log("singleton: ", walletState.singleton);
    console.log("guardians: ", walletState.guardians);
    console.log("recovery owners: ", walletState.recoveryOwners);
    console.log("nonce: ", walletState.nonce.toString());
    console.log("is wallet locked ?: ", walletState.isLocked);
    console.log(`balance: ${ethers.utils.formatEther(walletState.balance)} ETH`);
})();
