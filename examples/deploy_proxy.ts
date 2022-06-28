import { ethers, utils } from "ethers";
import { FACTORY_GOERLI, FACTORY_MAINNET } from "../src/constants";
import dotenv from "dotenv";
import { factoryAbi } from "../src/abis/LaserProxyFactory.json";
import { Factory } from "../src/sdk/Factory";

/**
 * EXAMPLE TO DEPLOY A PROXY IN GOERLI ...
 */
dotenv.config();

// We create the relayer ...
// The relayer pays for gas costs, in this case, it would be us ...
const relayer = new ethers.Wallet(`${process.env.PK}`);

const providerUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const factory = new Factory(provider, relayer, FACTORY_MAINNET);

// This function creates a new wallet and logs the address to the terminal.
// It listents to the event ProxyCreation...
async function main(): Promise<void> {
    const bal = await factory.provider.getBalance(relayer.address);

    // We check that the signer has enough eth (at least 0.01).
    if (Number(utils.formatEther(bal)) < 0.01) {
        throw Error(`Not enough balance: ${utils.formatEther(bal)} ETH`);
    }

    const owner = new ethers.Wallet(`${process.env.PK}`);

    // Recovery owner...
    const recoveryOwner = ethers.Wallet.createRandom().address;

    // We create a random guardian ...
    const guardian = ethers.Wallet.createRandom().address;

    // We  listen to the event ...
    await factory.on();

    // Here we precompute the address. (know the address in advanced).
    const ownerAddress = owner.address;

    /// NOTE: If any of the parameters change, the address will be completely different.
    const dataInitializer = factory.encodeFunctionData([ownerAddress, recoveryOwner, [guardian]]);

    const address = await factory.preComputeAddress(dataInitializer);

    console.log("PRE COMPUTED address -->", address);

    try {
        // It takes some time, around 1 min.
        await factory.createProxyWithCreate2(owner.address, recoveryOwner, [guardian]);
    } catch (e) {
        throw Error(`Error with createProxy ${e}`);
    }
}

main();
