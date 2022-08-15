import { BigNumberish, ethers, BigNumber } from "ethers";
import { Laser, LaserView } from "../src";
import dotenv from "dotenv";
import { Address } from "../src/types";

import { encodeWalletData } from "../src/utils/utils";
import { keccak256 } from "ethers/lib/utils";

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

const walletAddress = "0x999aA618c0732DD1a3235d01E6C6c76C9D8617f8";
const schedule = "fast";

const laser = new Laser(provider, signer, walletAddress);

async function signRequest(tx: any) {
    const relayTransactionHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes", "uint", "uint", "string"],
            [tx.to, tx.data, tx.gas, 5, tx.schedule] // Goerli chainId is 5
        )
    );
    return await signer.signMessage(ethers.utils.arrayify(relayTransactionHash));
}

async function executeTransaction() {
    await laser.init();
    const gasLimit = 300000;
    const txInfo = {
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        gasLimit,
        relayer: signer.address,
    };
    const data = await laser.addGuardian("0xDfc653b092Ee523d7e82f86E61Cd249d7C8E3d1a", txInfo);
}

executeTransaction();
