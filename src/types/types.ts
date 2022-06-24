import { BigNumberish } from "ethers";

export type Address = string;

export const types = {
    LaserOperation: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "callData" },
        { type: "uint256", name: "nonce" },
        { type: "uint256", name: "maxFeePerGas" },
        { type: "uint256", name: "maxPriorityFeePerGas" },
        { type: "uint256", name: "gasTip" },
    ],
};

export type Domain = {
    chainId: number | string;
    verifyingContract: string;
};

export interface Transaction {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasTip: BigNumberish;
    signatures: string;
}

export const transaction: Transaction = {
    to: "",
    value: "",
    callData: "",
    nonce: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    gasTip: "",
    signatures: "",
};

export interface LaserTypes {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasTip: BigNumberish;
}

export interface TransactionInfo {
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasTip: BigNumberish;
}
