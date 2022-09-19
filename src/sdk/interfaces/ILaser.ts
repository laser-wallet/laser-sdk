import { BigNumberish, providers, Wallet } from "ethers";
import { Address, OffChainTransaction, WalletState } from "../../types";

export interface ILaser {
    // Inits Laser.
    init(): Promise<void>;

    execTransaction(
        transaction: OffChainTransaction,
        sender: Wallet,
        gasLimit: number
    ): Promise<providers.TransactionResponse>;

    getWalletState(): Promise<WalletState>;

    lockWallet(nonce: BigNumberish): Promise<OffChainTransaction>;

    unlockWallet(nonce: BigNumberish): Promise<OffChainTransaction>;

    recover(_newOwner: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    changeOwner(_newOwner: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    addGuardian(_newGuardian: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    removeGuardian(_guardian: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    addRecoveryOwner(_newRecoveryOwner: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    removeRecoveryOwner(_recoveryOwner: Address, nonce: BigNumberish): Promise<OffChainTransaction>;

    sendEth(_to: Address, _amount: BigNumberish, nonce: BigNumberish): Promise<OffChainTransaction>;

    transferERC20(
        _tokenAddress: Address,
        _to: Address,
        amount: BigNumberish,
        nonce: BigNumberish
    ): Promise<OffChainTransaction>;

    signTransaction(to: Address, value: BigNumberish, callData: string, nonce: BigNumberish): Promise<string>;
}
