import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address, Numberish } from "../src/types";
import { ZERO, SALT } from "../src/constants/constants";
import { checksum, toWei, toEth } from "../src/utils";
import { abi } from "../src/abis/LaserProxyFactory.json";
import { LaserFactory } from "../src";
import dotenv from "dotenv";

dotenv.config();
const chain = {
    MAINNET: "mainnet",
    GOERLI: "goerli",
};
const rpcUrl = `https://${chain.GOERLI}.infura.io/v3/${process.env.KEY}`;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(`${process.env.PK}`, provider);

describe("Laser Factory", () => {
    beforeEach(async () => {
        // Signer needs to have some Eth.
        const amount = 0.1;
        const bal = toEth(await provider.getBalance(signer.address));
        if (bal < amount) {
            throw Error(`Signer needs to have ${amount} ETH`);
        }
    });
    it("should return the singleton", async () => {});
});
