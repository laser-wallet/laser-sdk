import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address, Numberish, Domain, UserOperation, userOp, TransactionInfo } from "./types";
import { ZERO, MAGIC_VALUE } from "./constants";
import { checksum, toEth, toWei } from "./utils";
import { abi } from "./abis/LaserWallet.json";
import { EIP712Sig, sign } from "./utils/signatures";

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Laser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly wallet: Contract; // The actual wallet.
    readonly abi = abi;

    /**
     *
     * @param providerUrl RPC url to have a connection with a node (INFURA, ALCHEMY).
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param contractAddress The address of the wallet.
     */
    constructor(providerUrl: string, _signer: Wallet, contractAddress: string) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.signer = _signer;
        this.wallet = new Contract(contractAddress, abi, this.signer.connect(this.provider));
    }

    /**
     *
     * **************** V I E W     M E T H O D S ****************
     */

    /**
     * @returns True if the address is a contract, false if it is an EOA.
     */
    async isContract(_address: string): Promise<boolean> {
        const address = checksum(_address);
        const code = await this.provider.getCode(address);
        return code.length > 2 ? true : false;
    }
    /**
     * @returns the current version of the wallet.
     */
    async getVersion(): Promise<Numberish> {
        return await this.wallet.VERSION();
    }

    /**
     * @returns the nonce of the  wallet.
     */
    async getNonce(): Promise<string> {
        return (await this.wallet.nonce()).toString();
    }

    /**
     * @returns Boolean if the wallet is locked.
     * @notice If the wallet is locked, the recovery procedure comes in play.
     */
    async isWalletlocked(): Promise<boolean> {
        return await this.wallet.isLocked();
    }

    /**
     * @returns Boolean if the guardians are blocked.
     * @notice In case guardians are misbehaving, the owner + recovery owner can lock the wallet.
     */
    async areGuardiansBlocked(): Promise<boolean> {
        return await this.wallet.guardiansBlocked();
    }

    /**
     * @returns the network id that the wallet is connected to.
     */
    async getNetworkId(): Promise<string> {
        return (await this.wallet.getChainId()).toString();
    }

    /**
     *
     * @returns The domain for EIP712 signature scheme.
     */
    async getDomain(): Promise<Domain> {
        return {
            chainId: await this.getNetworkId(),
            verifyingContract: this.wallet.address,
        };
    }

    /**
     * @returns The address of the  wallet.
     */
    getContractAddress(): Address {
        return this.wallet.address;
    }

    /**
     * @returns The address of the owner of this wallet.
     */
    async getOwner(): Promise<Address> {
        return await this.wallet.owner();
    }

    /**
     * @returns The address of the recovery owner of this wallet.
     */
    async getRecoveryOwner(): Promise<Address> {
        return await this.wallet.recoveryOwner();
    }

    /**
     * @returns The guardians of this wallet.
     */
    async getGuardians(): Promise<Address[]> {
        return await this.wallet.getGuardians();
    }

    /**
     * @param _address  Address to check if it is an owner of the current wallet.
     * @returns true if owner, false if not.
     */
    async isOwner(_address: string): Promise<boolean> {
        const address = checksum(_address);
        const owner = await this.getOwner();
        return address.toLowerCase() === owner.toLowerCase();
    }

    /**
     * @param _address  Address to check if it is a guardian of the current wallet.
     * @returns true if guardian, false if not.
     */
    async isGuardian(_address: string): Promise<boolean> {
        const address = checksum(_address);
        return await this.wallet.isGuardian(address);
    }

    /**
     * @returns The balance in ETH of the wallet.
     */
    async getBalanceInEth(): Promise<Numberish> {
        return ethers.utils
            .formatEther(await this.provider.getBalance(this.wallet.address))
            .toString();
    }

    /**
     * @returns The balance in WEI of the wallet.
     */
    async getBalanceInWei(): Promise<Numberish> {
        return (await this.provider.getBalance(this.wallet.address)).toString();
    }

    /**
     * @returns The entry point contract address.
     */
    async getEntryPoint(): Promise<Address> {
        return await this.wallet.entryPoint();
    }

    /**
     * @returns The singleton address. The master copy where all logic is handled.
     */
    async getSingleton(): Promise<Address> {
        return await this.wallet.singleton();
    }

    /**
     * @param hash that was signed by the owners.
     * @param signatures of the message.
     * @returns true if the signature is valid for the wallet.
     */
    async isValidSignature(hash: string, signatures: string): Promise<boolean> {
        try {
            const res = await this.wallet.isValidSignature(hash, signatures);
            return res.toLowerCase() === MAGIC_VALUE.toLowerCase();
        } catch (e) {
            throw Error(`Error in isValidSignature, probably not valid: ${e}`);
        }
    }

    /**
     * @dev Encodes data.
     * @param funcName The name of the function.
     * @param _params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    encodeFunctionData(funcName: string, ..._params: any[]): string {
        const params = _params[0];
        return new ethers.utils.Interface(this.abi).encodeFunctionData(funcName, params);
    }

    /**
     * @dev Returns the user operation hash to be signed by owners.
     * @param userOp The UserOperation struct.
     */
    async userOperationHash(userOp: UserOperation): Promise<string> {
        return await this.wallet.userOperationHash(userOp);
    }

    /**
     *
     * **************** E N C O D I N G  &  E X E C U T I O N    M E T H O D S ****************
     */

    /**
     * @dev Data payload to change the owner.
     * @param _newOwner New owner.
     */
    private async changeOwnerData(_newOwner: Address): Promise<string> {
        const newOwner = checksum(_newOwner);
        const currentOwner = await this.getOwner();
        if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await this.isContract(newOwner)) {
            throw Error("Owner cannot be a contract.");
        }
        return this.encodeFunctionData("changeOwner", [_newOwner]);
    }

    /**
     * @param newOwner The address of the new owner.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<UserOperation> {
        // NOTE !!! It is missing a lot of extra safety checks... But it works for now.
        if ((await this.isOwner(this.signer.address)) === false) {
            throw Error("Only the owner can send funds.");
        }
        // We cannot change the owner is the wallet is locked. 
        if (await this.isWalletlocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }
        const txData = this.changeOwnerData(newOwner);
        const walletAddress = this.getContractAddress();
        // The user operation object needs to be sent to the EntryPoint contract 'handleOps'...
        // Check the examples folder ...
        userOp.sender = walletAddress;
        userOp.nonce = await this.getNonce();
        userOp.callData = this.encodeFunctionData("exec", [walletAddress, 0, txData]);
        userOp.callGas = txInfo.callGas;
        userOp.maxFeePerGas = txInfo.maxFeePerGas;
        userOp.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        userOp.signature = await EIP712Sig(this.signer, userOp, await this.getDomain());

        // This userOp then gets sent to the relayer and then to the EntryPoint contract ...
        return userOp;
    }



    /**
     * This is signed with normal eth flow.
     * @dev Sends a signed userOp object to the relayer.
     * @param to Destination address of the transaction.
     * @param amount Amount in ETH to send.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     * @returns The userOp object to then be sent to the EntryPoint contract.
     */
    async sendEth(to: Address, amount: Numberish, txInfo: TransactionInfo): Promise<UserOperation> {
        // NOTE !!! It is missing a lot of extra safety checks... But it works for now.

        if (amount <= 0) {
            throw Error("Cannot send 0 ETH.");
        }
        // We cannot change the owner is the wallet is locked. 
        if (await this.isWalletlocked()) {
            throw Error("Wallet locked, forbidden operation.");
        }

        const currentBal = await this.getBalanceInEth();

        if (Number(currentBal) < Number(amount)) {
            // NOTE !!! It is missing a lot of extra safety checks... But it works for now.
            throw Error("Insufficient balance.");
        }
        if ((await this.isOwner(this.signer.address)) === false) {
            throw Error("Only the owner can send funds.");
        }

        const amountInWei = toWei(amount);

        // The user operation object needs to be sent to the EntryPoint contract 'handleOps'...
        // Check the examples folder ...
        userOp.sender = this.getContractAddress();
        userOp.nonce = await this.getNonce();
        userOp.callData = this.encodeFunctionData("exec", [to, amountInWei, "0x"]);
        userOp.callGas = txInfo.callGas;
        userOp.maxFeePerGas = txInfo.maxFeePerGas;
        userOp.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        userOp.signature = "0x";
        const hash = await this.wallet.userOperationHash(userOp);
        userOp.signature = await sign(this.signer, hash);

        if ((await this.isValidSignature(hash, userOp.signature)) === false) {
            throw Error("Invalid signature.");
        }

        // This userOp then gets sent to the relayer and then to the EntryPoint contract ...
        return userOp;
    }
}
