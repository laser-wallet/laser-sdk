import { ethers } from "ethers";
import { Transaction } from "../types";

export const ZERO = ethers.constants.AddressZero;

export const MAGIC_VALUE = "0x1626ba7e";

///SALT for the creation of new wallets.
export const SALT = 1111;

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
