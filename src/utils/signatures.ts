import { ethers, Wallet } from "ethers";
import { Domain, Address, Numberish, types, UserOperation } from "../types";
import { ZERO } from "../constants";

export async function EIP712Sig(
    signer: Wallet,
    userOp: UserOperation,
    domain: Domain
): Promise<string> {
    const txMessage = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: userOp.callData,
        callGas: userOp.callGas,
        verificationGas: userOp.preVerificationGas,
        preVerificationGas: 10000,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymaster: ZERO, // we are not using a paymaster
        paymasterData: "0x",
    };

    // Returns the signature.
    return await signer._signTypedData(domain, types, txMessage);
}
