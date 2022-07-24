import { Address, Transaction, TransactionInfo } from "../../types";
import { BigNumberish, providers, ContractReceipt } from "ethers";

/**
 * @title ILaser - interface for Laser's core logic.
 * contract's source: https://github.com/laser-wallet/laser-wallet-contracts
 */
export interface ILaser {
    ///@dev Generic Laser transaction
    execTransaction(transaction: Transaction): Promise<any>;

    lockWallet(txInfo: TransactionInfo): Promise<Transaction>;

    unlockWallet(txInfo: TransactionInfo): Promise<Transaction>;

    recoveryUnlock(txInfo: TransactionInfo): Promise<Transaction>;

    unlockGuardians(txInfo: TransactionInfo): Promise<Transaction>;

    recover(newOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    addGuardian(newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction>;

    removeGuardian(guardianToRemove: Address, txInfo: TransactionInfo): Promise<Transaction>;

    swapGuardian(newGuardian: Address, oldGuardian: Address, txInfo: TransactionInfo): Promise<Transaction>;

    addRecoveryOwner(newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    removeRecoveryOwner(recoveryOwnerToRemove: Address, txInfo: TransactionInfo): Promise<Transaction>;

    swapRecoveryOwner(
        newRecoveryOwner: Address,
        oldRecoveryOwner: Address,
        txInfo: TransactionInfo
    ): Promise<Transaction>;

    sendEth(to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction>;

    transferERC20(
        tokenAddress: Address,
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction>;
}
