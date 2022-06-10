import { BigNumberish, Contract, ethers, utils } from "ethers";
import { View } from "./View";
import { Provider } from "@ethersproject/providers";
import { Address, UserOperation } from "../types";
import { abi } from "../abis/LaserWallet.json";
import { MAGIC_VALUE, ZERO } from "../constants";
import { TransactionInfo } from "../types";

/**
 * @dev Helper methods for Laser.
 */
export class Helper extends View {
    readonly provider: Provider;
    readonly walletAddress: Address;
    readonly wallet: Contract;

    constructor(_provider: Provider, _walletAddress: Address) {
        super(_provider, _walletAddress);
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = new Contract(this.walletAddress, abi, this.provider);
    }

    /**
     * @dev Helper function to create a user operation object.
     */
    async createOp(
        _callData: string,
        txInfo: TransactionInfo,
        _signature?: string
    ): Promise<UserOperation> {
        return {
            sender: this.wallet.address,
            nonce: await this.getNonce(),
            initCode: "0x",
            callData: _callData,
            callGas: txInfo.callGas,
            verificationGas: 100000, // TODO: This is not accurate, get the exact gas cost to verify a signature.
            preVerificationGas: 100000, // This is not accurate neither...
            maxFeePerGas: txInfo.maxFeePerGas,
            maxPriorityFeePerGas: txInfo.maxPriorityFeePerGas,
            paymaster: ZERO,
            paymasterData: "0x",
            signature: _signature ? _signature : "0x",
        };
    }
    /**
     * @dev Encodes data.
     * @param funcName The name of the function.
     * @param _params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    static encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
        const params = _params[0];
        return new utils.Interface(abi).encodeFunctionData(funcName, params);
    }

    /**
     * @returns The balance in WEI of the address.
     */
    static async getBalance(provider: Provider, address: Address): Promise<string> {
        return (await provider.getBalance(address)).toString();
    }

    /**
     * @returns True if the address is a contract, false if not.
     */
    static async isContract(provider: Provider, _address: Address): Promise<boolean> {
        const address = this.checksum(_address);
        const code = await provider.getCode(address);
        return code.length > 2 ? true : false;
    }

    /**
     * @returns The correct checksumed version of the address.
     */
    static checksum(address: Address): Address {
        return utils.getAddress(address);
    }

    /**
     * @returns The given value in ETH or value / 10 * 10 **18.
     */
    static toEth(amount: BigNumberish): BigNumberish {
        return utils.formatEther(amount).toString();
    }

    /**
     * @returns The given value in WEI or value * 10 ** 18.
     */
    static toWei(amount: BigNumberish): BigNumberish {
        return ethers.utils.parseEther(amount.toString());
    }

    /**
     * @param _address  Address to check if it is an owner of the current wallet.
     * @returns true if owner, false if not.
     */
    async isOwner(_address: string): Promise<boolean> {
        const address = Helper.checksum(_address);
        const owner = await this.getOwner();
        return address.toLowerCase() === owner.toLowerCase();
    }

    /**
     * @param _address  Address to check if it is a guardian of the current wallet.
     * @returns true if guardian, false if not.
     */
    async isGuardian(_address: string): Promise<boolean> {
        const address = Helper.checksum(_address);
        return await this.wallet.isGuardian(address);
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
     * @dev Returns the user operation hash to be signed by owners.
     * @param userOp The UserOperation struct.
     */
    async userOperationHash(userOp: UserOperation): Promise<string> {
        return await this.wallet.userOperationHash(userOp);
    }
}
