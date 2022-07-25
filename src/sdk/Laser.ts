import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, Contract, ContractReceipt, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { abi as walletAbi } from "../deployments/localhost/LaserWallet.json";
import { abi as moduleAbi } from "../deployments/localhost/LaserModuleSSR.json";
import { emptyTransaction } from "../constants";
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
} from "../utils";
import { LaserView } from "./LaserView";
import { ILaser } from "./interfaces/ILaser";

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends LaserView implements ILaser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: LaserWallet;
    readonly laserModuleAddress: Address;

    constructor(
        _provider: Provider,
        _signer: Wallet,
        walletAddress: string,
        _laserModuleAddress: Address,
        laserHelperAddress: Address
    ) {
        super(_provider, walletAddress, _laserModuleAddress, laserHelperAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = LaserWallet__factory.connect(walletAddress, this.signer.connect(this.provider));
        this.laserModuleAddress = _laserModuleAddress;
    }

    /**
     * @dev Signs a transaction and returns the complete Transaction object.
     * Proper checks need to be done prior to calling this function.
     */
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
            nonce: nonce,
        };
        const hash = await this.getOperationHash(transaction);
        transaction.signatures = await sign(this.signer, hash);
        ///@todo Check that the signature is correct depending on the signer.
        return transaction;
    }

    /**
     * @dev Calls the wallet in order to execute a Laser transaction.
     * Proper checks need to be done prior to calling this function.
     * This is a generic non-opinionated function to call 'exec' in Laser's smart contracts.
     */
    async execTransaction(transaction: Transaction): Promise<any> {
        return this.wallet.exec(
            transaction.to,
            transaction.value,
            transaction.callData,
            transaction.nonce,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasLimit,
            transaction.relayer,
            transaction.signatures,
            {
                gasLimit: transaction.gasLimit,
                maxFeePerGas: transaction.maxFeePerGas,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
            }
        );
    }

    ///@dev Executes a transaction from the SSR module.
    ///@notice It can only be 'lock', 'unlock', or 'recover'.
    ///@notice The rest (addGuardian, etc..) are done through the wallet.
    async execFromModule(transaction: Transaction, funcName: ModuleFuncs): Promise<any> {
        const txData = encodeFunctionData(moduleAbi, funcName, [
            this.wallet.address,
            transaction.callData,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasLimit,
            transaction.relayer,
            transaction.signatures,
        ]);

        return this.signer.connect(this.provider).sendTransaction({
            to: this.laserModuleAddress,
            value: 0,
            data: txData,
        });
    }

    ///@dev Returns the transaction type to locks the wallet. Can only be called by the recovery owner or guardian.
    async lockWallet(txInfo: TransactionInfo): Promise<Transaction> {
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
        const walletState = await this.getWalletState();

        unlockWalletVerifier(this.signer.address, walletState);

        return this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "unlock", []),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type to recover the wallet. Can only be called by a recovery owner or guardian.
    async recover(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        recoverVerifier(this.signer.address, newOwner, this.provider, walletState);

        return this.signTransaction(
            {
                to: this.wallet.address,
                value: 0,
                callData: encodeFunctionData(walletAbi, "recover", [newOwner]),
                txInfo,
            },
            Number(walletState.nonce)
        );
    }

    ///@dev Returns the transaction type  to change the owner. Can only be called by the owner.
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
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
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);

        addGuardianVerifier(this.signer.address, this.provider, newGuardian, walletState);

        return this.signTransaction(
            {
                to: this.laserModuleAddress,
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
                to: this.laserModuleAddress,
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
        const walletState = await this.getWalletState();
        const newRecoveryOwner = await verifyAddress(this.provider, _newRecoveryOwner);

        addRecoveryOwnerVerifier(this.signer.address, this.provider, newRecoveryOwner, walletState);

        return this.signTransaction(
            {
                to: this.laserModuleAddress,
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
                to: this.laserModuleAddress,
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
        const walletState = await this.getWalletState();
        const to = await verifyAddress(this.provider, _to);
        const amount = BigNumber.from(toWei(_amount));

        sendEthVerifier(this.signer.address, amount, walletState);

        return this.signTransaction(
            {
                to,
                value: amount,
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
}
