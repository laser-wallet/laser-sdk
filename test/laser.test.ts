import { laser, Laser } from "../src";
import { ZERO, MAGIC_VALUE, SALT } from "../src/constants/constants";
import { ethers } from "ethers";
import { assert, expect } from "chai";
import dotenv from "dotenv";
import { FACTORY_GOERLI } from "../src/constants";

dotenv.config();

// This is just for the tests.
const txInfo = {
    maxFeePerGas: 2000000000,
    maxPriorityFeePerGas: 20000000000,
    gasTip: 30000,
};

/**
 * For testing, it can be any deployed laser wallet.
 */
const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const owner = new ethers.Wallet(`${process.env.PK}`);
const walletAddress = "0x223c1B46A2d1779f5E4711E2344126aAeEbDC183";
const wallet = new Laser(provider, owner, walletAddress);

describe("Laser Wallet", () => {
    it("should have correct owner", async () => {
        const walletOwner = await wallet.getOwner();
        if (walletOwner.toLowerCase() !== owner.address.toLowerCase()) {
            throw Error("Wallet owner is not the same as the provided owner, tests will not work properly.");
        }
    });

    describe("changeOwner", () => {
        it("should fail by providing the same owner", async () => {
            try {
                await wallet.changeOwner(owner.address, txInfo);
            } catch (e) {
                expect(`${e}`).to.equal("Error: New owner cannot be current owner.");
            }
        });

        it("should fail by providing an address with code", async () => {
            const factoryGoerli = FACTORY_GOERLI;
            try {
                await wallet.changeOwner(FACTORY_GOERLI, txInfo);
            } catch (e) {
                expect(`${e}`).to.equal("Error: Owner cannot be a contract.");
            }
        });

        it("should fail by providing the zero address", async () => {
            try {
                await wallet.changeOwner(ZERO, txInfo);
            } catch (e) {
                expect(`${e}`).to.equal("Error: Zero address not valid.");
            }
        });
    });
});
