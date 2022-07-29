import { BigNumberish, ethers, BigNumber } from "ethers";
import { LaserFactory } from "../src/";
import dotenv from "dotenv";
import { Address } from "../src/types";

import { encodeFactoryData } from "../../laser-sdk/src/utils/utils";
import { sign } from "../src/utils";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_KEY}`);
const signer = new ethers.Wallet(`0x${process.env.PK}`, provider);

const itx = new ethers.providers.InfuraProvider(
    "goerli", // or 'ropsten', 'rinkeby', 'kovan', 'mainnet'
    `${process.env.INFURA_KEY}`
);

///@dev From Infura's docs:
`
*** fast targets getting your transaction mined in ~6 blocks (1:30 min)
*** slow targets getting your transaction mined in ~200 blocks (1 hour)
`;
type Schedule = "fast" | "slow";
type InfuraTransaction = {
    to: Address;
    data: string;
    gas: BigNumberish;
    signature: string;
    schedule: Schedule;
};

const schedule = "fast";

async function signRequest(tx: any) {
    const relayTransactionHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes", "uint", "uint", "string"],
            [tx.to, tx.data, tx.gas, 5, tx.schedule]
        )
    );
    return await signer.signMessage(ethers.utils.arrayify(relayTransactionHash));
}

async function executeTransaction() {
    const factory = new LaserFactory(provider, signer);
    await factory.init();

    const gasLimit = 400000;

    const recoveryOwners = ["0x99C64Bb3E604B9A3aDB9455f6A80C92c7ad397fC"];
    const guardians = ["0xe70e3d7197bd1c5f0621E1c43f239a04cA01e255"];
    const salt = 14;
    const maxFeePerGas = 0;
    const maxPriorityFeePerGas = 0;

    const preComputeAddress = await factory.preComputeAddress(signer.address, recoveryOwners, guardians, salt);
    console.log("address: ", preComputeAddress);

    const data = encodeFactoryData(
        await factory.createWallet(
            signer.address,
            recoveryOwners,
            guardians,
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit,
            salt,
            signer.address
        )
    );

    const tx = {
        to: await factory.getAddress(),
        data: data,
        gas: gasLimit.toString(),
        schedule: "fast",
    };
    const signature = await signRequest(tx);

    const relayTransactionHash = await itx.send("relay_sendTransaction", [tx, signature]);
    console.log(`ITX relay hash: ${relayTransactionHash.hash}`);
    return relayTransactionHash;
}

executeTransaction();
