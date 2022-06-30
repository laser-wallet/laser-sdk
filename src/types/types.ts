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

export type ChainInfo = {
    chainId: number | string;
    name: string;
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

export interface Transaction {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasTip: BigNumberish;
    signatures: string;
    chainInfo: ChainInfo;
}

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

export interface BlockOutput {
    hash: string;
    type: BigNumberish;
    blockHash: string;
    blockNumber: BigNumberish;
    confirmations: BigNumberish;
    from: Address;
    gasPrice: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    maxFeePerGas: BigNumberish;
    gasLimit: BigNumberish;
    to: Address;
    value: BigNumberish;
    nonce: BigNumberish;
    data: string;
}
