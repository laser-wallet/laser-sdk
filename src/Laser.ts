import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address, Numberish, Domain, UserOperation, userOp, TransactionInfo } from "./types";
import { ZERO, MAGIC_VALUE } from "./constants";
import { checksum } from "./utils";
import { abi } from "./abis/LaserWallet.json";
import { EIP712Sig } from "./utils/signatures";

/**
 * @dev Interacts with a Laser Wallet.
 */
export class Laser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly contract: Contract; // The actual wallet.
    readonly abi = abi;
    readonly aaUrl: string;

    /**
     *
     * @param providerUrl RPC url to have a connection with a node (INFURA, ALCHEMY).
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param contractAddress The address of the wallet.
     * @param aaUrl Url connection to send the UserOperation struct.
     */
    constructor(providerUrl: string, _signer: Wallet, contractAddress: string, aaUrl: string) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.signer = _signer;
        this.contract = new Contract(contractAddress, abi, this.signer.connect(this.provider));
        this.aaUrl = aaUrl;
    }

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
        return await this.contract.VERSION();
    }

    /**
     * @returns the nonce of the  wallet.
     */
    async getNonce(): Promise<string> {
        return (await this.contract.nonce()).toString();
    }

    /**
     * @returns the network id that the wallet is connected to.
     */
    async getNetworkId(): Promise<string> {
        return (await this.contract.getChainId()).toString();
    }

    /**
     *
     * @returns The domain for EIP712 signature scheme.
     */
    async getDomain(): Promise<Domain> {
        return {
            chainId: await this.getNetworkId(),
            verifyingContract: this.contract.address,
        };
    }

    /**
     * @returns the address of the  wallet.
     */
    getContractAddress(): Address {
        return this.contract.address;
    }

    /**
     * @returns The address of the owner.
     */
    async getOwner(): Promise<Address> {
        return await this.contract.owner();
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
     * @returns The balance in ETH of the wallet.
     */
    async getBalanceInEth(): Promise<Numberish> {
        return ethers.utils
            .formatEther(await this.provider.getBalance(this.contract.address))
            .toString();
    }

    /**
     * @returns The balance in WEI of the wallet.
     */
    async getBalanceInWei(): Promise<Numberish> {
        return (await this.provider.getBalance(this.contract.address)).toString();
    }

    /**
     * @returns The entry point of the wallet.
     */
    async getEntryPoint(): Promise<Address> {
        return await this.contract.entryPoint();
    }

    /**
     * @param hash that was signed by the owners.
     * @param signatures of the message.
     * @returns true if the signature is valid for the wallet.
     */
    async isValidSignature(hash: string, signatures: string): Promise<boolean> {
        try {
            const res = await this.contract.isValidSignature(hash, signatures);
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
        return await this.contract.userOperationHash(userOp);
    }

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
     * @dev Sends a signed userOp object to the relayer.
     * @param newOwner The address of the new owner.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     */
    async changeOwner(newOwner: Address, txInfo: TransactionInfo): Promise<UserOperation> {
        // NOTE !!! It is missing a lot of extra safety checks... But it works for now.

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
     * @dev Sends a signed userOp object to the relayer.
     * @param to Destination address of the transaction.
     * @param amount Amount in ETH to send.
     * @param txInfo The transaction info (see types). Primarily gas costs.
     */
    async sendEth(to: Address, amount: Numberish, txInfo: TransactionInfo): Promise<UserOperation> {
        // NOTE !!! It is missing a lot of extra safety checks... But it works for now.

        if (amount <= 0) {
            throw Error("Cannot send 0 ETH.");
        }
        const currentBal = await this.getBalanceInEth();
        if (Number(currentBal) < Number(amount)) {
            throw Error("Insufficient balance.");
        }
        const amountInWei = ethers.utils.parseEther(amount.toString());
        const walletAddress = this.getContractAddress();

        // The user operation object needs to be sent to the EntryPoint contract 'handleOps'...
        // Check the examples folder ...
        userOp.sender = walletAddress;
        userOp.nonce = await this.getNonce();
        userOp.callData = this.encodeFunctionData("exec", [to, amountInWei, "0x"]);
        userOp.callGas = txInfo.callGas;
        userOp.maxFeePerGas = txInfo.maxFeePerGas;
        userOp.maxPriorityFeePerGas = txInfo.maxPriorityFeePerGas;
        userOp.signature = await EIP712Sig(this.signer, userOp, await this.getDomain());

        // This userOp then gets sent to the relayer and then to the EntryPoint contract ...
        return userOp;
    }
}
