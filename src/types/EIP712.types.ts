import { BigNumberish } from "ethers";
import { Address } from "./types";
import { ZERO } from "../constants";

export const types = {
    LaserOp: [
        { type: "address", name: "sender" },
        { type: "uint256", name: "nonce" },
        { type: "bytes", name: "callData" },
        { type: "uint256", name: "callGas" },
        { type: "uint256", name: "verificationGas" },
        { type: "uint256", name: "preVerificationGas" },
        { type: "uint256", name: "maxFeePerGas" },
        { type: "uint256", name: "maxPriorityFeePerGas" },
        { type: "address", name: "paymaster" },
        { type: "bytes", name: "paymasterData" },
    ],
};

/**
 * @dev UserOperation struct to implement account abstraction (EIP 4337).
 * SEE: https://eips.ethereum.org/EIPS/eip-4337
 * @param sender The wallet making the operation (should be address(this)).
 * @param nonce Anti-replay parameter; also used as the salt for first-time wallet creation.
 * @param initCode The initCode of the wallet (only needed if the wallet is not yet on-chain and needs to be created).
 * @param callData The data to pass to the sender during the main execution call.
 * @param callGas The amount of gas to allocate the main execution call.
 * @param verificationGas The amount of gas to allocate for the verification step.
 * @param preVerificationGas The amount of gas to pay to compensate the bundler for the pre-verification execution and calldata.
 * @param maxFeePerGas Maximum fee per gas (similar to EIP 1559  max_fee_per_gas).
 * @param maxPriorityFeePerGas Maximum priority fee per gas (similar to EIP 1559 max_priority_fee_per_gas).
 * @param paymaster Address sponsoring the transaction (or zero for regular self-sponsored transactions).
 * @param paymasterData Extra data to send to the paymaster.
 * @param signature Data passed into the wallet along with the nonce during the verification step.
 */
export interface UserOperation {
    sender: Address;
    nonce: BigNumberish;
    initCode: string;
    callData: string;
    callGas: BigNumberish;
    verificationGas: BigNumberish;
    preVerificationGas: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    paymaster: Address;
    paymasterData: string;
    signature: string;
}

export interface Domain {
    chainId: BigNumberish;
    verifyingContract: Address;
}

// Basic userOp object.
export const userOp: UserOperation = {
    sender: "",
    nonce: "",
    initCode: "0x",
    callData: "",
    callGas: 0,
    verificationGas: 1000000, // we can hardcode this ..
    preVerificationGas: 1000000, // We can hardcode this for now ...
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 0,
    paymaster: ZERO,
    paymasterData: "0x",
    signature: "",
};
