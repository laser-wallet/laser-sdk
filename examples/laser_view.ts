import { ethers } from "ethers";
import { Laser, LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const localHost = "http://127.0.0.1:8545/"; // Hardhat network.

const provider = new ethers.providers.JsonRpcProvider(localHost);

const walletAddress = "0xD0BfC10c842804DA2a060bc9E5E7AfC5700d5e40";
const LASER_MODULE = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const LASER_HELPER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
