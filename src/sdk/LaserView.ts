import { ethers, utils, BigNumberish } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address, Transaction } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { LaserHelper__factory, LaserHelper } from "../typechain";

import { ILaserView } from "./interfaces/ILaserView";

export type WalletState = {
    owner: string;
    singleton: string;
    timeLock: BigNumberish;
    isLocked: boolean;
    guardians: Address[];
    recoveryOwners: Address[];
    nonce: BigNumberish;
    balance: BigNumberish;
};

/**
 * @dev Class that contains all the relevant view methods to interact with a Laser wallet.
 */
export class LaserView implements ILaserView {
    provider: Provider;
    walletAddress: Address;
    wallet: LaserWallet;
    laserHelper: LaserHelper;

    constructor(_provider: Provider, _walletAddress: Address) {
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = LaserWallet__factory.connect(_walletAddress, this.provider);
        this.laserHelper = LaserHelper__factory.connect("0x5FbDB2315678afecb367f032d93F642f64180aa3", this.provider);
    }

    /**
     * @returns The address of the wallet.
     */
    getAddress(): Address {
        return this.wallet.address;
    }

    async getWalletState(): Promise<WalletState> {
        const { owner, singleton, timeLock, isLocked, guardiansLocked, guardians, recoveryOwners, nonce, balance } =
            await this.laserHelper.getWalletState(this.wallet.address);

        return {
            owner,
            singleton,
            timeLock,
            isLocked,
            guardiansLocked,
            guardians,
            recoveryOwners,
            nonce,
            balance,
        };
    }

    async getSingleton(): Promise<Address> {
        return this.wallet.singleton();
    }

    async getOwner(): Promise<Address> {
        return this.wallet.owner();
    }

    async getTimeLock(): Promise<BigNumberish> {
        return this.wallet.timeLock();
    }

    async isLocked(): Promise<boolean> {
        return this.wallet.isLocked();
    }

    async areGuardiansLocked(): Promise<boolean> {
        return this.wallet.guardiansLocked();
    }

    async isGuardian(guardian: Address): Promise<boolean> {
        return this.wallet.isGuardian(guardian);
    }

    async isRecoveryOwner(recoveryOwner: Address): Promise<boolean> {
        return this.wallet.isRecoveryOwner(recoveryOwner);
    }

    async getGuardians(): Promise<Address[]> {
        return this.wallet.getGuardians();
    }

    async getRecoveryOwners(): Promise<Address[]> {
        return this.wallet.getRecoveryOwners();
    }

    async getVersion(): Promise<string> {
        return this.wallet.VERSION();
    }

    async getNonce(): Promise<number> {
        const nonce = (await this.wallet.nonce()).toString();
        return Number(nonce);
    }
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

    async isValidSignature(hash: string, signature: string): Promise<boolean> {
        const result = await this.wallet.isValidSignature(hash, signature);
        return result.toLowerCase() === "0x1626ba7e";
    }

    async getChainId(): Promise<number> {
        const chainId = (await this.wallet.getChainId()).toString();
        return Number(chainId);
    }
    /**
     * @returns The balance in WEI of this wallet.
     */
    async getBalance(): Promise<BigNumberish> {
        return this.provider.getBalance(this.wallet.address);
    }
}
