import { Address, Transaction, WalletState, RecoveryTransaction } from "../../types";
import { BigNumberish, providers, ContractReceipt } from "ethers";
import { LaserTransaction } from "../../utils";

export interface ILaser {
    // Inits Laser.
    init(): Promise<void>;

    execTransaction(transaction: LaserTransaction): Promise<ContractReceipt>;

    getWalletState(): Promise<WalletState>;

    lockWallet(nonce: Number): Promise<RecoveryTransaction>;

    unlockWallet(nonce: Number): Promise<RecoveryTransaction>;

    recover(_newOwner: Address, nonce: Number): Promise<RecoveryTransaction>;

    changeOwner(_newOwner: Address, nonce: Number): Promise<Transaction>;

    addGuardian(_newGuardian: Address, nonce: Number): Promise<Transaction>;

    removeGuardian(_guardian: Address, nonce: Number): Promise<Transaction>;

    addRecoveryOwner(_newRecoveryOwner: Address, nonce: Number): Promise<Transaction>;

    removeRecoveryOwner(_recoveryOwner: Address, nonce: Number): Promise<Transaction>;

    sendEth(_to: Address, _amount: BigNumberish, nonce: Number): Promise<Transaction>;

    transferERC20(_tokenAddress: Address, _to: Address, amount: BigNumberish, nonce: Number): Promise<Transaction>;

    signTransaction(to: Address, value: BigNumberish, callData: string, nonce: BigNumberish): Promise<Transaction>;
}
