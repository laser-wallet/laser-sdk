import { ethers, Contract, utils, BigNumberish } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address, Domain, UserOperation, userOp, TransactionInfo } from "../types";
import { ZERO, MAGIC_VALUE } from "../constants";
import { checksum, toEth, toWei, encodeFunctionData } from "../utils";
import { abi } from "../abis/LaserWallet.json";
import { EIP712Sig, sign } from "../utils/signatures";
import { Helper } from "./Helper";
import erc20Abi from "../abis/erc20.abi.json";

/**
 * @dev Contains all state changing methods for Laser.
 * They return a UserOperation object that then gets sent to the EntryPoint contract.
 */
interface ILaser {
    /**
     * The TransactionInfo interface, is the amount of gas and price for the given call.
     * ``````````````````````
     * interface TransactionInfo {
     *      callGas: BigNumberish;
     *      maxFeePerGas: BigNumberish;
     *      maxPriorityFeePerGas: BigNumberish;
     *  }
     * ````````````````
     */

    changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<UserOperation>;
    changeRecoveryOwner(newRecoveryOwner: Address, txInfo: TransactionInfo): Promise<UserOperation>;
    lock(txInfo: TransactionInfo): Promise<UserOperation>;
    // unlock(txInfo: TransactionInfo): Promise<UserOperation>;
    // recoveryUnlock(txInfo: TransactionInfo): Promise<UserOperation>;
    // unlockGuardians(txInfo: TransactionInfo): Promise<UserOperation>;
    // recover(
    //     newOwner: Address,
    //     newRecoveryOwner: Address,
    //     txInfo: TransactionInfo
    // ): Promise<UserOperation>;
    addGuardian(newGuardian: Address, txInfo: TransactionInfo): Promise<UserOperation>;
    // removeGuardian(guardianToRemove: Address, txInfo: TransactionInfo): Promise<UserOperation>;

    // // Sends eth to another account ...
    sendEth(to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<UserOperation>;
    // transferERC20(tokenAddress: Address, to: Address, amount: BigNumber, txInfo: TransactionInfo): Promise<UserOperation>;
}

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends Helper implements ILaser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: Contract; // The actual wallet.
    readonly abi = abi;

    /**
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param walletAddress The address of the wallet.
     */
    constructor(_provider: Provider, _signer: Wallet, walletAddress: string) {
        super(_provider, walletAddress);
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = new Contract(walletAddress, abi, this.signer.connect(this.provider));
    }

    /**
     * @param _newOwner The address of the new owner.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<UserOperation> {
        const newOwner = checksum(_newOwner);
        const currentOwner = await this.getOwner();
        if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await Helper.isContract(this.provider, newOwner)) {
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
        const callData = encodeFunctionData(abi, "changeOwner", [newOwner]);
        const walletAddress = this.wallet.address;

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);
        const hash = await this.getHash(preBundleOp);
        const signature = await sign(this.signer, hash);
        if (!(await this.isValidSignature(hash, signature))) {
            throw Error("Invalid signature.");
        }
        const userOp = await this.createOp(callData, txInfo, signature);
        return userOp;
    }

    /**
     * @param _newRecoveryOwner The address of the new recovery owner.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async changeRecoveryOwner(
        _newRecoveryOwner: Address,
        txInfo: TransactionInfo
    ): Promise<UserOperation> {
        const newRecoveryOwner = checksum(_newRecoveryOwner);
        const currentOwner = await this.getOwner();
        if (newRecoveryOwner.toLowerCase() === currentOwner) {
            throw Error("The recovery owner cannot be the owner.");
        }
        if (await Helper.isContract(this.provider, newRecoveryOwner)) {
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
        const callData = encodeFunctionData(abi, "changeRecoveryOwner", [newRecoveryOwner]);
        const walletAddress = this.wallet.address;

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);
        const hash = await this.getHash(preBundleOp);
        const signature = await sign(this.signer, hash);
        if (!(await this.isValidSignature(hash, signature))) {
            throw Error("Invalid signature.");
        }
        const userOp = await this.createOp(callData, txInfo, signature);
        return userOp;
    }

    /**
     * @dev Locks the wallet. When the wallet is locked, the sovereign social recovery comes into play.
     * @notice Can only be called by a guardian.
     */
    async lock(txInfo: TransactionInfo): Promise<UserOperation> {
        if (await this.isWalletLocked()) {
            throw Error("Wallet is currently locked");
        }
        // Only a guardian can sign this op.
        const signer = this.signer.address;
        if (!(await this.wallet.isGuardian(signer))) {
            throw Error("Only a guardian can lock the wallet.");
        }
        const callData = encodeFunctionData(abi, "lock", []);
        const walletAddress = this.wallet.address;

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);
        const hash = await this.getHash(preBundleOp);
        const signature = await sign(this.signer, hash);

        ///@todo isValidSignature() only checks for the owner.
        // Create a verification process for the guardian.
        const userOp = await this.createOp(callData, txInfo, signature);
        return userOp;
    }

    /**
     * @param _newGuardian The address of the new guardian.
     */
    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<UserOperation> {
        const newGuardian = checksum(_newGuardian);
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
        if (await Helper.isContract(this.provider, newGuardian)) {
            const abi = ["function supportsInterface(bytes4) external view returns (bool)"];
            try {
                const contractGuardian = new ethers.Contract(newGuardian, abi, this.provider);
                const result = await contractGuardian.supportsInterface("0xae029e0b");
                if (!result) throw Error("Guardian does not support EIP1271");
            } catch (e) {
                throw Error(`Guardian does not support EIP1271 ${e}`);
            }
        }
        const callData = encodeFunctionData(abi, "addGuardian", [newGuardian]);
        const walletAddress = this.wallet.address;

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);
        const hash = await this.getHash(preBundleOp);
        const signature = await sign(this.signer, hash);
 
        if (!(await this.isValidSignature(hash, signature))) {
            throw Error("Invalid signature.");
        }
        const userOp = await this.createOp(callData, txInfo, signature);
        return userOp;
    }

    /**
     * This is signed with normal eth flow.
     * @param to Destination address of the transaction.
     * @param amount Amount in ETH to send.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async sendEth(
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<UserOperation> {
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
            // NOTE !!! It is missing a lot of extra safety checks... But it works for now.
            throw Error("Insufficient balance.");
        }
        if (!(await this.isOwner(this.signer.address))) {
            throw Error("Only the owner can send funds.");
        }

        const amountInWei = Helper.toWei(amount);

        const callData = encodeFunctionData(abi, "exec", [to, amountInWei, "0x"]);

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);

        const hash = await this.wallet.userOperationHash(preBundleOp);
        const signature = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, signature))) {
            throw Error("Invalid signature.");
        }
        const userOp = this.createOp(callData, txInfo, signature);
        return userOp;
    }

    /**
     * @param tokenAddress The address of the ERC20 token contract.
     * @param to Destination address of the tokens.
     * @param amount Amount of tokens to transfer.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async transferERC20(
        _tokenAddress: Address,
        to: Address,
        amount: BigNumberish,
        txInfo: TransactionInfo
    ): Promise<UserOperation> {
        const tokenAddress = checksum(_tokenAddress);
        // NOTE !!! It is missing a lot of extra safety checks... But it works for now.
        if ((await this.isOwner(this.signer.address)) === false) {
            throw Error("Only the owner can send funds.");
        }

        // Right now we are adding 18 decimals, but this changes by token.
        const amountInWei = Helper.toWei(amount);

        const txData = encodeFunctionData(erc20Abi, "transfer", [to, amountInWei]);

        const callData = encodeFunctionData(abi, "exec", [tokenAddress, 0, txData]);

        // We prepare the user op for signature.
        const preBundleOp = await this.createOp(callData, txInfo);

        const hash = await this.wallet.userOperationHash(preBundleOp);
        const signature = await sign(this.signer, hash);

        if (!(await this.isValidSignature(hash, signature))) {
            throw Error("Invalid signature.");
        }
        const userOp = this.createOp(callData, txInfo, signature);
        return userOp;
    }
}
