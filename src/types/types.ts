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

export type Transaction = {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
    signatures: string;
    signer?: string;
};

export type RecoveryTransaction = {
    nonce: Number;
    callData: string;
    signatures: string;
    signer?: string;
};
export type LaserTypes = {
    to: Address;
    value: BigNumberish;
    callData: string;
    nonce: BigNumberish;
};

export type WalletState = {
    owner: string;
    guardians: Address[];
    recoveryOwners: Address[];
    singleton: string;
    isLocked: boolean;
    nonce: BigNumberish;
    balance: BigNumberish;
};
