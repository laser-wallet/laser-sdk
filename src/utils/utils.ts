import { BigNumberish, ethers, utils } from "ethers";
import { Address } from "../types";

/**
 * @returns the correct checksummed address.
 */
export function checksum(address: Address): Address {
    return utils.getAddress(address);
}

/**
 * @param amount Amount in WEI. 1 WEI = 10 * 10 ** 18 ETH.
 * @returns The amount in ETH.
 */
export function toEth(amount: BigNumberish): BigNumberish {
    return ethers.utils.formatEther(amount).toString();
}

/**
 * @param amount Amount in ETH.
 * @returns The amount in WEI.
 */
export function toWei(amount: BigNumberish): BigNumberish {
    return ethers.utils.parseEther(amount.toString());
}

export function encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
    const params = _params[0];
    return new ethers.utils.Interface(abi).encodeFunctionData(funcName, params);
}
