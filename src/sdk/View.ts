import { Contract, ethers, utils, BigNumberish } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address, ChainInfo } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";

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
    isWalletLocked(): Promise<boolean>;
    areGuardiansBlocked(): Promise<boolean>;
    getChainInfo(): Promise<ChainInfo>;
}

/**
 * @dev Class that contains all the relevant view methods to interact with a Laser wallet.
 */
export class View implements IView {
    provider: Provider;
    walletAddress: Address;
    wallet: LaserWallet;

    constructor(_provider: Provider, _walletAddress: Address) {
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = LaserWallet__factory.connect(_walletAddress, this.provider);
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
        return this.wallet.VERSION();
    }

    /**
     * @returns the nonce of the  wallet.
     */
    async getNonce(): Promise<string> {
        const nonce = await this.wallet.nonce();
        return nonce.toString();
    }

    /**
     * @returns The address of the owner of this wallet.
     */
    async getOwner(): Promise<Address> {
        return this.wallet.owner();
    }

    /**
     * @returns The address of the recovery owner of this wallet.
     */
    async getRecoveryOwner(): Promise<Address> {
        return this.wallet.recoveryOwner();
    }

    /**
     * @returns The guardians of this wallet.
     */
    async getGuardians(): Promise<Address[]> {
        return this.wallet.getGuardians();
    }

    /**
     * @returns The balance in WEI of this wallet.
     */
    async getBalance(): Promise<BigNumberish> {
        return this.provider.getBalance(this.wallet.address);
    }

    /**
     * @returns The singleton address. The master copy where all logic is handled.
     */
    async getSingleton(): Promise<Address> {
        return this.wallet.singleton();
    }

    /**
     * @returns Boolean if the wallet is locked.
     * @notice If the wallet is locked, the recovery procedure comes in play.
     */
    async isWalletLocked(): Promise<boolean> {
        return this.wallet.isLocked();
    }

    /**
     * @returns Boolean if the guardians are blocked.
     * @notice In case guardians are misbehaving, the owner + recovery owner can lock the wallet.
     */
    async areGuardiansBlocked(): Promise<boolean> {
        return this.wallet.guardiansBlocked();
    }

    /**
     * @returns The name and network id of the current network.
     */
    async getChainInfo(): Promise<ChainInfo> {
        const chainId = (await this.wallet.getChainId()).toString();

        switch (chainId) {
            case "1": {
                return {
                    chainId: 1,
                    name: "mainnet",
                };
            }
            case "3": {
                return {
                    chainId: 3,
                    name: "ropsten",
                };
            }
            case "4": {
                return {
                    chainId: 4,
                    name: "rinkeby",
                };
            }
            case "5": {
                return {
                    chainId: 5,
                    name: "goerli",
                };
            }
            default: {
                throw Error("Unsupported network.");
            }
        }
    }
}
