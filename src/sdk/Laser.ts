import { ethers, Contract, utils, BigNumberish } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Address, Domain, TransactionInfo, transaction, Transaction, LASER_FUNCS } from "../types";
import { ZERO, MAGIC_VALUE } from "../constants";
import { abi } from "../abis/LaserWallet.json";
import { signTypedData, sign } from "../utils/signatures";
import { Helper } from "./Helper";
import erc20Abi from "../abis/erc20.abi.json";

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

    changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<boolean>;
    changeRecoveryOwner(newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<boolean>;
    lock(txInfo: TransactionInfo): Promise<boolean>;
    // unlock(txInfo: TransactionInfo): Promise<UserOperation>;
    // recoveryUnlock(txInfo: TransactionInfo): Promise<UserOperation>;
    //unlockGuardians(txInfo: TransactionInfo): Promise<UserOperation>;
    // recover(
    //     newOwner: Address,
    //     newRecoveryOwner: Address,
    //     txInfo: TransactionInfo
    // ): Promise<UserOperation>;
    addGuardian(newGuardian: Address, txInfo: TransactionInfo): Promise<boolean>;
    removeGuardian(guardianToRemove: Address, txInfo: TransactionInfo): Promise<boolean>;

    // // Sends eth to another account ...
    sendEth(to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<boolean>;
    transferERC20(
        tokenAddress: Address,
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<boolean>;
}

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends Helper implements ILaser {
    readonly provider: JsonRpcProvider;
    readonly signer: Wallet;
    readonly wallet: Contract; // The actual wallet.
    readonly abi = abi;

    /**
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param walletAddress The address of the wallet.
     */
    constructor(_provider: JsonRpcProvider, _signer: Wallet, walletAddress: string) {
        super(_provider, walletAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = new Contract(walletAddress, abi, this.signer.connect(this.provider));
    }

    async execTransaction(transaction: Transaction): Promise<boolean> {
        try {
            await this.wallet.exec(
                transaction.to,
                transaction.value,
                transaction.callData,
                transaction.nonce,
                transaction.maxFeePerGas,
                transaction.maxPriorityFeePerGas,
                transaction.gasTip,
                transaction.signatures
            );
        } catch (e) {
            throw Error(`Error in transaction: ${e}`);
        }
        return true;
    }

    /**
     * @param _newOwner The address of the new owner.
     */
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<boolean> {
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

        transaction.to = this.wallet.address;
        transaction.value = 0;
        transaction.callData = this.encodeFunctionData(abi, LASER_FUNCS.changeOwner, [newOwner]);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);


        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }

    async changeRecoveryOwner(
        _newRecoveryOwner: Address,
        txInfo: TransactionInfo
    ): Promise<boolean> {
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

        transaction.to = this.wallet.address;
        transaction.value = 0;
        transaction.callData = this.encodeFunctionData(abi, LASER_FUNCS.changeRecoveryOwner, [
            newRecoveryOwner,
        ]);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }

    /**
     * @dev Locks the wallet. When the wallet is locked, the sovereign social recovery comes into play.
     * @notice Can only be called by a guardian.
     */
    async lock(txInfo: TransactionInfo): Promise<boolean> {
        if (await this.isWalletLocked()) {
            throw Error("Wallet is currently locked");
        }
        // Only a guardian can sign this.
        const signer = this.signer.address;
        if (!(await this.wallet.isGuardian(signer))) {
            throw Error("Only a guardian can lock the wallet.");
        }

        transaction.to = this.wallet.address;
        transaction.value = 0;
        transaction.callData = this.encodeFunctionData(abi, LASER_FUNCS.lock, []);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);


        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }

    /**
     * @param _newGuardian The address of the new guardian.
     */
    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<boolean> {
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

        transaction.to = this.wallet.address;
        transaction.value = 0;
        transaction.callData = this.encodeFunctionData(abi, LASER_FUNCS.addGuardian, [newGuardian]);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }

    /**
     * @param _guardian The address of the guardian to remove.
     */
    async removeGuardian(_guardian: Address, txInfo: TransactionInfo): Promise<boolean> {
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

        transaction.to = this.wallet.address;
        transaction.value = 0;
        transaction.callData = this.encodeFunctionData(abi, LASER_FUNCS.removeGuardian, [
            prevGuardian,
            guardian,
        ]);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
                transaction.signatures = await sign(this.signer, hash);


        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }

    async sendEth(_to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<boolean> {
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

        const amountInWei = Helper.toWei(amount);

        transaction.to = to;
        transaction.value = amountInWei;
        transaction.callData = "0x";
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }
        return await this.execTransaction(transaction);
    }

    async transferERC20(
        _tokenAddress: Address,
        _to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<boolean> {
        const tokenAddress = await this.verifyAddress(_tokenAddress);
        const to = await this.verifyAddress(_to);

        ///@todo Extra safety checks.
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can send funds.");
        }

        // Right now we are adding 18 decimals, but this changes by token.
        const amountInWei = Helper.toWei(amount);

        transaction.to = to;
        transaction.value = amountInWei;
        transaction.callData = this.encodeFunctionData(erc20Abi, "transfer", [to, amountInWei]);
        transaction.nonce = await this.getNonce();
        transaction.maxFeePerGas = txInfo.maxFeePerGas;
        transaction.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        transaction.gasTip = txInfo.gasTip;

        const hash = await this.getHash(transaction);
        transaction.signatures = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return await this.execTransaction(transaction);
    }
}
