import { ethers } from "ethers";
import { LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
const walletAddress = "0x8931335e0db8E39767c6d84b59a8Df71223F3Da4";

const LASER_MODULE = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const laser = new LaserView(provider, walletAddress, LASER_MODULE);

/**
 * Example to get the current state of the wallet.
 */
(async function () {
    const walletState = await laser.getWalletState();

    console.log("owner: ", walletState.owner);
    console.log("singleton: ", walletState.singleton);
    console.log("guardians: ", walletState.guardians);
    console.log("recovery owners: ", walletState.recoveryOwners);
    console.log("nonce: ", walletState.nonce.toString());
    console.log(`balance: ${ethers.utils.formatEther(walletState.balance)} ETH`);
})();
