import { BigNumberish } from "ethers";

export type Address = string;

export const types = {
    LaserOperation: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "callData" },
        { type: "uint256", name: "nonce" },
    ],
};

export type Domain = {
    chainId: number | string;
    verifyingContract: string;
};

export type LaserTypes = {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
};

type TransactionType = "recovery" | "exec";
export type OffChainTransaction = {
    wallet: Address;
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    signatures: string;
    signer: string;
    chain: string;
    transactionType: TransactionType | string;
    description?: string;
};

export type WalletState = {
    owner: string;
    guardians: Address[];
    recoveryOwners: Address[];
    singleton: string;
    _isLocked: boolean;
    nonce: BigNumberish;
    balance: BigNumberish;
    oldOwner: Address;
};
