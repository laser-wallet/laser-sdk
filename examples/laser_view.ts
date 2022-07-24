import { ethers } from "ethers";
import { LaserView } from "../src/";
import dotenv from "dotenv";

dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
const walletAddress = "0xAD85b6619338537143f03802ed6dAcec73872e1E";

const laser = new LaserView(provider, walletAddress);

/**
 * Examples to interact with a Laser wallet (view methods).
 */
(async function () {
    const walletState = await laser.getWalletState();

    console.log(walletState);
})();
