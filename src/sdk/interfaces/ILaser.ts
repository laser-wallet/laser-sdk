import { Address, Transaction, TransactionInfo } from "../../types";
import { BigNumberish, providers, ContractReceipt } from "ethers";

///@title ILaser - interface for Laser's core logic.
///contract's source: https://github.com/laser-wallet/laser-wallet-contracts
export interface ILaser {
    ///@dev Generic Laser transaction.
    execTransaction(transaction: Transaction): Promise<any>;

    ///@dev Returns the transaction type to locks the wallet. Can only be called by the recovery owner or guardian.
    lockWallet(txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type  to unlock the wallets. Can only be called by the owner + recovery owner
    /// or owner + guardian.
    unlockWallet(txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to recover the wallet. Can only be called by a recovery owner or guardian.
    recover(newOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type  to change the owner. Can only be called by the owner.
    changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to add a guardian. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    addGuardian(newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to remove a guardian. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    removeGuardian(guardianToRemove: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type add a recovery owner. Can only be called by the owenr.
    ///@notice The state is in the SSR module, not in the wallet itself.
    addRecoveryOwner(newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to remove a recovery owner. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    removeRecoveryOwner(recoveryOwnerToRemove: Address, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to send eth. Can only be called by the owner.
    sendEth(to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction>;

    ///@dev Returns the transaction type to transfer an ERC-20 token. Can only be called by the owner.
    transferERC20(
        tokenAddress: Address,
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction>;
}
