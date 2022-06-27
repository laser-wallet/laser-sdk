import { BigNumberish, Contract, ethers, utils } from "ethers";
import { View } from "./View";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Address } from "../types";
import { abi } from "../abis/LaserWallet.json";
import { MAGIC_VALUE, ZERO } from "../constants";
import { TransactionInfo, Transaction } from "../types";

interface SimulationResults {
    preOpGas: BigNumberish;
    prefund: BigNumberish;
}

/**
 * @dev Helper methods for Laser.
 */
export class Helper extends View {
    readonly provider: JsonRpcProvider;
    readonly walletAddress: Address;
    readonly wallet: Contract;

    constructor(_provider: JsonRpcProvider, _walletAddress: Address) {
        super(_provider, _walletAddress);
        this.provider = _provider;
        this.walletAddress = _walletAddress;
        this.wallet = new Contract(this.walletAddress, abi, this.provider);
    }

    /**
     * @dev Encodes data.
     * @param funcName The name of the function.
     * @param _params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
        const params = _params[0];
        return new utils.Interface(abi).encodeFunctionData(funcName, params);
    }

    /**
     * @returns True if the address is a contract, false if not.
     */
    async isContract(_address: Address): Promise<boolean> {
        const address = await this.verifyAddress(_address);
        const code = await this.provider.getCode(address);
        return code.length > 2 ? true : false;
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
     * @dev Checks the correctness of the address.
     * @param address ENS or regular ethereum address to verify.
     * @returns The correct address.
     */
    async verifyAddress(address: Address): Promise<Address> {
        if (address.includes(".")) {
            const result = await this.provider.resolveName(address);
            if (!result) throw Error("Invalid ENS");
            else return result;
        } else if (address.length === 42) {
            return utils.getAddress(address);
        } else {
            throw Error("Invalid address");
        }
    }

    /**
     * @param _address  Address to check if it is an owner of the current wallet.
     * @returns true if owner, false if not.
     */
    async isOwner(_address: string): Promise<boolean> {
        const address = await this.verifyAddress(_address);
        const owner = await this.getOwner();
        return address.toLowerCase() === owner.toLowerCase();
    }

    /**
     * @param _address  Address to check if it is a guardian of the current wallet.
     * @returns true if guardian, false if not.
     */
    async isGuardian(_address: string): Promise<boolean> {
        const address = await this.verifyAddress(_address);
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
     *
     * @param transaction Transaction type.
     * @returns The has of the transaction to sign.
     */
    async getHash(transaction: Transaction): Promise<string> {
        const hash = await this.wallet.operationHash(
            transaction.to,
            transaction.value,
            transaction.callData,
            transaction.nonce,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasTip
        );
        return hash;
    }

    /**
     * @param tx Basic Laser transaction (to, value, data).
     * @returns Transaction's call gas
     */
    async simulateTransaction(transaction: Transaction): Promise<BigNumberish> {
        const pWallet = new ethers.Contract(this.wallet.address, abi, this.provider);
        try {
            const callGas = await pWallet.callStatic.simulateTransaction(
                transaction.to,
                transaction.value,
                transaction.callData,
                transaction.nonce,
                transaction.maxFeePerGas,
                transaction.maxPriorityFeePerGas,
                transaction.gasTip,
                transaction.signatures,
                {
                    from: ZERO,
                }
            );
            return callGas;
        } catch (e) {
            throw Error(`Error in transaction simulation ${e}`);
        }
    }

    async getBaseFee(): Promise<BigNumberish> {
        return (await this.provider.send("eth_getBlockByNumber", ["latest", true])).baseFeePerGas;
    }
}
