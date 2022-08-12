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
import { abi as walletAbi } from "../deployments/localhost/LaserWallet.json";
import { abi as ssrAbi } from "../deployments/localhost/LaserModuleSSR.json";
import { abi as vaultAbi } from "../deployments/localhost/LaserVault.json";
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
    estimateLaserGas,
    verifyWalletCanPayGas,
} from "../utils";
import { LaserView } from "./LaserView";
import { ILaser } from "./interfaces/ILaser";
import { WalletState } from "./interfaces/ILaserView";

///@dev Class that has all the methods to read/write to a Laser wallet.
export class Laser extends LaserView implements ILaser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: LaserWallet;

    public ssrModule!: Address;
    public laserVault!: Address;
    public laserHelper!: LaserHelper;
    public initialized = false;

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
                this.ssrModule = deployedAddressess["1"].laserModuleSSR;
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["1"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "5": {
                this.ssrModule = deployedAddressess["5"].laserModuleSSR;
                this.laserVault = deployedAddressess["5"].laserVault;
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["5"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "42": {
                this.ssrModule = deployedAddressess["42"].laserModuleSSR;
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["42"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "3": {
                this.ssrModule = deployedAddressess["3"].laserModuleSSR;
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["3"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            case "31337": {
                this.ssrModule = deployedAddressess["31337"].laserModuleSSR;
                this.laserVault = deployedAddressess["31337"].laserVault;
                this.laserHelper = LaserHelper__factory.connect(deployedAddressess["31337"].laserHelper, this.provider);
                this.initialized = true;
                break;
            }
            default: {
                throw Error("Laser does not support the connected network.");
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                Estimates the gas for a Laser transaction
    //////////////////////////////////////////////////////////////*/

    async estimateLaserGas(tx: Transaction): Promise<BigNumber> {
        return estimateLaserGas(this.wallet, this.provider, tx);
    }

    ///@dev Generic Laser transaction. Returns Transaction type to send to the relayer.
    async execTransaction(
        _to: Address,
        value: BigNumber,
        callData: string,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        const to = await verifyAddress(this.provider, _to);

        const transaction = await this.signTransaction(
            {
                to,
                value,
                callData,
                txInfo,
            },
            Number(walletState.nonce)
        );

        // Here we simulate the transaction (will revert if it fails) and get the approx gas with buffer.
        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(
            this.provider,
            BigNumber.from(walletState.balance),
            estimateGas,
            BigNumber.from(value)
        );

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the wallet's main state + the recovery module's state.
    async getWalletState(): Promise<WalletState> {
        if (!this.initialized) await this.init();
        return this._getWalletState(this.laserHelper, this.ssrModule);
    }

    /*//////////////////////////////////////////////////////////////
                          Smart Social Recovery
    //////////////////////////////////////////////////////////////*/

    ///@dev Returns the transaction type to lock the wallet. Can only be called by the recovery owner + guardian.
    async lockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        lockWalletVerifier(this.signer.address, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "lock", []),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the transaction type  to unlock the wallet. Can only be called by the owner + recovery owner
    /// or owner + guardian.
    async unlockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        unlockWalletVerifier(this.signer.address, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(walletAbi, "unlock", []),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the transaction type to recover the wallet. Can only be called by a recovery owner or guardian.
    async recover(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        recoverVerifier(this.signer.address, newOwner, this.provider, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(ssrAbi, "recover", [newOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the transaction type  to change the owner. Can only be called by the owner.
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        await changeOwnerVerifier(this.signer.address, this.provider, newOwner, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "changeOwner", [newOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the transaction type to add a guardian. Can only be called by the owner.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);

        addGuardianVerifier(this.signer.address, this.provider, newGuardian, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(ssrAbi, "addGuardian", [this.wallet.address, newGuardian]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
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

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(ssrAbi, "removeGuardian", [this.wallet.address, prevGuardian, guardian]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Returns the transaction type add a recovery owner. Can only be called by the owenr.
    ///@notice The state is in the SSR module, not in the wallet itself.
    async addRecoveryOwner(_newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newRecoveryOwner = await verifyAddress(this.provider, _newRecoveryOwner);

        addRecoveryOwnerVerifier(this.signer.address, this.provider, newRecoveryOwner, walletState);

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(ssrAbi, "addRecoveryOwner", [this.wallet.address, newRecoveryOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );
        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
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

        const transaction = await this.signTransaction(
            {
                to: this.ssrModule,
                value: 0,
                callData: encodeFunctionData(ssrAbi, "removeRecoveryOwner", [
                    this.wallet.address,
                    prevRecoveryOwner,
                    recoveryOwner,
                ]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    /*//////////////////////////////////////////////////////////////
                            Laser Vault
    //////////////////////////////////////////////////////////////*/

    ///@dev Adds ERC-20 tokens to the vault.
    ///@dev Returns the trasaction type to add tokens. Can only be called by the owner.
    async addTokensToVault(
        _tokenAddress: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const tokenAddress = await verifyAddress(this.provider, _tokenAddress);

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

        let decimals: number;

        try {
            decimals = await tokenContract.decimals();
        } catch (e) {
            throw Error(`Could not get the token's decimals for address: ${tokenAddress}: ${e}`);
        }

        const amountToVault = ethers.utils.parseUnits(amount.toString(), decimals);

        const transaction = await this.signTransaction(
            {
                to: this.laserVault,
                value: 0,
                callData: encodeFunctionData(vaultAbi, "addTokensToVault", [tokenAddress, amountToVault]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    ///@dev Removes ERC-20 tokens from the vault.
    ///@dev Returns the trasaction type to remove tokens. Can only be called by the owner + guardian.
    async removeTokensFromVault(
        _tokenAddress: Address,
        amount: BigNumberish,
        guardianSignature: string,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const tokenAddress = await verifyAddress(this.provider, _tokenAddress);

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

        let decimals: number;

        try {
            decimals = await tokenContract.decimals();
        } catch (e) {
            throw Error(`Could not get the token's decimals for address: ${tokenAddress}: ${e}`);
        }

        const amountOffTheVault = ethers.utils.parseUnits(amount.toString(), decimals);

        const transaction = await this.signTransaction(
            {
                to: this.laserVault,
                value: 0,
                callData: encodeFunctionData(vaultAbi, "removeTokensFromVault", [
                    tokenAddress,
                    amountOffTheVault,
                    guardianSignature,
                ]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }
        return transaction;
    }

    ///@dev Returns the amount of tokens that are in the vault for a given token address.
    async getTokensInVault(tokenAddress: Address): Promise<BigNumber> {
        return this._getTokensInVault(this.laserVault, this.wallet.address, tokenAddress);
    }

    ///@dev Returns the transaction type to send eth. Can only be called by the owner.
    async sendEth(_to: Address, _amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const to = await verifyAddress(this.provider, _to);
        const value = BigNumber.from(toWei(_amount));

        sendEthVerifier(this.signer.address, value, walletState);

        const transaction = await this.signTransaction(
            {
                to,
                value,
                callData: "0x",
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(
            this.provider,
            BigNumber.from(walletState.balance),
            estimateGas,
            BigNumber.from(value)
        );

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
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
            throw Error(`Could not get the token's decimals for address: ${tokenAddress}: ${e}`);
        }

        const transferAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        transferERC20Verifier(this.signer.address, transferAmount, walletBalance, walletState);

        const transaction = await this.signTransaction(
            {
                to: tokenAddress,
                value: 0,
                callData: encodeFunctionData(erc20Abi, "transfer", [to, transferAmount]),
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    async sendTransaction(to: Address, data: any, value: BigNumberish, txInfo: TransactionInfo) {
        const walletState = await this.getWalletState();

        const transaction = await this.signTransaction(
            {
                to,
                callData: data,
                value,
                txInfo,
            },
            Number(walletState.nonce)
        );

        const estimateGas = await estimateLaserGas(this.wallet, this.provider, transaction);

        await verifyWalletCanPayGas(this.provider, BigNumber.from(walletState.balance), estimateGas, BigNumber.from(0));

        if (estimateGas.gt(txInfo.gasLimit)) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        return transaction;
    }

    /*//////////////////////////////////////////////////////////////
                        Signing a Laser transaction
    //////////////////////////////////////////////////////////////*/

    ///@dev Signs a transaction and returns the complete Transaction object.
    ///Proper checks need to be done prior to calling this function.
    async signTransaction(
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
