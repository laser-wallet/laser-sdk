import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, Contract, ContractReceipt, ethers, providers } from "ethers";
import erc20Abi from "../abis/erc20.abi.json";
import { LaserWallet__factory, LaserWallet, LaserHelper__factory, LaserHelper } from "../typechain";
import { abi as walletAbi } from "../deployments/localhost/LaserWallet.json";
import { getDeployedAddresses } from "../constants";
import { Address, Transaction, RecoveryTransaction } from "../types";
import { decodeSigner, LaserTransaction } from "../utils";
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
    getRecoveryHash,
} from "../utils";
import { ILaser } from "./interfaces/ILaser";
import { WalletState } from "../types";

/**
 * @title Laser
 *
 * @notice Class to interact with a Laser smart wallet.
 */
export class Laser implements ILaser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: LaserWallet;

    public laserHelper!: LaserHelper;
    public chainId!: Number;
    public initialized = false;

    constructor(_provider: Provider, _signer: Wallet, walletAddress: string) {
        this.provider = _provider;
        this.signer = _signer;
        this.wallet = LaserWallet__factory.connect(walletAddress, this.signer.connect(this.provider));
    }

    /**
     * @dev Inits Laser with proper state.
     */
    async init() {
        const chainId = (await this.provider.getNetwork()).chainId.toString();

        const { laserHelper } = getDeployedAddresses(chainId);
        this.laserHelper = LaserHelper__factory.connect(laserHelper, this.provider);
        this.chainId = Number(chainId);
        this.initialized = true;
    }

    /**
     * @dev Sends a complete transaction.
     *      The transaction must be already signed and verified.
     *
     * @param transaction Transaction | RecoveryTransaction.
     */
    async execTransaction(transaction: LaserTransaction): Promise<ContractReceipt> {
        if (transaction.signatures.length < 262) {
            throw Error("Invalid signature length, there needs to be 2 signatures.");
        }

        if ("value" in transaction) {
            // If value in transaction, then it is a normal transaction.
            // Normal transaction are sent through 'exec' and require the signature of
            // the owner + recovery owner or owner + guardian.
            try {
                const tx = await this.wallet.exec(
                    transaction.to,
                    transaction.value,
                    transaction.callData,
                    transaction.nonce,
                    transaction.signatures
                );
                const receipt = await tx.wait();
                return receipt;
            } catch (e) {
                throw Error(`Error sending transaction: ${e}`);
            }
        } else {
            // Else, it is a recovery transaction done through 'recovery'.
            try {
                const tx = await this.wallet.recovery(
                    transaction.nonce.toString(),
                    transaction.callData,
                    transaction.signatures
                );
                const receipt = await tx.wait();
                return receipt;
            } catch (e) {
                throw Error(`Error sending transaction: ${e}`);
            }
        }
    }

    /**
     * @dev Returns the core state of a Laser wallet 'WalletState' in a single rpc call.
     */
    async getWalletState(): Promise<WalletState> {
        if (!this.initialized) await this.init();

        return this.laserHelper.getLaserState(this.wallet.address);
    }

    /*//////////////////////////////////////////////////////////////
                         SMART SOCIAL RECOVERY
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Locks the wallet, can only be signed by a recovery owner or guardian.
     */
    async lockWallet(nonce: Number): Promise<RecoveryTransaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        lockWalletVerifier(this.signer.address, walletState);

        const callData = encodeFunctionData(LaserWallet__factory.abi, "lock", []);
        const recoveryHash = getRecoveryHash(this.wallet.address, nonce, this.chainId, callData);

        const signature = await sign(this.signer, recoveryHash);

        return {
            nonce,
            callData,
            signatures: signature,
            signer: decodeSigner(walletState, this.signer.address),
        };
    }

    /**
     * @dev Unlocks the wallet, can only be signed by the owner, guardian, or recovery owner.
     */
    async unlockWallet(nonce: Number): Promise<RecoveryTransaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        unlockWalletVerifier(this.signer.address, walletState);

        const callData = encodeFunctionData(LaserWallet__factory.abi, "unlock", []);
        const recoveryHash = getRecoveryHash(this.wallet.address, nonce, this.chainId, callData);

        const signature = await sign(this.signer, recoveryHash);

        return {
            nonce,
            callData,
            signatures: signature,
            signer: decodeSigner(walletState, this.signer.address),
        };
    }

    /**
     * @dev Recovers the wallet, can only be signed by the recovery owner or guardian.
     */
    async recover(_newOwner: Address, nonce: Number): Promise<RecoveryTransaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        recoverVerifier(this.signer.address, newOwner, this.provider, walletState);

        const callData = encodeFunctionData(LaserWallet__factory.abi, "recover", [newOwner]);
        const recoveryHash = getRecoveryHash(this.wallet.address, nonce, this.chainId, callData);

        const signature = await sign(this.signer, recoveryHash);

        return {
            nonce,
            callData,
            signatures: signature,
            signer: decodeSigner(walletState, this.signer.address),
        };
    }

    /**
     * @dev Changes the owner, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async changeOwner(_newOwner: Address, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newOwner = await verifyAddress(this.provider, _newOwner);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        await changeOwnerVerifier(this.signer.address, this.provider, newOwner, walletState);

        const callData = encodeFunctionData(walletAbi, "changeOwner", [newOwner]);
        const transaction = await this.signTransaction(this.wallet.address, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /**
     * @dev Adds a guardian, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async addGuardian(_newGuardian: Address, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newGuardian = await verifyAddress(this.provider, _newGuardian);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        addGuardianVerifier(this.signer.address, this.provider, newGuardian, walletState);

        const callData = encodeFunctionData(walletAbi, "addGuardian", [newGuardian]);
        const transaction = await this.signTransaction(this.wallet.address, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /**
     * @dev Removes a guardian, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async removeGuardian(_guardian: Address, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const guardian = await verifyAddress(this.provider, _guardian);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
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

        const callData = encodeFunctionData(walletAbi, "removeGuardian", [prevGuardian, guardian]);
        const transaction = await this.signTransaction(this.wallet.address, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /**
     * @dev Adds a recovery owner, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async addRecoveryOwner(_newRecoveryOwner: Address, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const newRecoveryOwner = await verifyAddress(this.provider, _newRecoveryOwner);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        addRecoveryOwnerVerifier(this.signer.address, this.provider, newRecoveryOwner, walletState);

        const callData = encodeFunctionData(walletAbi, "addRecoveryOwner", [newRecoveryOwner]);
        const transaction = await this.signTransaction(this.wallet.address, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /**
     * @dev Removes a recovery owner, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async removeRecoveryOwner(_recoveryOwner: Address, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();
        const recoveryOwner = await verifyAddress(this.provider, _recoveryOwner);

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
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

        const callData = encodeFunctionData(walletAbi, "removeRecoveryOwner", [prevRecoveryOwner, recoveryOwner]);
        const transaction = await this.signTransaction(this.wallet.address, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /*//////////////////////////////////////////////////////////////
                              TRANSACTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Sends eth, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async sendEth(_to: Address, _amount: BigNumberish, nonce: Number): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
        const to = await verifyAddress(this.provider, _to);
        const value = BigNumber.from(toWei(_amount));

        sendEthVerifier(this.signer.address, value, walletState);

        const transaction = await this.signTransaction(to, value, "0x", nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);
        return transaction;
    }

    /**
     * @dev Transfers ERC20, can only be signed by the owner + recovery owner or owner + guardian.
     */
    async transferERC20(
        _tokenAddress: Address,
        _to: Address,
        amount: BigNumberish,
        nonce: Number
    ): Promise<Transaction> {
        if (!this.initialized) await this.init();
        const walletState = await this.getWalletState();

        if (nonce < walletState.nonce) {
            throw Error("Incorrect nonce.");
        }
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

        const callData = encodeFunctionData(erc20Abi, "transfer", [to, transferAmount]);

        const transaction = await this.signTransaction(to, 0, callData, nonce.toString());
        transaction.signer = decodeSigner(walletState, this.signer.address);

        return transaction;
    }

    /*//////////////////////////////////////////////////////////////
                            GENERIC SIGNING
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Signs a transaction that is sent through 'exec'.
     */
    async signTransaction(
        to: Address,
        value: BigNumberish,
        callData: string,
        nonce: BigNumberish
    ): Promise<Transaction> {
        const hash = await this.wallet.operationHash(to, value, callData, nonce);
        const signatures = await sign(this.signer, hash);

        return { to, value, callData, nonce, signatures };
    }
}
