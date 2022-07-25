import { BigNumber, BigNumberish, constants } from "ethers";
import { Provider } from "@ethersproject/providers";
import { WalletState } from "../sdk/LaserView";
import { Address } from "../types";
import { addressEq, isContract, supports1271 } from "./utils";

/**
 * @dev Checks that the parameters are ok to lock the wallet.
 */
export function lockWalletVerifier(signer: Address, walletState: WalletState) {
    if (walletState.isLocked) {
        throw Error("Invalid operation 'lockWallet': wallet is locked.");
    }

    let isRecoveryOwnerOrGuardian = false;

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, signer)) isRecoveryOwnerOrGuardian = true;
    });

    walletState.guardians.map((guardian) => {
        if (addressEq(guardian, signer)) isRecoveryOwnerOrGuardian = true;
    });

    if (!isRecoveryOwnerOrGuardian) {
        throw Error("Invalid operation 'lockWallet': only a recovery owner or guardian can lock the wallet.");
    }
}

/**
 * @dev Checks that the parameters are ok to unlock the wallet.
 */
export function unlockWalletVerifier(signer: Address, walletState: WalletState) {
    if (!walletState.isLocked) {
        throw Error("Invalid operation 'unlockWallet': wallet is not locked.");
    }

    let isOwnerOrRecoveryOwnerOrGuardian = false;

    if (addressEq(signer, walletState.owner)) isOwnerOrRecoveryOwnerOrGuardian = true;

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
    });

    walletState.recoveryOwners.map((recoveryOwner) => {
        if (addressEq(recoveryOwner, signer)) isRecoveryOwnerOrGuardian = true;
    });

    if (!isRecoveryOwnerOrGuardian) {
        throw Error("Invalid operation 'recover': only a recovery owner or guardian can sign this.");
    }

    if (await isContract(provider, newOwner)) {
        throw Error("Invalid operation 'recover': new owner cannot be a contract.");
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
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'changeOwner': only the owner can change the owner.");
    }

    if (addressEq(newOwner, walletState.owner)) {
        throw Error("Invalid operation 'changeOwner': new owner cannot be current owner.");
    }

    if (addressEq(newOwner, constants.AddressZero)) {
        throw Error("Invalid operation 'changeOwner' : new owner cannot be address 0.");
    }

    if (walletState.isLocked) {
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
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'addGuardian': only the owner can add a guardian.");
    }

    if (addressEq(newGuardian, constants.AddressZero)) {
        throw Error("Invalid operation 'addGuardian': new guardian cannot be address 0.");
    }

    if (walletState.isLocked) {
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
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'removeGuardian': only the owner can remove a guardian.");
    }

    if (walletState.isLocked) {
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
 * @dev Checks that the parameters are ok to swap a guardian.
 */
export function swapGuardianVerifier(
    signer: Address,
    newGuardian: Address,
    guardian: Address,
    walletState: WalletState
) {
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'swapGuardian': only the owner can swap a guardian.");
    }

    if (walletState.isLocked) {
        throw Error("Invalid operation 'swapGuardian': wallet is locked.");
    }

    let isGuardian = false;
    let isNewGuardian = false;
    walletState.guardians.map((_guardian) => {
        if (addressEq(_guardian, guardian)) isGuardian = true;
        if (addressEq(_guardian, newGuardian)) isNewGuardian = true;
    });

    if (!isGuardian) {
        throw Error("Invalid operation 'swapGuardian': address is not a guardian.");
    }

    if (newGuardian) {
        throw Error("Invalid operation 'swapGuardian': newGuardian is already a guardian.");
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
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'addRecoveryOwner': only the owner can add a recovery owner.");
    }

    if (addressEq(newRecoveryOwner, constants.AddressZero)) {
        throw Error("Invalid operation 'addRecoveryOwner': new recovery owner cannot be address 0.");
    }

    if (walletState.isLocked) {
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
    if (!addressEq(signer, walletState.owner)) {
        throw Error("Invalid operation 'removeRecoveryOwner': only the owner can remove a recovery owner.");
    }

    if (walletState.isLocked) {
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

export function sendEthVerifier(transferAmount: BigNumber, walletState: WalletState) {
    if (transferAmount.eq(BigNumber.from(0)) || transferAmount.lt(0)) {
        throw Error("Invalid opearation 'sendEth': invalid amount.");
    }

    if (walletState.isLocked) {
        throw Error("Invalid operation 'sendEth': wallet is locked.");
    }

    if (transferAmount.gt(walletState.balance)) {
        throw Error("Invalid operation 'sendEth': insufficient balance.");
    }
}

export function transferERC20Verifier(transferAmount: BigNumber, walletState: WalletState) {}
