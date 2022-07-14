import { ethers } from "ethers";
import { LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletAddress = "0x3D0ED98DBF7614417257172B7834F314e940ED3D";

const laser = new LaserView(provider, walletAddress);

/**
 * Examples to interact with a Laser wallet (view methods).
 */
(async function () {
    const walletAddress = laser.getAddress();
    const owner = await laser.getOwner();
    const recoveryOwners = await laser.getRecoveryOwners();
    const guardians = await laser.getGuardians();
    const nonce = await laser.getNonce();
    const isLocked = await laser.isLocked();
    const chainId = await laser.getChainId();

    console.log("wallet address: ", walletAddress);
    console.log("owner: ", owner);
    console.log("recovery owners: ", recoveryOwners);
    console.log("guardians: ", guardians);
    console.log("nonce: ", nonce);
    console.log("is wallet locked: ", isLocked);
    console.log("chain id: ", chainId);
})();
