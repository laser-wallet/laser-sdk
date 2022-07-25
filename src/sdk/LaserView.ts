import { ethers, utils, BigNumberish } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address, Transaction } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { LaserHelper__factory, LaserHelper } from "../typechain";

import { ILaserView } from "./interfaces/ILaserView";

export type WalletState = {
    owner: string;
    singleton: string;
    isLocked: boolean;
    guardians: Address[];
    recoveryOwners: Address[];
    nonce: BigNumberish;
    balance: BigNumberish;
};

/**
 * @dev Class that contains all the relevant view methods to interact with a Laser wallet.
 */
export class LaserView {
    readonly provider: Provider;
    readonly walletAddress: Address;
    readonly wallet: LaserWallet;
    readonly laserHelper: LaserHelper;
    readonly laserModuleAddress: Address;

    constructor(_provider: Provider, _walletAddress: Address, _laserModuleAddress: Address) {
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = LaserWallet__factory.connect(_walletAddress, this.provider);
        this.laserHelper = LaserHelper__factory.connect("0x5FbDB2315678afecb367f032d93F642f64180aa3", this.provider);
        this.laserModuleAddress = _laserModuleAddress;
    }

    async getWalletState(): Promise<WalletState> {
        const { owner, singleton, isLocked, guardians, recoveryOwners, nonce, balance } =
            await this.laserHelper.getWalletState(this.wallet.address, this.laserModuleAddress);

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
}
