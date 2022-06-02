import { ethers, utils } from "ethers";
import { LaserFactory } from "../src";
import { FACTORY_GOERLI, ENTRY_POINT_GOERLI } from "../src/constants";
import dotenv from "dotenv";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// We create the relayer ...
// The relayer pays for gas costs, in this case, it would be us ...
const relayer = new ethers.Wallet(`${process.env.PK}`);

// Infura Key
const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const goerliChainId = 5;

// We create the factory ...
const factory = new LaserFactory(providerUrl, goerliChainId, relayer, FACTORY_GOERLI);

// This function creates a new wallet and logs the address to the terminal.
// It listents to the event ProxyCreation...
async function main(): Promise<void> {
    const bal = await factory.provider.getBalance(relayer.address);

    // We check that the signer has enough eth (at least 0.1).
    if (Number(utils.formatEther(bal)) < 0.1) {
        throw Error(`Not enough balance: ${utils.formatEther(bal)} ETH`);
    }

    // We create an owner ...
    // I will use this owner to then sign transaction in laser_basics after the contract is created.
    // NEVER put you private key like this, this is just for the example, it doesn't have eth...
    const owner = new ethers.Wallet(
        "0x029e8dda138cd055f391fe18b093cc8baad599d735509f90e0d31ff2ef82ec89"
    );

    // Recovery owner...
    const recoveryOwner = ethers.Wallet.createRandom().address;

    // We create a random guardian ...
    const guardian = ethers.Wallet.createRandom().address;

    // We  listen to the event ...
    await factory.on();

    try {
        // It takes some time, around 1 min.
        await factory.createProxyWithCreate2(
            owner.address,
            recoveryOwner,
            [guardian],
            ENTRY_POINT_GOERLI
        );
    } catch (e) {
        throw Error(`Error with createProxy ${e}`);
    }
}

main();
