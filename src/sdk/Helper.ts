import { BigNumberish, Contract, ethers, utils, BigNumber } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address } from "../types";
import { LaserWallet__factory, LaserWallet } from "../typechain";
import { MAGIC_VALUE, ZERO } from "../constants";
import { TransactionInfo, Transaction } from "../types";
import erc20Abi from "../abis/erc20.abi.json";

/**
 * @dev Helper methods for Laser class and paralel classes.
 */
export class Helper {
    static encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
        const params = _params[0];
        return new utils.Interface(abi).encodeFunctionData(funcName, params);
    }

    static async isContract(provider: Provider, _address: Address): Promise<boolean> {
        const address = await Helper.verifyAddress(provider, _address);
        const code = await provider.getCode(address);

        return code.length > 2 ? true : false;
    }

    static toEth(amount: BigNumberish): BigNumberish {
        return utils.formatEther(amount);
    }

    static toWei(amount: BigNumberish): BigNumberish {
        return ethers.utils.parseEther(amount.toString());
    }

    /**
     * @dev Checks the correctness of the address.
     * @param address ENS or regular ethereum address to verify.
     * @returns The correct address.
     */
    static async verifyAddress(provider: Provider, address: Address): Promise<Address> {
        if (address.includes(".")) {
            const result = await provider.resolveName(address);
            if (!result) throw Error("Invalid ENS");
            else return result;
        } else if (address.length === 42) {
            return utils.getAddress(address);
        } else {
            throw Error("Invalid address");
        }
    }

    static async simulateTransaction(
        provider: Provider,
        laserAddress: Address,
        transaction: Transaction
    ): Promise<BigNumberish> {
        const walletForSimulation = LaserWallet__factory.connect(laserAddress, provider);
        try {
            const totalGas = await walletForSimulation.callStatic.simulateTransaction(
                transaction.to,
                transaction.value,
                transaction.callData,
                transaction.nonce,
                transaction.maxFeePerGas,
                transaction.maxPriorityFeePerGas,
                transaction.gasLimit,
                transaction.signatures,
                {
                    from: ZERO,
                    gasLimit: transaction.gasLimit,
                    maxFeePerGas: transaction.maxFeePerGas,
                    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
                }
            );
            return totalGas;
        } catch (e) {
            throw Error(`Error in transaction simulation ${e}`);
        }
    }

    /**
     * @returns The base fee of the latest block.
     */
    static async getBaseFee(provider: Provider): Promise<BigNumberish> {
        const latestBlock = await provider.getBlock("latest");
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
    static async getTokenBalance(
        provider: Provider,
        requested: Address,
        _tokenAddress: Address
    ): Promise<BigNumberish> {
        const tokenAddress = await Helper.verifyAddress(provider, _tokenAddress);

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        try {
            return tokenContract.balanceOf(requested);
        } catch (e) {
            throw Error(`Invalid balance call, probably the address is not ERC-20 compatible: ${e}`);
        }
    }

    /**
     * @returns The token balance of the connected wallet without decimals.
     */
    // static async getConvertedTokenBalance(_tokenAddress: Address): Promise<BigNumberish> {
    //     const balance = await this.getTokenBalance(_tokenAddress);
    //     const tokenContract = new ethers.Contract(_tokenAddress, erc20Abi, this.provider);
    //     const decimals = await tokenContract.decimals();
    //     return ethers.utils.formatUnits(balance, decimals);
    // }

    // /**
    //  * @dev Checks that the wallet has enough gas for the transaction.
    //  * @note NOT FINAL !!
    //  */
    // checkGas(txInfo: TransactionInfo, walletBalance: BigNumberish) {
    //     const baseGas = 40000; // This should be properly calculated, not final!!!
    //     const totalGas = BigNumber.from(baseGas).add(txInfo.gasTip);
    //     const ethCost = totalGas.mul(txInfo.maxFeePerGas);
    //     const balance = Helper.toWei(walletBalance);

    //     if (BigNumber.from(balance).lt(BigNumber.from(ethCost))) {
    //         throw Error("Insufficient gas cost.");
    //     }
    // }
}
