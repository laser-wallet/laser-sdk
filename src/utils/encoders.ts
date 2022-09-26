import { utils, BigNumberish, Signer } from "ethers";
import { Address, WalletState } from "../types";
import { LaserWallet__factory } from "../typechain";

export function encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
    const params = _params[0];
    return new utils.Interface(abi).encodeFunctionData(funcName, params);
}

export function getInitializer(
    owner: Address,
    guardians: Address[],
    recoveryOwners: Address[],
    ownerSignature: string
): string {
    return encodeFunctionData(LaserWallet__factory.abi, "init", [owner, guardians, recoveryOwners, ownerSignature]);
}

export function getRecoveryHash(
    walletAddress: Address,
    nonce: BigNumberish,
    chainId: Number,
    callData: string
): string {
    return utils.solidityKeccak256(
        ["uint256", "bytes", "address", "uint256"],
        [nonce, utils.keccak256(callData), walletAddress, chainId]
    );
}

export function getInitHash(guardians: Address[], recoveryOwners: Address[], chainId: Number): string {
    return utils.solidityKeccak256(["address[]", "address[]", "uint256"], [guardians, recoveryOwners, chainId]);
}

export function decodeSigner(walletState: WalletState, _signer: Address): string {
    const signer = _signer.toLowerCase();

    if (signer === walletState.owner.toLowerCase() || signer === walletState.oldOwner.toLowerCase()) {
        return "owner";
    }

    for (let i = 0; i < walletState.recoveryOwners.length; i++) {
        const recoveryOwner = walletState.recoveryOwners[i];
        if (recoveryOwner.toLowerCase() === signer) {
            return "recoveryOwner";
        }
    }

    for (let i = 0; i < walletState.guardians.length; i++) {
        const guardian = walletState.guardians[i];
        if (guardian.toLowerCase() === signer) {
            return "guardian";
        }
    }

    throw Error("Invalid signer.");
}
