import { BigNumberish } from "ethers";
import { Address } from "./types";

/**
 * @param maxFeePerGas Maximum fee per gas (similar to EIP 1559  max_fee_per_gas).
 * @param maxPriorityFeePerGas Maximum priority fee per gas (similar to EIP 1559 max_priority_fee_per_gas).
 */
export interface TransactionInfo {
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
}

/**
 * @dev Parameters to execute a basic transaction in Laser.
 * @param to Destination address.
 * @param value Amount to send.
 * @param data Encoded transaction's payload.
 */
export interface GenericTransaction {
    to: Address;
    value: BigNumberish;
    data: string;
}
