import { Address, Transaction, TransactionInfo } from "../../types";
import { BigNumberish, providers } from "ethers";

/**
 * @title ILaserView - interface for Laser's view functions.
 * contract's source: https://github.com/laser-wallet/laser-wallet-contracts
 */
export interface ILaserView {
    getSingleton(): Promise<Address>;

    getOwner(): Promise<Address>;

    ///@dev If the wallet is locked, it returns the exact time when that happened.
    ///We need this so we activate the chain of recovery owners (1 week each).
    getTimeLock(): Promise<BigNumberish>;

    ///@dev If true, the owner cannot do operations by itself, and the recovery mechanism is activated.
    isLocked(): Promise<boolean>;

    ///@dev If true, guardians are restricted to do any type of operation.
    areGuardiansLocked(): Promise<boolean>;

    isGuardian(guardian: Address): Promise<boolean>;

    isRecoveryOwner(recoveryOwner: Address): Promise<boolean>;

    getGuardians(): Promise<Address[]>;

    getRecoveryOwners(): Promise<Address[]>;

    getVersion(): Promise<string>;

    getNonce(): Promise<number>;

    getOperationHash(transaction: Transaction): Promise<string>;

    isValidSignature(hash: string, signature: string): Promise<boolean>;

    getChainId(): Promise<number>;

    getBalance(): Promise<BigNumberish>;
}
