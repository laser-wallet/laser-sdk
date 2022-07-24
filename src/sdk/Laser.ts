import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, Contract, ContractReceipt, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { abi as walletAbi } from "../deployments/localhost/LaserWallet.json";
import { ZERO, emptyTransaction } from "../constants";
import { Address, SignTransactionOptions, Transaction, TransactionInfo } from "../types";
import {
    sign,
    addressEq,
    lockWalletVerifier,
    unlockWalletVerifier,
    changeOwnerVerifier,
    verifyAddress,
    addGuardianVerifier,
    removeGuardianVerifier,
    swapGuardianVerifier,
    sendEthVerifier,
    recoveryUnlockVerifier,
    unlockGuardiansVerifier,
    recoverVerifier,
    removeRecoveryOwnerVerifier,
    addRecoveryOwnerVerifier,
    toWei,
} from "../utils";
import { LaserView } from "./LaserView";
import { Helper } from "./Helper";
import { ILaser } from "./interfaces/ILaser";

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends LaserView {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: LaserWallet;

    /**
     * @param _signer The owner or relayer.
     */
    constructor(_provider: Provider, _signer: Wallet, walletAddress: string) {
        super(_provider, walletAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = LaserWallet__factory.connect(walletAddress, this.signer.connect(this.provider));
    }

    /**
     * @dev Signs a transaction and returns the complete Transaction object.
     * Proper checks need to be done prior to calling this function.
     */
    async signTransaction({ to, value, callData, txInfo }: SignTransactionOptions): Promise<Transaction> {
        const transaction = {
            ...emptyTransaction,
            ...txInfo,
            to,
            value,
            callData,
            nonce: await this.getNonce(),
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

    async lockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();

        lockWalletVerifier(this.signer.address, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "lock", []),
            txInfo,
        });
    }

    async unlockWallet(txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();

        unlockWalletVerifier(this.signer.address, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "unlock", []),
            txInfo,
        });
    }

    async recoveryUnlock(txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();

        recoveryUnlockVerifier(this.signer.address, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "recoveryUnlock", []),
            txInfo,
        });
    }

    async unlockGuardians(txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();

        unlockGuardiansVerifier(this.signer.address, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "unlockGuardians", []),
            txInfo,
        });
    }

    /**
     * @dev Recovers the wallet, can only be signed by a recovery owner + a guardian.
     */
    async recover(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        recoverVerifier(this.signer.address, newOwner, this.provider, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "recover", [newOwner]),
            txInfo,
        });
    }

    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        await changeOwnerVerifier(this.signer.address, this.provider, newOwner, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "changeOwner", [newOwner]),
            txInfo,
        });
    }

    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);

        addGuardianVerifier(this.signer.address, this.provider, newGuardian, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "addGuardian", [newGuardian]),
            txInfo,
        });
    }

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

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "removeGuardian", [prevGuardian, guardian]),
            txInfo,
        });
    }

    async swapGuardian(_newGuardian: Address, _oldGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);
        const oldGuardian = await verifyAddress(this.provider, _oldGuardian);

        swapGuardianVerifier(this.signer.address, newGuardian, oldGuardian, walletState);

        const guardians = walletState.guardians;

        ///@todo The following section repeats multiple times, create a function to not repeat ourselves.
        let prevGuardianIndex = 0;
        let prevGuardian: Address;
        for (let i = 0; i < guardians.length; i++) {
            if (guardians[i].toLowerCase() === oldGuardian.toLowerCase()) {
                prevGuardianIndex = i - 1;
            }
        }

        prevGuardian =
            prevGuardianIndex === -1 ? "0x0000000000000000000000000000000000000001" : guardians[prevGuardianIndex];

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "swapGuardian", [prevGuardian, newGuardian, oldGuardian]),
            txInfo,
        });
    }

    async addRecoveryOwner(_newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const newRecoveryOwner = await verifyAddress(this.provider, _newRecoveryOwner);

        addRecoveryOwnerVerifier(this.signer.address, this.provider, newRecoveryOwner, walletState);

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "addRecoveryOwner", [newRecoveryOwner]),
            txInfo,
        });
    }

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

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "removeRecoveryOwner", [prevRecoveryOwner, recoveryOwner]),
            txInfo,
        });
    }

    async swapRecoveryOwner(
        _newRecoveryOwner: Address,
        _oldRecoveryOwner: Address,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);
        const newRecoveryOwner = await Helper.verifyAddress(this.provider, _newRecoveryOwner);
        const oldRecoveryOwner = await Helper.verifyAddress(this.provider, _oldRecoveryOwner);

        if (!(await this.isRecoveryOwner(oldRecoveryOwner))) {
            throw Error("Address is not a recovery owner.");
        }
        // We cannot add a recovery owner if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const recoveryOwners = await this.getRecoveryOwners();

        let prevRecoveryOwnerIndex = 0;
        let prevRecoveryOwner: Address;
        for (let i = 0; i < recoveryOwners.length; i++) {
            if (recoveryOwners[i].toLowerCase() === oldRecoveryOwner.toLowerCase()) {
                prevRecoveryOwnerIndex = i - 1;
            }
        }
        prevRecoveryOwner =
            prevRecoveryOwnerIndex === -1
                ? "0x0000000000000000000000000000000000000001"
                : recoveryOwners[prevRecoveryOwnerIndex];

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "swapRecoveryOwner", [
                prevRecoveryOwner,
                newRecoveryOwner,
                oldRecoveryOwner,
            ]),
            txInfo,
        });
    }

    /**
     * @returns Complete Transaction type to send Eth.
     */
    async sendEth(_to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction> {
        const walletState = await this.getWalletState();
        const to = await verifyAddress(this.provider, _to);

        sendEthVerifier(BigNumber.from(amount), walletState);

        return this.signTransaction({
            to,
            value: toWei(amount),
            callData: "0x",
            txInfo,
        });
    }

    async transferERC20(
        _tokenAddress: Address,
        _to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);
        const tokenAddress = await Helper.verifyAddress(this.provider, _tokenAddress);
        const to = await Helper.verifyAddress(this.provider, _to);

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
        const walletBalance = await Helper.getTokenBalance(this.provider, this.wallet.address, tokenAddress);

        let decimals: BigNumberish;
        try {
            // We check how many decimals the token has.
            decimals = await tokenContract.decimals();
        } catch (e) {
            throw Error(`Could not get the token's decimals: ${e}`);
        }

        const amountToTransfer = ethers.utils.parseUnits(amount.toString(), decimals);

        if (BigNumber.from(amountToTransfer).gt(BigNumber.from(walletBalance))) {
            throw Error("Insufficient balance.");
        }

        return this.signTransaction({
            to: tokenAddress,
            value: 0,
            callData: Helper.encodeFunctionData(erc20Abi, "transfer", [to, amountToTransfer]),
            txInfo,
        });
    }

    async isOwner(x: string) {}
}
