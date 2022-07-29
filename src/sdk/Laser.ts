import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, Contract, ContractReceipt, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import {
    LaserWallet__factory,
    LaserWallet,
    LaserModuleSSR__factory,
    LaserModuleSSR,
    LaserHelper__factory,
    LaserHelper,
} from "../typechain";
import { abi as walletAbi } from "../deployments/mainnet/LaserWallet.json";
import { abi as moduleAbi } from "../deployments/mainnet/LaserModuleSSR.json";
import { emptyTransaction, ZERO, DEPLOYED_ADDRESSES } from "../constants";
import { Address, SignTransactionOptions, Transaction, TransactionInfo, ModuleFuncs } from "../types";
import {
    sign,
    lockWalletVerifier,
    unlockWalletVerifier,
    changeOwnerVerifier,
    verifyAddress,
    addGuardianVerifier,
    removeGuardianVerifier,
    sendEthVerifier,
    recoverVerifier,
    removeRecoveryOwnerVerifier,
    addRecoveryOwnerVerifier,
    toWei,
    encodeFunctionData,
    transferERC20Verifier,
    encodeWalletData,
} from "../utils";
import { LaserView } from "./LaserView";
import { ILaser } from "./interfaces/ILaser";
import { WalletState } from "./interfaces/ILaserView";

///@dev Class that has all the methods to read/write to a Laser wallet.
export class Laser extends LaserView implements ILaser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: LaserWallet;

    private laserModule!: LaserModuleSSR;
    private laserHelper!: LaserHelper;
    private initialized = false;

    constructor(_provider: Provider, _signer: Wallet, walletAddress: string) {
        super(_provider, walletAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = LaserWallet__factory.connect(walletAddress, this.signer.connect(this.provider));
    }

    ///@dev Inits Laser with proper state.
    async init() {
        const chainId = (await this.provider.getNetwork()).chainId.toString();

        const deployedAddressess = DEPLOYED_ADDRESSES;

        switch (chainId.toString()) {
            case "1": {
                this.laserModule = LaserModuleSSR__factory.connect(
                    deployedAddressess["1"].laserModuleSSR,
                    this.provider
                );
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["1"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "5": {
                this.laserModule = LaserModuleSSR__factory.connect(
                    deployedAddressess["5"].laserModuleSSR,
                    this.provider
                );
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["5"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "42": {
                this.laserModule = LaserModuleSSR__factory.connect(
                    deployedAddressess["42"].laserModuleSSR,
                    this.provider
                );
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["42"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "3": {
                this.laserModule = LaserModuleSSR__factory.connect(
                    deployedAddressess["3"].laserModuleSSR,
                    this.provider
                );
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["3"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            default: {
                throw Error("Laser does not support the connected network.");
            }
        }
    }

    ///@dev Returns the wallet's main state + the recovery module's state.
    async getWalletState(): Promise<WalletState> {
        if (!this.initialized) await this.init();
        return this._getWalletState(this.laserHelper, this.laserModule.address);
    }

    ///@dev Returns the transaction type to locks the wallet. Can only be called by the recovery owner + guardian.
    async lockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        lockWalletVerifier(this.signer.address, walletState);

        return this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "lock", []),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type  to unlock the wallets. Can only be called by the owner + recovery owner
    /// or owner + guardian.
    async unlockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        unlockWalletVerifier(this.signer.address, walletState);

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "unlock", []),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to recover the wallet. Can only be called by a recovery owner or guardian.
    async recover(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        recoverVerifier(this.signer.address, newOwner, this.provider, walletState);

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(moduleAbi, "recover", [newOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type  to change the owner. Can only be called by the owner.
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        await changeOwnerVerifier(this.signer.address, this.provider, newOwner, walletState);

        return this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "changeOwner", [newOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to add a guardian. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);

        addGuardianVerifier(this.signer.address, this.provider, newGuardian, walletState);

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(moduleAbi, "addGuardian", [this.wallet.address, newGuardian]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to remove a guardian. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async removeGuardian(_guardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const guardian = await verifyAddress(this.provider, _guardian);

        removeGuardianVerifier(this.signer.address, guardian, walletState);

        const guardians = walletState.guardians;
        let prevGuardianIndex = 0;
        let prevGuardian: Address;
        for (let i = 0; i < guardians.length; i++) {
            if (guardians[i].toLowerCase() === guardian.toLowerCase()) {
                prevGuardianIndex = i - 1;
            }
        }
        prevGuardian =
            prevGuardianIndex === -1 ? "0x0000000000000000000000000000000000000001" : guardians[prevGuardianIndex];

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(moduleAbi, "removeGuardian", [
                    this.wallet.address,
                    prevGuardian,
                    guardian,
                ]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type add a recovery owner. Can only be called by the owenr.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async addRecoveryOwner(_newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newRecoveryOwner = await verifyAddress(this.provider, _newRecoveryOwner);

        addRecoveryOwnerVerifier(this.signer.address, this.provider, newRecoveryOwner, walletState);

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(moduleAbi, "addRecoveryOwner", [this.wallet.address, newRecoveryOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to remove a recovery owner. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async removeRecoveryOwner(_recoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const recoveryOwner = await verifyAddress(this.provider, _recoveryOwner);

        removeRecoveryOwnerVerifier(this.signer.address, recoveryOwner, walletState);

        const recoveryOwners = walletState.recoveryOwners;
        let prevRecoveryOwnerIndex = 0;
        let prevRecoveryOwner: Address;
        for (let i = 0; i < recoveryOwners.length; i++) {
            if (recoveryOwners[i].toLowerCase() === recoveryOwner.toLowerCase()) {
                prevRecoveryOwnerIndex = i - 1;
            }
        }
        prevRecoveryOwner =
            prevRecoveryOwnerIndex === -1
                ? "0x0000000000000000000000000000000000000001"
                : recoveryOwners[prevRecoveryOwnerIndex];

        return this.signTransaction(
            {
                to: this.laserModule.address,
                value: 0,
                callData: encodeFunctionData(moduleAbi, "removeRecoveryOwner", [
                    this.wallet.address,
                    prevRecoveryOwner,
                    recoveryOwner,
                ]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to send eth. Can only be called by the owner.
    async sendEth(_to: Address, _amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const to = await verifyAddress(this.provider, _to);
        const value = BigNumber.from(toWei(_amount));

        sendEthVerifier(this.signer.address, value, walletState);

        return this.signTransaction(
            {
                to,
                value,
                callData: "0x",
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to transfer an ERC-20 token. Can only be called by the owner.
    async transferERC20(
        _tokenAddress: Address,
        _to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const tokenAddress = await verifyAddress(this.provider, _tokenAddress);
        const to = await verifyAddress(this.provider, _to);

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
        const walletBalance = await tokenContract.balanceOf(this.wallet.address);

        let decimals: number;

        try {
            decimals = await tokenContract.decimals();
        } catch (e) {
            throw Error(`Could not get the token's decimals: ${e}`);
        }

        const transferAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        transferERC20Verifier(this.signer.address, transferAmount, walletBalance, walletState);

        return this.signTransaction(
            {
                to: tokenAddress,
                value: 0,
                callData: encodeFunctionData(erc20Abi, "transfer", [to, transferAmount]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Signs a transaction and returns the complete Transaction object.
    ///Proper checks need to be done prior to calling this function.
    private async signTransaction(
        { to, value, callData, txInfo }: SignTransactionOptions,
        nonce: number
    ): Promise<Transaction> {
        const transaction = {
            ...emptyTransaction,
            ...txInfo,
            to,
            value,
            callData,
            nonce,
        };
        const hash = await this.getOperationHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        ///@todo Check that the signature is correct depending on the signer.
        return transaction;
    }
}
