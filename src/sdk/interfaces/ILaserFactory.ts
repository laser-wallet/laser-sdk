import { Address } from "../../types";
import { BigNumberish, ContractReceipt } from "ethers";

///@title ILaserFactory - interface for LaserFactory.
export interface ILaserFactory {
    ///@dev Mastercopy of the proxies, Laser core logic.
    getSingleton(): Promise<Address>;

    proxyRuntimeCode(): Promise<string>;

    proxyCreationCode(): Promise<string>;

    ///@dev Creates a Laser proxy wallet with 'create2'.
    createWallet(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        gasLimit: BigNumberish,
        relayer: Address,
        saltNumber: BigNumberish,
        ownerSignature: string
    ): Promise<any>;

    ///@dev Precomputes the address that will be deployed with 'createWallet'.
    ///The proxy is created through 'create2', so any change will output a different address.
    preComputeAddress(
        owner: Address,
        recoveryOwner: Address[],
        guardians: Address[],
        saltNumber: BigNumberish
    ): Promise<Address>;
}
