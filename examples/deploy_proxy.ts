import { ethers, utils, BigNumber } from "ethers";
import dotenv from "dotenv";
import { LaserFactory } from "../src/sdk/LaserFactory";
import { address as FACTORY_GOERLI } from "../src/deployments/goerli/LaserFactory.json";
import { sign } from "../src/utils/signatures";

dotenv.config();

// We create the relayer ...
// The relayer pays for gas costs, in this case, it would be us ...
const relayer = new ethers.Wallet(`${process.env.PK}`);

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const factory = new LaserFactory(provider, relayer, FACTORY_GOERLI);

// This function creates a new wallet and logs the address to the terminal.
(async function () {
    // Wallet initialization params.
    const owner = new ethers.Wallet(`${process.env.PK}`);

    // There needs to be at least 2 recovery owners.
    const recoveryOwner = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
        .address;
    const recoveryOwner2 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")
        .address;
    const recoveryOwners = [recoveryOwner, recoveryOwner2];

    // There needs to be at least 2 guardians.
    const guardian = new ethers.Wallet("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba").address;
    const guardian2 = new ethers.Wallet("0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897").address;
    const guardians = [guardian, guardian2];

    // gas params.
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const maxFeePerGas = BigNumber.from(2).mul(BigNumber.from(baseFee)).mul(BigNumber.from(maxPriorityFeePerGas));
    const gasLimit = 400000; // If there are a lot of owners this can change.

    // The relayer's address.
    const _relayer = relayer.address;

    // The salt. It needs to be kept in the database (if it changes, the address will be different on deployment).
    const salt = 12312342321;

    // The signature
    const abiCoder = new ethers.utils.AbiCoder();
    const chainId = (await provider.getNetwork()).chainId;
    const dataHash = ethers.utils.keccak256(
        abiCoder.encode(
            ["uint256", "uint256", "uint256", "uint256"],
            [maxFeePerGas, maxPriorityFeePerGas, gasLimit, chainId]
        )
    );
    const signature = await sign(owner, dataHash);

    // Pre computing the address.
    // We only need the owner, recovery owners, guardians, and salt.
    // The other parameters will change upon creation (that is why we don't use them here).
    const preComputedAddress = await factory.preComputeAddress(owner.address, recoveryOwners, guardians, salt);
    console.log("precomputed address: ", preComputedAddress);

    factory.on();

    // The wallet needs to have funds to pay the relayer back.
    await factory.createWallet(
        owner.address,
        recoveryOwners,
        guardians,
        maxFeePerGas,
        BigNumber.from(maxPriorityFeePerGas),
        gasLimit,
        salt,
        _relayer,
        signature
    );
})();
