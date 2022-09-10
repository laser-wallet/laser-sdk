import { Address } from "../types";

// Returns the amount of gas needed to deploy a vault (with some buffer).
export function estimateDeployGas(guardians: Address[], recoveryOwners: Address[]): number {
    if (guardians.length < 1 || recoveryOwners.length < 1) {
        throw Error("There needs to be at least 1 guardian and 1 recovery owner.");
    }
    const base = 290000;
    if (guardians.length === 1 && recoveryOwners.length === 1) {
        return base;
    } else {
        const extraAddress = 30000;

        const totalAddresses = guardians.length + recoveryOwners.length - 2;

        const extraGas = totalAddresses * extraAddress;

        return base + extraGas;
    }
}
