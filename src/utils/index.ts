import { utils } from "ethers";
import { Address } from "../types";

/**
 * @returns the correct checksummed address.
 */
export function checksum(address: Address): Address {
    return utils.getAddress(address);
}
