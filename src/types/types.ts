import { BigNumber } from "ethers";

export type Numberish = number | BigNumber | string;

export type Address = string;

export interface Domain {
    chainId: Numberish;
    verifyingContract: Address;
}

// Basic interface primarily for multi-call transaction.
export interface Transaction {
    to: Address;
    value: Numberish;
    data: string;
}

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
    nonce: Numberish;
    initCode: string;
    callData: string;
    callGas: Numberish;
    verificationGas: Numberish;
    preVerificationGas: Numberish;
    maxFeePerGas: Numberish;
    maxPriorityFeePerGas: Numberish;
    paymaster: Address;
    paymasterData: string;
    signature: string;
}
