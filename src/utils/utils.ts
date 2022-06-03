import { ethers, utils } from "ethers";
import { Address, Numberish } from "../types";

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
export function toEth(amount: Numberish): Numberish {
    return (ethers.utils.formatEther(amount)).toString();
}

/**
 * @param amount Amount in ETH.
 * @returns The amount in WEI.
 */
export function toWei(amount: Numberish): Numberish {
    return ethers.utils.parseEther(amount.toString());
}
