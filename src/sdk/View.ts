import { Contract, ethers, utils, BigNumberish } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Address } from "../types";
import { abi } from "../abis/LaserWallet.json";

/**
 * @dev Contains all view methods for Laser.
 */
interface IView {
    getAddress(): Address;
    getVersion(): Promise<string>;
    getNonce(): Promise<string>;
    getOwner(): Promise<Address>;
    getRecoveryOwner(): Promise<Address>;
    getGuardians(): Promise<Address[]>;
    getBalance(): Promise<BigNumberish>;

    // If the wallet is locked, the recovery mechanism gets activated and some operations are restricted,
    // primarily value operations...
    isWalletLocked(): Promise<boolean>;

    // If the guardians are locked, they cannot do operations...
    areGuardiansBlocked(): Promise<boolean>;

    // The network id that the wallet is currently connected to.
    getNetworkId(): Promise<string>;
}

/**
 * @dev Class that contains all the relevant view methods to interact with a Laser wallet.
 */
export class View implements IView {
    provider: JsonRpcProvider;
    walletAddress: Address;
    wallet: Contract;

    constructor(_provider: JsonRpcProvider, _walletAddress: Address) {
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = new Contract(this.walletAddress, abi, this.provider);
    }

    /**
     * @returns The address of the wallet.
     */
    getAddress(): Address {
        return this.wallet.address;
    }

    /**
     * @returns the current version of the wallet.
     */
    async getVersion(): Promise<string> {
        return await this.wallet.VERSION();
    }

    /**
     * @returns the nonce of the  wallet.
     */
    async getNonce(): Promise<string> {
        return (await this.wallet.nonce()).toString();
    }

    /**
     * @returns The address of the owner of this wallet.
     */
    async getOwner(): Promise<Address> {
        return await this.wallet.owner();
    }

    /**
     * @returns The address of the recovery owner of this wallet.
     */
    async getRecoveryOwner(): Promise<Address> {
        return await this.wallet.recoveryOwner();
    }

    /**
     * @returns The guardians of this wallet.
     */
    async getGuardians(): Promise<Address[]> {
        return await this.wallet.getGuardians();
    }

    /**
     * @returns The balance in WEI of this wallet.
     */
    async getBalance(): Promise<BigNumberish> {
        return await this.provider.getBalance(this.wallet.address);
    }

    /**
     * @returns The singleton address. The master copy where all logic is handled.
     */
    async getSingleton(): Promise<Address> {
        return await this.wallet.singleton();
    }

    /**
     * @returns Boolean if the wallet is locked.
     * @notice If the wallet is locked, the recovery procedure comes in play.
     */
    async isWalletLocked(): Promise<boolean> {
        return await this.wallet.isLocked();
    }

    /**
     * @returns Boolean if the guardians are blocked.
     * @notice In case guardians are misbehaving, the owner + recovery owner can lock the wallet.
     */
    async areGuardiansBlocked(): Promise<boolean> {
        return await this.wallet.guardiansBlocked();
    }

    /**
     * @returns The network id that the wallet is connected to.
     */
    async getNetworkId(): Promise<string> {
        return (await this.wallet.getChainId()).toString();
    }
}
