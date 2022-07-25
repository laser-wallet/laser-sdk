import { ethers, utils, BigNumber } from "ethers";
import dotenv from "dotenv";
import { LaserFactory } from "../src/sdk/LaserFactory";
import { sign } from "../src/utils/signatures";

import {
    RELAYER,
    GUARDIAN1,
    GUARDIAN2,
    GUARDIANS,
    RECOVERY_OWNER1,
    RECOVERY_OWNER2,
    RECOVERY_OWNERS,
} from "./constants";

const owner = new ethers.Wallet(`${process.env.PK}`);

// const RELAYER = owner;
dotenv.config();

const providerUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;

const localHost = "http://127.0.0.1:8545/";
const provider = new ethers.providers.JsonRpcProvider(localHost);

const LASER_MODULE = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const FACTORY = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

const r: string[] = [];

for (let i = 0; i < 5; i++) {
    const rec = ethers.Wallet.createRandom().address;
    r.push(rec);
}

// This function creates a new wallet and logs the address to the terminal.
(async function () {
    // Wallet initialization params.
    const factory = new LaserFactory(provider, RELAYER, FACTORY, LASER_MODULE);
    // gas params.
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const maxFeePerGas = BigNumber.from(2).mul(BigNumber.from(baseFee)).add(BigNumber.from(maxPriorityFeePerGas));
    const gasLimit = 500000; // If there are a lot of owners this can change.
    // The salt. It needs to be kept in the database (if it changes, the address will be different on deployment).
    const salt = Math.floor(Math.random() * 1000);
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
    const preComputedAddress = await factory.preComputeAddress(owner.address, RECOVERY_OWNERS, GUARDIANS, salt);
    console.log("precomputed address -->", preComputedAddress);

    await GUARDIAN1.connect(provider).sendTransaction({ to: preComputedAddress, value: utils.parseEther("1") });

    const relayerBal = await provider.getBalance(RELAYER.address);
    console.log("relayer balance: ", ethers.utils.formatEther(relayerBal));
    // The wallet needs to have funds to pay the relayer back.
    const tx = await factory.createWallet(
        owner.address,
        RECOVERY_OWNERS,
        GUARDIANS,
        maxFeePerGas,
        BigNumber.from(maxPriorityFeePerGas),
        gasLimit,
        salt,
        RELAYER.address,
        signature
    );

    const receipt = await tx.wait();

    const gasPrice = receipt.effectiveGasPrice;
    console.log("gas price 2 -->", gasPrice.toString());
    const relayerPostBalance = await provider.getBalance(RELAYER.address);

    const diff = relayerPostBalance.sub(relayerBal);

    const gasDiff = diff.div(gasPrice);

    console.log("gas dif -->", gasDiff.toString());

    const ethDiff = relayerPostBalance.sub(relayerBal);

    console.log("eth dif -->", ethers.utils.formatEther(ethDiff));
})();
