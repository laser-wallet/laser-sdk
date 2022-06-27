import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumberish, Contract, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import { abi as walletAbi } from "../abis/LaserWallet.json";
import { ZERO, emptyTransaction } from "../constants";
import {
    Address,
    LASER_FUNCS,
    SignTransactionOptions,
    Transaction,
    TransactionInfo,
} from "../types";
import { sign } from "../utils/signatures";
import { Helper } from "./Helper";

/**
 * @dev Contains all state changing methods for Laser.
 * They return a UserOperation object that then gets sent to the EntryPoint contract.
 */
interface ILaser {
    /**
     * The TransactionInfo interface:
     * ``````````````````````
     * interface TransactionInfo {
     *      maxFeePerGas: BigNumberish;
     *      maxPriorityFeePerGas: BigNumberish;
     *  }
     * ````````````````
     */

    changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;
    changeRecoveryOwner(newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction>;
    lock(txInfo: TransactionInfo): Promise<Transaction>;
    // unlock(txInfo: TransactionInfo): Promise<UserOperation>;
    // recoveryUnlock(txInfo: TransactionInfo): Promise<UserOperation>;
    //unlockGuardians(txInfo: TransactionInfo): Promise<UserOperation>;
    // recover(
    //     newOwner: Address,
    //     newRecoveryOwner: Address,
    //     txInfo: TransactionInfo
    // ): Promise<UserOperation>;
    addGuardian(newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction>;
    removeGuardian(guardianToRemove: Address, txInfo: TransactionInfo): Promise<Transaction>;

    // // Sends eth to another account ...
    sendEth(to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction>;
    transferERC20(
        tokenAddress: Address,
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction>;
    sendTransaction(
        to: Address,
        data: any,
        value: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction>;
}

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends Helper implements ILaser {
    /**
     * @todo !! Add simulation checks.
     */
    readonly provider: JsonRpcProvider;
    readonly signer: Wallet;
    readonly wallet: Contract; // The actual wallet.

    /**
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param walletAddress The address of the wallet.
     */
    constructor(_provider: JsonRpcProvider, _signer: Wallet, walletAddress: string) {
        super(_provider, walletAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = new Contract(walletAddress, walletAbi, this.signer.connect(this.provider));
    }

    async execTransaction(transaction: Transaction): Promise<providers.TransactionResponse> {
        return await this.wallet.exec(
            transaction.to,
            transaction.value,
            transaction.callData,
            transaction.nonce,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasTip,
            transaction.signatures
        , {
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
            maxFeePerGas: transaction.maxFeePerGas
        });
    }


    async signTransaction({
        to,
        value,
        callData,
        txInfo,
    }: SignTransactionOptions): Promise<Transaction> {
        const transaction = {
            ...emptyTransaction,
            ...txInfo,
            to,
            value,
            callData,
            nonce: await this.getNonce(),
        };

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw new Error("Invalid signature.");
        }
        
        return transaction;
    }

    /**
     * @param _newOwner The address of the new owner.
     */
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const newOwner = await this.verifyAddress(_newOwner);
        const currentOwner = await this.getOwner();
        if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await this.isContract(newOwner)) {
            throw Error("Owner cannot be a contract.");
        }
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can do this operation.");
        }
        if (newOwner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Zero address not valid.");
        }
        // We cannot change the owner if the wallet is locked.
        if (await this.isWalletLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: this.encodeFunctionData(walletAbi, LASER_FUNCS.changeOwner, [newOwner]),
            txInfo,
        });
    }

    async changeRecoveryOwner(
        _newRecoveryOwner: Address,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        const newRecoveryOwner = await this.verifyAddress(_newRecoveryOwner);
        const currentOwner = await this.getOwner();
        if (newRecoveryOwner.toLowerCase() === currentOwner) {
            throw Error("The recovery owner cannot be the owner.");
        }
        if (await this.isContract(newRecoveryOwner)) {
            throw Error("Recovery owner cannot be a contract");
        }
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can do this operation.");
        }
        if (newRecoveryOwner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Zero address not valid.");
        }
        if (await this.isWalletLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: this.encodeFunctionData(walletAbi, LASER_FUNCS.changeRecoveryOwner, [
                newRecoveryOwner,
            ]),
            txInfo,
        });
    }

    /**
     * @dev Locks the wallet. When the wallet is locked, the sovereign social recovery comes into play.
     * @notice Can only be called by a guardian.
     */
    async lock(txInfo: TransactionInfo): Promise<Transaction> {
        if (await this.isWalletLocked()) {
            throw Error("Wallet is currently locked");
        }
        // Only a guardian can sign this.
        const signer = this.signer.address;
        if (!(await this.wallet.isGuardian(signer))) {
            throw Error("Only a guardian can lock the wallet.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: this.encodeFunctionData(walletAbi, LASER_FUNCS.lock, []),
            txInfo,
        });
    }

    /**
     * @param _newGuardian The address of the new guardian.
     */
    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const newGuardian = await this.verifyAddress(_newGuardian);
        const currentOwner = await this.getOwner();
        if (newGuardian.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can do this operation.");
        }
        if (newGuardian.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Zero address not valid.");
        }
        if (await this.wallet.isGuardian(newGuardian)) {
            throw Error("Duplicate guardian.");
        }
        // We cannot add a guardian if the wallet is locked.
        if (await this.isWalletLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }
        // If the guardian is a smart contract, it needs to support EIP1271 (isValidSignature)
        if (await this.isContract(newGuardian)) {
            const abi = ["function supportsInterface(bytes4) external view returns (bool)"];
            try {
                const contractGuardian = new ethers.Contract(newGuardian, abi, this.provider);
                const result = await contractGuardian.supportsInterface("0xae029e0b");
                if (!result) throw Error("Guardian does not support EIP1271");
            } catch (e) {
                throw Error(`Guardian does not support EIP1271 ${e}`);
            }
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: this.encodeFunctionData(walletAbi, LASER_FUNCS.addGuardian, [newGuardian]),
            txInfo,
        });
    }

    /**
     * @param _guardian The address of the guardian to remove.
     */
    async removeGuardian(_guardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const guardian = await this.verifyAddress(_guardian);
        const currentOwner = await this.getOwner();
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can do this operation.");
        }
        if (!(await this.wallet.isGuardian(guardian))) {
            throw Error("Address is not a guardian.");
        }
        // We cannot add a guardian if the wallet is locked.
        if (await this.isWalletLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const guardians = await this.getGuardians();
        let prevGuardianIndex = 0;
        let prevGuardian: Address;
        for (let i = 0; i < guardians.length; i++) {
            if (guardians[i].toLowerCase() === guardian.toLowerCase()) {
                prevGuardianIndex = i - 1;
            }
        }
        prevGuardian =
            prevGuardianIndex === -1
                ? "0x0000000000000000000000000000000000000001"
                : guardians[prevGuardianIndex];

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: this.encodeFunctionData(walletAbi, LASER_FUNCS.removeGuardian, [
                prevGuardian,
                guardian,
            ]),
            txInfo,
        });
    }

    async sendEth(
        _to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        const to = await this.verifyAddress(_to);
        if (amount <= 0) {
            throw Error("Cannot send 0 ETH.");
        }
        // We cannot change the owner if the wallet is locked.
        if (await this.isWalletLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        // Blanace in Eth.
        const currentBal = Helper.toEth(await this.getBalance());

        if (Number(currentBal) < Number(amount)) {
            throw Error("Insufficient balance.");
        }
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can send funds.");
        }

        return this.signTransaction({
            to,
            value: Helper.toWei(amount),
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
        const tokenAddress = await this.verifyAddress(_tokenAddress);
        const to = await this.verifyAddress(_to);

        ///@todo Extra safety checks.
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can send funds.");
        }

        return this.signTransaction({
            to: tokenAddress,
            value: 0,
            // Right now we are adding 18 decimals, but this changes by token.
            callData: this.encodeFunctionData(erc20Abi, "transfer", [to, Helper.toWei(amount)]),
            txInfo,
        });
    }

    /**
     * @param to Destination address of the transaction.
     * @param data Transaction data.
     * @param value Amount of ETH to send.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async sendTransaction(
        to: Address,
        data: string,
        value: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<Transaction> {
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can send funds.");
        }

        return this.signTransaction({ to, value, callData: data, txInfo });
    }
}
