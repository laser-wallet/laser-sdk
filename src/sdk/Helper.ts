import { BigNumberish, Contract, ethers, utils, BigNumber } from "ethers";
import { View } from "./View";
import { Provider } from "@ethersproject/providers";
import { Address } from "../types";
import { abi } from "../abis/LaserWallet.json";
import { MAGIC_VALUE, ZERO } from "../constants";
import { TransactionInfo, Transaction, LASER_FUNCS, BlockOutput } from "../types";
import erc20Abi from "../abis/erc20.abi.json";

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

    /**
     * @returns The base fee of the latest block.
     */
    async getBaseFee(): Promise<BigNumberish> {
        const latestBlock = await this.provider.getBlock("latest");
        const baseFeePerGas = latestBlock.baseFeePerGas;
        if (baseFeePerGas) {
            return baseFeePerGas.toString();
        } else {
            throw Error("Could not get base fee per gas.");
        }
    }

    /**
     * @notice This helper function packs the signatures in correct order according to the smart
     * contract's specifications.
     * @param signatures The bundled signatures (they don't need to be in a specific order).
     * @param funcName The name of the function to call.
     * @returns The packed signatures in correct order.
     */
    async packSignatures(signatures: string, funcName: string): Promise<string> {
        // Signatures need to be at least 130 bytes + 0x.
        if (signatures.length < 264) {
            throw Error("Incorrect signature length.");
        }
        if (funcName === "lock") {
            // If the function name is lock, we need to pack both of the signatures.
            return "";
        }

        // @todo Check each function name and bundle the signatures in correct order.
        return "";
    }

    /**
     * @param _tokenAddress The address of the required token.
     * @returns The token balance of the connected wallet.
     */
    async getTokenBalance(_tokenAddress: Address): Promise<BigNumberish> {
        const tokenAddress = await this.verifyAddress(_tokenAddress);

        // The tokenAddress needs to be a contract.
        if (!(await this.isContract(tokenAddress))) {
            throw Error("Token address is not a contract.");
        }

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
        try {
            return tokenContract.balanceOf(this.wallet.address);
        } catch (e) {
            throw Error(
                `Invalid balance call, probably the address is not ERC-20 compatible: ${e}`
            );
        }
    }

    /**
     * @param _tokenAddress The address of the required token.
     * @returns The token balance of the connected wallet without decimals.
     */
    async getConvertedTokenBalance(_tokenAddress: Address): Promise<BigNumberish> {
        const balance = await this.getTokenBalance(_tokenAddress);
        const tokenContract = new ethers.Contract(_tokenAddress, erc20Abi, this.provider);
        const decimals = await tokenContract.decimals();
        return ethers.utils.formatUnits(balance, decimals);
    }

    /**
     * @dev Checks that the wallet has enough gas for the transaction.
     * @note NOT FINAL !!
     */
    checkGas(txInfo: TransactionInfo, walletBalance: BigNumberish) {
        const baseGas = 40000; // This should be properly calculated, not final!!!
        const totalGas = BigNumber.from(baseGas).add(txInfo.gasTip);
        const ethCost = totalGas.mul(txInfo.maxFeePerGas);
        const balance = Helper.toWei(walletBalance);

        if (BigNumber.from(balance).lt(BigNumber.from(ethCost))) {
            throw Error("Insufficient gas cost.");
        }
    }

    /**
     * @dev Listens each block and logs the block's result if the connected wallet
     * sent or received a transaction.
     */
    async listenBlocks(): Promise<void> {
        this.provider.on("block", async (blockNumber) => {
            const blockWithTransactions = await this.provider.getBlockWithTransactions(blockNumber);
            const transactions = blockWithTransactions.transactions;
            const target = this.wallet.address.toLowerCase();
            const targetBlock = transactions.filter(
                (tx) => tx.to?.toLowerCase() === target || tx.from.toLowerCase() === target
            );
            console.log(targetBlock);
        });
    }
}
