import { Provider } from "@ethersproject/providers";
import { Address, Transaction } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { LaserHelper__factory, LaserHelper } from "../typechain";
import { ILaserView, WalletState } from "./interfaces/ILaserView";

///@dev Class that contains all the relevant view methods to interact with a Laser wallet.
export class LaserView implements ILaserView {
    readonly provider: Provider;
    readonly walletAddress: Address;
    readonly wallet: LaserWallet;

    constructor(_provider: Provider, _walletAddress: Address) {
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = LaserWallet__factory.connect(_walletAddress, this.provider);
    }

    ///@dev Returns the state of the wallet and SSR Module <WalletState>
    async _getWalletState(laserHelper: LaserHelper, laserModuleAddress: Address): Promise<WalletState> {
        const { owner, singleton, isLocked, guardians, recoveryOwners, nonce, balance } =
            await laserHelper.getWalletState(this.wallet.address, laserModuleAddress);

        return {
            owner,
            singleton,
            isLocked,
            guardians,
            recoveryOwners,
            nonce,
            balance,
        };
    }

    ///@dev Returns the hash to be signed for the specific transaction.
    async getOperationHash(transaction: Transaction): Promise<string> {
        return this.wallet.operationHash(
            transaction.to,
            transaction.value,
            transaction.callData,
            transaction.nonce,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasLimit
        );
    }

    ///@dev Returns the magic value if the signature belongs to the owner of the wallet.
    async isValidSignature(hash: string, signature: string): Promise<boolean> {
        const result = await this.wallet.isValidSignature(hash, signature);
        return result.toLowerCase() === "0x1626ba7e";
    }
}
