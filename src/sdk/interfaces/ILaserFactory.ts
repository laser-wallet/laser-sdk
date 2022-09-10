import { BigNumberish, providers } from "ethers";
import { Address } from "../../types";

export interface ILaserFactory {
    // Inits the factory.
    init(): Promise<void>;

    // Address of the factory.
    getAddress(): Promise<Address>;

    // Address of the master copy.
    getSingleton(): Promise<Address>;

    proxyRuntimeCode(): Promise<string>;

    proxyCreationCode(): Promise<string>;

    createWallet(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        saltNumber: BigNumberish,
        gasLimit?: BigNumberish
    ): Promise<providers.TransactionResponse>;

    // Precomputes the address of a proxy that is created through 'create2'.
    preComputeAddress(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        saltNumber: BigNumberish
    ): Promise<Address>;
}
