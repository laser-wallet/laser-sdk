import { Numberish } from "./types";

/**
 * @param callGas The amount of gas to allocate the main execution call.
 * @param maxFeePerGas Maximum fee per gas (similar to EIP 1559  max_fee_per_gas).
 * @param maxPriorityFeePerGas Maximum priority fee per gas (similar to EIP 1559 max_priority_fee_per_gas).
 */
export interface TransactionInfo {
    callGas: Numberish;
    maxFeePerGas: Numberish;
    maxPriorityFeePerGas: Numberish;
}
