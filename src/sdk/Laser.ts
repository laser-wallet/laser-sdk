import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, Contract, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { abi as walletAbi } from "../deployments/goerli/LaserWallet.json";
import { ZERO, emptyTransaction } from "../constants";
import { Address, SignTransactionOptions, Transaction, TransactionInfo } from "../types";
import { sign } from "../utils/signatures";
import { LaserView } from "./LaserView";
import { Helper } from "./Helper";
import { ILaser } from "./interfaces/ILaser";

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser extends LaserView implements ILaser {
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

        if (!(await this.isValidSignature(hash, transaction.signatures))) {
            throw Error("Invalid signature.");
        }

        return transaction;
    }

    /**
     * @dev Calls the wallet in order to execute a Laser transaction.
     * Proper checks need to be done prior to calling this function.
     * This is a generic non-opinionated function to call 'exec' in Laser's smart contracts.
     */
    async execTransaction(transaction: Transaction): Promise<providers.TransactionResponse> {
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

    async changeOwner(_newOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);
        const newOwner = await Helper.verifyAddress(this.provider, _newOwner);
        if (newOwner.toLowerCase() === signer.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await Helper.isContract(this.provider, newOwner)) {
            throw Error("Owner cannot be a contract.");
        }
        if (newOwner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Owner cannot be address 0.");
        }
        if (await this.isGuardian(newOwner)) {
            throw Error("Owner cannot be a guardian.");
        }
        if (await this.isRecoveryOwner(newOwner)) {
            throw Error("Owner cannot be a recovery owner.");
        }

        // We cannot change the owner if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "changeOwner", [newOwner]),
            txInfo,
        });
    }

    async lock(txInfo: TransactionInfo): Promise<Transaction> {
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }
        // Only a guardian can sign this.
        const signer = this.signer.address;
        if (!(await this.wallet.isGuardian(signer))) {
            throw Error("Only a guardian can lock the wallet.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "lock", []),
            txInfo,
        });
    }

    /**
     * @dev Unlocks the wallet, can only be signed by the owner + a guardian
     */
    async unlock(txInfo: TransactionInfo): Promise<Transaction> {
        if (!(await this.isLocked())) {
            throw Error("Wallet is not locked.");
        }
        const owner = await this.getOwner();

        // Only the owner or guardian can sign this.
        const signer = this.signer.address;
        if (!(await this.wallet.isGuardian(signer)) && signer.toLowerCase() !== owner.toLowerCase()) {
            throw Error("Only the owner and guardian can unlock the wallet.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "unlock", []),
            txInfo,
        });
    }

    /**
     * @dev Recovers the wallet, can only be signed by the owner + a recovery owner.
     */
    async recoveryUnlock(txInfo: TransactionInfo): Promise<Transaction> {
        if (!(await this.isLocked())) {
            throw Error("Wallet is not locked.");
        }
        const owner = await this.getOwner();

        // Only the owner or a recovery owner can sign this.
        const signer = this.signer.address;
        if (!(await this.wallet.isRecoveryOwner(signer)) && signer.toLowerCase() !== owner.toLowerCase()) {
            throw Error("Only the owner and a recovery owner can recovery unlock the wallet.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "recoveryUnlock", []),
            txInfo,
        });
    }

    async unlockGuardians(txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);

        if (!(await this.areGuardiansLocked())) {
            throw Error("Guardians are not locked.");
        }

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
        const newOwner = await Helper.verifyAddress(this.provider, _newOwner);
        const currentOwner = await this.getOwner();

        if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await Helper.isContract(this.provider, newOwner)) {
            throw Error("Owner cannot be a contract.");
        }
        if (newOwner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Owner cannot be address 0.");
        }
        if (await this.isGuardian(newOwner)) {
            throw Error("Owner cannot be a guardian.");
        }
        if (await this.isRecoveryOwner(newOwner)) {
            throw Error("Owner cannot be a recovery owner.");
        }
        // Only a recovery owner or guardian can sign this.
        const signer = this.signer.address;
        if (!(await this.isGuardian(signer)) && !(await this.isRecoveryOwner(signer))) {
            throw Error("Only the owner and guardian can unlock the wallet.");
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "recovery", [newOwner]),
            txInfo,
        });
    }

    async addGuardian(_newGuardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);

        const newGuardian = await Helper.verifyAddress(this.provider, _newGuardian);
        if (newGuardian.toLowerCase() === signer.toLowerCase()) {
            throw Error("New guardian cannot be current owner.");
        }
        if (newGuardian.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Zero address not valid.");
        }
        if (await this.wallet.isGuardian(newGuardian)) {
            throw Error("Duplicate guardian.");
        }
        // We cannot add a guardian if the wallet is locked.
        if (await this.isLocked()) {
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

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "addGuardian", [newGuardian]),
            txInfo,
        });
    }

    async removeGuardian(_guardian: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);

        const guardian = await Helper.verifyAddress(this.provider, _guardian);
        if (!(await this.isGuardian(guardian))) {
            throw Error("Address is not a guardian.");
        }
        // We cannot add a guardian if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const guardians = await this.getGuardians();

        if (guardians.length - 1 < 2) {
            throw Error("There needs to be at least 2 guardians.");
        }

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
        const signer = this.signer.address;
        await this.isOwner(signer);
        const newGuardian = await Helper.verifyAddress(this.provider, _newGuardian);
        const oldGuardian = await Helper.verifyAddress(this.provider, _oldGuardian);

        if (!(await this.isGuardian(oldGuardian))) {
            throw Error("Address is not a guardian.");
        }
        // We cannot add a guardian if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const guardians = await this.getGuardians();
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
        const signer = this.signer.address;
        await this.isOwner(signer);
        const newRecoveryOwner = await Helper.verifyAddress(this.provider, _newRecoveryOwner);
        if (newRecoveryOwner.toLowerCase() === signer.toLowerCase()) {
            throw Error("New guardian cannot be current owner.");
        }
        if (newRecoveryOwner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Zero address not valid.");
        }
        if (await this.wallet.isRecoveryOwner(newRecoveryOwner)) {
            throw Error("Duplicate guardian.");
        }
        // We cannot add a recovery owner if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }
        // If the recovery owner is a smart contract, it needs to support EIP1271 (isValidSignature)
        if (await Helper.isContract(this.provider, newRecoveryOwner)) {
            const abi = ["function supportsInterface(bytes4) external view returns (bool)"];
            try {
                const contractRecoveryOwner = new ethers.Contract(newRecoveryOwner, abi, this.provider);
                const result = await contractRecoveryOwner.supportsInterface("0xae029e0b");
                if (!result) throw Error("Recovery owner does not support EIP1271");
            } catch (e) {
                throw Error(`Recovery does not support EIP1271 ${e}`);
            }
        }

        return this.signTransaction({
            to: this.wallet.address,
            value: 0,
            callData: Helper.encodeFunctionData(walletAbi, "addRecoveryOwner", [newRecoveryOwner]),
            txInfo,
        });
    }

    async removeRecoveryOwner(_recoveryOwner: Address, txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);
        const recoveryOwner = await Helper.verifyAddress(this.provider, _recoveryOwner);
        if (!(await this.isRecoveryOwner(recoveryOwner))) {
            throw Error("Address is not a recovery owner.");
        }
        // We cannot add a recovery owner if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const recoveryOwners = await this.getRecoveryOwners();
        if (recoveryOwners.length - 1 < 2) {
            throw Error("There needs to be at least 2 recovery owners.");
        }

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
     * @dev Returns the complete Transaction object to send Eth from the connected Laser wallet.
     * It does all the necessary checks.
     */
    async sendEth(_to: Address, amount: BigNumberish, txInfo: TransactionInfo): Promise<Transaction> {
        const signer = this.signer.address;
        await this.isOwner(signer);
        const to = await Helper.verifyAddress(this.provider, _to);
        if (amount <= 0) {
            throw Error("Cannot send 0 ETH.");
        }
        // We cannot change the owner if the wallet is locked.
        if (await this.isLocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }
        // Blanace in Eth.
        const currentBal = Helper.toEth(await this.getBalance());
        // this.checkGas(txInfo, currentBal);

        if (Number(currentBal) < Number(amount)) {
            throw Error("Insufficient balance.");
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

    async isOwner(signer: Address) {
        const owner = await this.getOwner();
        if (signer.toLowerCase() !== owner.toLowerCase()) {
            throw Error("Only the owner can do this operation.");
        }
    }
}
