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
        { type: "uint256", name: "gasLimit" },
    ],
};

export type Domain = {
    chainId: number | string;
    verifyingContract: string;
};

export type SignTransactionOptions = {
    to: Address;
    value: BigNumberish;
    callData: any;
    txInfo: TransactionInfo;
};

export type Transaction = {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasLimit: BigNumberish;
    relayer: Address;
    signatures: string;
};

export type LaserTypes = {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasLimit: BigNumberish;
};

export type TransactionInfo = {
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasLimit: BigNumberish;
    relayer: Address;
};
