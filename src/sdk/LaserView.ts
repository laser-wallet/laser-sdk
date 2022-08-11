import { Provider } from "@ethersproject/providers";
import { Address, Transaction } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { LaserHelper__factory, LaserHelper } from "../typechain";
import { ILaserView, WalletState } from "./interfaces/ILaserView";
import { BigNumber, ethers } from "ethers";

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
    async _getWalletState(laserHelper: LaserHelper, ssrModule: Address): Promise<WalletState> {
        const { owner, singleton, isLocked, guardians, recoveryOwners, nonce, balance } =
            await laserHelper.getWalletState(this.wallet.address, ssrModule);

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

    ///@dev The amount of tokens that are in the vault from the provided token and wallet.
    async _getTokensInVault(laserVaultAddress: Address, wallet: Address, tokenAddress: Address): Promise<BigNumber> {
        const abi = ["function getTokensInVault(address,address) external view returns (uint256)"];
        const laserVault = new ethers.Contract(laserVaultAddress, abi, this.provider);

        return laserVault.getTokensInVault(wallet, tokenAddress);
    }
}
