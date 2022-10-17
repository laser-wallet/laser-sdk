import { BigNumber, BigNumberish, constants, ethers } from "ethers";
import { Provider } from "@ethersproject/providers";
import { OffChainTransaction, WalletState } from "../types";
import { Address } from "../types";
import { addressEq, isContract, supports1271, verifyAddress } from "./utils";

/**
 * @dev Checks that the parameters are ok to unlock the wallet.
 */
export function unlockWalletVerifier(signer: Address, walletState: WalletState) {
    if (!walletState._isLocked) {
        throw Error("Invalid operation 'unlockWallet': wallet is not locked.");
    }

    let isOwnerOrRecoveryOwnerOrGuardian = false;

    if (addressEq(signer, walletState.oldOwner)) isOwnerOrRecoveryOwnerOrGuardian = true;

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, signer)) isOwnerOrRecoveryOwnerOrGuardian = true;
    });

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, signer)) isOwnerOrRecoveryOwnerOrGuardian = true;
    });

    if (!isOwnerOrRecoveryOwnerOrGuardian) {
        throw Error("Invalid operation 'unlockWallet': only the owner or recovery owner or guardian can sign this.");
    }
}

/**
 * @dev Checks that the parameters are ok to recover the wallet.
 */
export async function recoverVerifier(
    signer: Address,
    newOwner: Address,
    provider: Provider,
    walletState: WalletState
) {
    let isRecoveryOwnerOrGuardian = false;

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, signer)) isRecoveryOwnerOrGuardian = true;
        if (addressEq(guardian, newOwner)) {
            throw Error("Invalid operation 'recover': guardian cannot be owner.");
        }
    });

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, signer)) isRecoveryOwnerOrGuardian = true;
        if (addressEq(recoveryOwner, newOwner)) {
            throw Error("Invalid operation 'recover': recovery owner cannot be owner.");
        }
    });

    if (!isRecoveryOwnerOrGuardian) {
        throw Error("Invalid operation 'recover': only a recovery owner or guardian can sign this.");
    }

    if (await isContract(provider, newOwner)) {
        throw Error("Invalid operation 'recover': new owner cannot be a contract.");
    }

    if (newOwner.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) {
        throw Error("Invalid operation 'recover': new owner cannot be address(0).");
    }
}

/**
 * @dev Checks that the parameters are ok to change the owner.
 */
export async function changeOwnerVerifier(
    signer: Address,
    provider: Provider,
    newOwner: Address,
    walletState: WalletState
) {
    if (addressEq(newOwner, walletState.owner)) {
        throw Error("Invalid operation 'changeOwner': new owner cannot be current owner.");
    }

    if (addressEq(newOwner, constants.AddressZero)) {
        throw Error("Invalid operation 'changeOwner' : new owner cannot be address 0.");
    }

    if (walletState._isLocked) {
        throw Error("Invalid operation 'changeOwner': wallet is locked.");
    }

    if (await isContract(provider, newOwner)) {
        throw Error("Invalid operation 'changeOwner': new owner cannot be a contract.");
    }

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, newOwner)) {
            throw Error("Invalid operation 'changeOwner': new owner cannot be a current guardian.");
        }
    });

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, newOwner)) {
            throw Error("Invalid operation 'changeOwner': new owner cannot be a current recovery owner.");
        }
    });
}

/**
 * @dev Checks that the parameters are ok to add a guardian.
 */
export async function addGuardianVerifier(
    signer: Address,
    provider: Provider,
    newGuardian: Address,
    walletState: WalletState
) {
    if (addressEq(newGuardian, constants.AddressZero)) {
        throw Error("Invalid operation 'addGuardian': new guardian cannot be address 0.");
    }

    if (walletState._isLocked) {
        throw Error("Invalid operation 'addGuardian': wallet is locked.");
    }

    if (await isContract(provider, newGuardian)) {
        await supports1271(provider, newGuardian);
    }

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, newGuardian)) {
            throw Error("Invalid operation 'addGuardian': new guardian cannot be a current guardian.");
        }
    });

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, newGuardian)) {
            throw Error("Invalid operation 'addGuardian': new guardian cannot be a current recovery owner.");
        }
    });
}

/**
 * @dev Checks that the parameters are ok to remove a guardian.
 */
export function removeGuardianVerifier(signer: Address, guardian: Address, walletState: WalletState) {
    if (walletState._isLocked) {
        throw Error("Invalid operation 'removeGuardian': wallet is locked.");
    }

    let isGuardian = false;
    walletState.guardians.map((_guardian) => {
        if (addressEq(_guardian, guardian)) isGuardian = true;
    });
    if (!isGuardian) {
        throw Error("Invalid operation 'removeGuardian': address is not a guardian.");
    }

    if (walletState.guardians.length < 2) {
        throw Error("Invalid operation 'removeGuardian': there needs to be at least 2 guardians.");
    }
}

/**
 * @dev Checks that the parameters are ok to add a recovery owner.
 */
export async function addRecoveryOwnerVerifier(
    signer: Address,
    provider: Provider,
    newRecoveryOwner: Address,
    walletState: WalletState
) {
    if (addressEq(newRecoveryOwner, constants.AddressZero)) {
        throw Error("Invalid operation 'addRecoveryOwner': new recovery owner cannot be address 0.");
    }

    if (walletState._isLocked) {
        throw Error("Invalid operation 'addRecoveryOwner': wallet is locked.");
    }

    if (await isContract(provider, newRecoveryOwner)) {
        await supports1271(provider, newRecoveryOwner);
    }

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, newRecoveryOwner)) {
            throw Error("Invalid operation 'addRecoveryOwner': new recovery owner cannot be a current guardian.");
        }
    });

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, newRecoveryOwner)) {
            throw Error("Invalid operation 'addRecoveryOwner': new recovery owner cannot be a current recovery owner.");
        }
    });
}

/**
 * @dev Checks that the parameters are ok to remove a recovery owner.
 */
export function removeRecoveryOwnerVerifier(signer: Address, recoveryOwner: Address, walletState: WalletState) {
    if (walletState._isLocked) {
        throw Error("Invalid operation 'removeRecoveryOwner': wallet is locked.");
    }

    let isRecoveryOwner = false;
    walletState.recoveryOwners.map((_recoveryOwner) => {
        if (addressEq(_recoveryOwner, recoveryOwner)) isRecoveryOwner = true;
    });
    if (!isRecoveryOwner) {
        throw Error("Invalid operation 'removeRecoveryOwner': address is not a recovery owner.");
    }

    if (walletState.recoveryOwners.length < 2) {
        throw Error("Invalid operation 'removeRecoveryOwner': there needs to be at least 2 recovery owners.");
    }
}

export function sendEthVerifier(signer: Address, transferAmount: BigNumber, walletState: WalletState) {
    if (transferAmount.eq(BigNumber.from(0)) || transferAmount.lt(0)) {
        throw Error("Invalid opearation 'sendEth': invalid amount.");
    }

    if (transferAmount.gt(walletState.balance)) {
        throw Error("Invalid operation 'sendEth': insufficient balance.");
    }
}

export function transferERC20Verifier(
    signer: Address,
    transferAmount: BigNumber,
    walletBalance: BigNumber,
    walletState: WalletState
) {
    if (transferAmount.gt(walletBalance)) {
        throw Error("Invalid operation 'transferERC20': insufficient balance.");
    }
}

export async function verifyDeployment(
    provider: Provider,
    owner: Address,
    recoveryOwners: Address[],
    guardians: Address[]
): Promise<void> {
    await Promise.all([
        verifyOwner(provider, owner),
        verifyGuardians(provider, guardians),
        verifyRecoveryOwners(provider, recoveryOwners),
        verifyDuplicate(owner, recoveryOwners, guardians),
    ]);
}

async function verifyOwner(provider: Provider, _owner: Address): Promise<void> {
    const owner = await verifyAddress(provider, _owner);

    if (owner.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) {
        throw Error("Owner cannot be address 0.");
    }

    if (await isContract(provider, owner)) {
        throw Error("Owner cannot be a contract.");
    }
}

async function verifyGuardians(provider: Provider, guardians: Address[]): Promise<void> {
    if (guardians.length < 1) {
        throw Error("There needs to be at least 1 guardian.");
    }

    let dupGuardians: string[] = [];

    for (let i = 0; i < guardians.length; i++) {
        const guardian = await verifyAddress(provider, guardians[i]);
        dupGuardians.push(guardian.toLowerCase());
        if (guardian.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) {
            throw Error("Guardian cannot be address 0.");
        }

        if (await isContract(provider, guardian)) {
            if (!(await supports1271(provider, guardian))) {
                throw Error("Guardian does not support EIP1271.");
            }
        }
    }

    if (new Set(dupGuardians).size < dupGuardians.length) {
        throw Error("Duplicate guardians.");
    }
}

async function verifyRecoveryOwners(provider: Provider, recoveryOwners: Address[]): Promise<void> {
    if (recoveryOwners.length < 1) {
        throw Error("There needs to be at least 1 recovery owner.");
    }

    let dupRecoveryOwners: string[] = [];

    for (let i = 0; i < recoveryOwners.length; i++) {
        const recoveryOwner = await verifyAddress(provider, recoveryOwners[i]);
        dupRecoveryOwners.push(recoveryOwner.toLowerCase());
        if (recoveryOwner.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) {
            throw Error("Recovery owner cannot be address 0.");
        }

        if (await isContract(provider, recoveryOwner)) {
            if (!(await supports1271(provider, recoveryOwner))) {
                throw Error("Recovery owner does not support EIP1271.");
            }
        }
    }

    if (new Set(dupRecoveryOwners).size < dupRecoveryOwners.length) {
        throw Error("Duplicate recovery owners.");
    }
}

function verifyDuplicate(owner: Address, recoveryOwners: Address[], guardians: Address[]) {
    if (recoveryOwners.includes(owner)) {
        throw Error("Owner cannot be a recovery owner.");
    }

    if (guardians.includes(owner)) {
        throw Error("Owner cannot be a guardian.");
    }

    for (let i = 0; i < recoveryOwners.length; i++) {
        if (guardians.includes(recoveryOwners[i])) {
            throw Error("Recovery owner cannot be a guardian.");
        }
    }
}

export function verifyPackedSignatures(tr1: OffChainTransaction, tr2: OffChainTransaction) {
    if (tr1.signer !== "owner" && tr1.signer !== "guardian" && tr1.signer !== "recoveryOwner") {
        throw Error("Invalid signer");
    }

    if (tr2.signer !== "owner" && tr2.signer !== "guardian" && tr2.signer !== "recoveryOwner") {
        throw Error("Invalid signer");
    }

    if (tr1.signer.toLowerCase() === tr2.signer.toLowerCase()) {
        throw Error("Signers cannot be the same.");
    }

    if (("value" in tr1 && !("value" in tr2)) || ("value" in tr2 && !("value" in tr1))) {
        throw Error("Transaction types mismatch.");
    }

    if ("to" in tr1 && "to" in tr2) {
        if (tr1.to.toLowerCase() !== tr2.to.toLowerCase()) {
            throw Error("Transaction 'to' mismatch.");
        }
    }

    if ("value" in tr1 && "value" in tr2) {
        if (tr1.value.toString() !== tr2.value.toString()) {
            throw Error("Transaction 'value' missmatch.");
        }
    }

    if (tr1.nonce.toString() !== tr2.nonce.toString()) {
        throw Error("Transaction 'nonce' mismatch.");
    }

    if (tr1.callData.toLowerCase() !== tr2.callData.toLowerCase()) {
        throw Error("Transaction 'callData' missmatch.");
    }

    if (tr1.signatures.length < 132 || tr2.signatures.length < 132) {
        throw Error("Invalid signature length.");
    }
}
