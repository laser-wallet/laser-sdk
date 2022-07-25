import { ethers } from "ethers";
import { LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletAddress = "";
const LASER_MODULE = "";
const LASER_HELPER = "";

const laser = new LaserView(provider, walletAddress, LASER_MODULE, LASER_HELPER);

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
    console.log("is wallet locked ?: ", walletState.isLocked);
    console.log(`balance: ${ethers.utils.formatEther(walletState.balance)} ETH`);
})();
