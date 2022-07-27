import { ethers } from "ethers";
import { Transaction } from "../types";

export const ZERO = ethers.constants.AddressZero;

export const MAGIC_VALUE = "0x1626ba7e";

export const emptyTransaction: Transaction = {
    to: "",
    value: "",
    callData: "",
    nonce: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    gasLimit: "",
    relayer: ethers.constants.AddressZero,
    signatures: "",
};


export const DEPLOYED_ADDRESSES = {
    "31337": {
        laserFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
        laserHelper: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        laserModuleSSR: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        
    },
};