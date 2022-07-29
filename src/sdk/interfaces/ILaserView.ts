import { Address, Transaction, TransactionInfo } from "../../types";
import { BigNumberish, providers } from "ethers";
import { LaserHelper } from "../../typechain";

export type WalletState = {
    owner: string;
    singleton: string;
    isLocked: boolean;
    guardians: Address[];
    recoveryOwners: Address[];
    nonce: BigNumberish;
    balance: BigNumberish;
};

///@title ILaserView - interface for Laser's view functions.
///contract's source: https://github.com/laser-wallet/laser-wallet-contracts
export interface ILaserView {
    ///@dev Returns the state of the wallet and SSR Module <WalletState>
    _getWalletState(laserHelper: LaserHelper, laserModuleAddress: Address): Promise<WalletState>;

    ///@dev Returns the hash to be signed for the specific transaction.
    getOperationHash(transaction: Transaction): Promise<string>;

    ///@dev Returns the magic value if the signature belongs to the owner of the wallet.
    isValidSignature(hash: string, signature: string): Promise<boolean>;
}
