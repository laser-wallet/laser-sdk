import { BigNumberish, Contract, ethers, utils } from "ethers";
import { View } from "./View";
import { Provider } from "@ethersproject/providers";
import { Address, UserOperation } from "../types";
import { abi } from "../abis/LaserWallet.json";
import { MAGIC_VALUE, ZERO } from "../constants";
import { TransactionInfo, GenericTransaction } from "../types";
import { entryPointAbi } from "../abis/TestEntryPoint.json";

interface SimulationResults {
    preOpGas: BigNumberish;
    prefund: BigNumberish;
}

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
        execTx: GenericTransaction,
        _signature?: string
    ): Promise<UserOperation> {
        const _callGas = await this.simulateLaserTransaction(execTx);
        const callGas = Number(_callGas) + 13000;
        // The first verification is 20k gas more expenssive because we are updating a zero storage value.
        const _verificationGas = Number(await this.getNonce()) === 0 ? 90000 : 60000;

        return {
            sender: this.wallet.address,
            nonce: await this.getNonce(),
            initCode: "0x",
            callData: _callData,
            callGas: callGas,
            verificationGas: _verificationGas, // TODO: This is not accurate, get the exact gas cost to verify a signature.
            preVerificationGas: 30000, // This is not 100% accurate....
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
     * @dev Returns the user operation hash to be signed by owners.
     * @param userOp The UserOperation struct.
     */
    async userOperationHash(userOp: UserOperation): Promise<string> {
        return await this.wallet.userOperationHash(userOp);
    }

    /**
     * @dev The results of simulating a UserOperation transaction.
     * The UserOperation object is sent to the EntryPoint to check for correctness.
     * @returns preOpGas total gas used by validation (including contract creation).
     * @returns prefund the amount the wallet had to prefund (zero in case a paymaster pays).
     */
    async simulateOperation(userOp: UserOperation): Promise<SimulationResults> {
        const entryPointAddress = await this.getEntryPoint();
        const entryPoint = new ethers.Contract(entryPointAddress, entryPointAbi, this.provider);

        try {
            // We make an eth_call to simulateValidation from address zero.
            const request = await entryPoint.callStatic.simulateValidation(userOp, { from: ZERO });
            return {
                preOpGas: request.preOpGas.toString(),
                prefund: request.prefund.toString(),
            };
        } catch (e) {
            throw Error(`Failed simulation: ${e}`);
        }
    }

    /**
     * @param tx Basic Laser transaction (to, value, data).
     * @returns Transaction's call gas
     */
    async simulateLaserTransaction(tx: GenericTransaction): Promise<BigNumberish> {
        const pWallet = new ethers.Contract(this.wallet.address, abi, this.provider);
        try {
            const callGas = await pWallet.callStatic.simulateTransaction(tx.to, tx.value, tx.data, {
                from: ZERO,
            });
            return callGas;
        } catch (e) {
            throw Error(`Error in transaction simulation ${e}`);
        }
    }
}
