import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address } from "../types";
import { ZERO, SALT } from "../constants/constants";
import { checksum } from "../utils";
import { factoryAbi } from "../abis/LaserProxyFactory.json";

interface IFactory {
    getSingleton(): Promise<Address>;
    proxyRuntimeCode(): Promise<string>;
    proxyCreationCode(): Promise<string>;
    createProxy(
        owner: Address,
        recoveryOwner: Address,
        guardians: Address[],
        entryPoint: Address
    ): Promise<Address>;
    createProxyWithCreate2(
        owner: Address,
        recoveryOwner: Address,
        guardians: Address[],
        entryPoint: Address
    ): Promise<Address>;
    preComputeAddress(dataInitializer: string, owner: Address): Promise<Address>;
}

/**
 * @dev Class that has all the methods to read/write to a Laser wallet.
 */
export class Factory implements IFactory {
    get address(): Address {
        return this.factory.address;
    }

    readonly provider: Provider;
    readonly relayer: Wallet;
    readonly factory: Contract;
    readonly abi = factoryAbi;

    /**
     * @chainId The id of the chain for this connection (e.g 1 for mainnet).
     * @param relayer Deployer of the wallet. It can be Laser, and the transaction gets refunded after the user receives a first deposit.
     * @param factoryAddress The address of the deployed factory.
     */
    constructor(_provider: Provider, relayer: Wallet, factoryAddress: Address) {
        this.provider = _provider;
        this.relayer = relayer;
        this.factory = new ethers.Contract(
            factoryAddress,
            this.abi,
            this.relayer.connect(this.provider)
        );
    }

    /**
     * @dev Encodes data.
     * @param params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    encodeFunctionData(..._params: any[]): string {
        const _abi = ["function init(address,address,address[],address) external"];
        const params = _params[0];
        return new ethers.utils.Interface(_abi).encodeFunctionData("init", params);
    }

    /**
     * Checks the correctness of the parameters.
     * This checks are also done with more vigour in the contract side.
     * @param _owner The target owner address.
     * @param _recoveryOwner The recovery owner.
     * @param guardians The target guardian addresses.
     * @param _entryPoint The target EntryPoint address.
     */
    async checkParams(
        _owner: Address,
        _recoveryOwner: Address,
        guardians: Address[],
        _entryPoint: Address
    ): Promise<void> {
        const owner = checksum(_owner);
        const recoveryOwner = checksum(_recoveryOwner);
        if (
            owner.toLowerCase() === ZERO.toLowerCase() ||
            recoveryOwner.toLowerCase() == ZERO.toLowerCase()
        ) {
            throw Error("Owners cannot be address 0.");
        }
        if ((await this.isContract(owner)) || (await this.isContract(recoveryOwner))) {
            throw Error("OwnerS cannot be a contract.");
        }
        if (guardians.length === 0) {
            throw Error("There needs to be at least 1 guardian.");
        }

        let dup = [];

        for (let i = 0; i < guardians.length; i++) {
            const guardian = checksum(guardians[i]);
            dup.push(guardian.toLowerCase());
            if (guardian.toLowerCase() === ZERO.toLowerCase()) {
                throw Error("Guardian cannot be address 0.");
            }
            if (guardian.toLowerCase() === owner.toLowerCase()) {
                throw Error("Guardian cannot be the owner.");
            }
        }

        if (new Set(dup).size < dup.length) {
            throw Error("Duplicate guardians.");
        }

        const entryPoint = checksum(_entryPoint);
        if (!(await this.isContract(entryPoint))) {
            throw Error("EntryPoint needs to be a contract.");
        }
    }

    /**
     * @dev Returns the base contract, where all the delegatecalls are forwarded.
     */
    async getSingleton(): Promise<Address> {
        return await this.factory.singleton();
    }

    /**
     * @dev Allows to retrieve the runtime code of a deployed Proxy. This can be used to check that the expected Proxy was deployed.
     */
    async proxyRuntimeCode(): Promise<string> {
        return await this.factory.proxyRuntimeCode();
    }

    /**
     *  @dev Allows to retrieve the creation code used for the Proxy deployment. With this it is easily possible to calculate predicted address.
     */
    async proxyCreationCode(): Promise<string> {
        return await this.factory.proxyCreationCode();
    }

    /**
     * @returns True if the address is a contract, false if it is an EOA.
     */
    async isContract(_address: Address): Promise<boolean> {
        const address = checksum(_address);
        const code = await this.provider.getCode(address);
        return code.length > 2 ? true : false;
    }

    /**
     * @dev Allows to create new proxy contact and execute a message call to the new proxy within one transaction.
     * It also performs safety checks prior execution.
     * @param owner The target owner address.
     * @param recoveryOwner The recovery owner.
     * @param guardians The target guardian addresses.
     * @param entryPoint The target EntryPoint address.
     * @returns The address of the new wallet or reverts on error.
     */
    async createProxy(
        owner: Address,
        recoveryOwner: Address,
        guardians: Address[],
        entryPoint: Address
    ): Promise<Address> {
        await this.checkParams(owner, recoveryOwner, guardians, entryPoint);
        const dataPayload = this.encodeFunctionData([owner, guardians, entryPoint]);

        try {
            const transaction = await this.factory.createProxy(dataPayload);
            const receipt = await transaction.wait();
            // Returns the address of the new wallet.
            return receipt.events[1].args.proxy;
        } catch (e) {
            throw Error(`Error with createProxy: ${e}`);
        }
    }

    /**
     * @dev Allows to create new proxy contact and execute a message call to the new proxy within one transaction.
     * It also performs safety checks prior execution.
     * @param owner The target owner address.
     * @param recoveryOwner The recovery owner.
     * @param guardians The target guardian addresses.
     * @param entryPoint The target EntryPoint address.
     * @returns The address of the new wallet or reverts on error.
     */
    async createProxyWithCreate2(
        owner: Address,
        recoveryOwner: Address,
        guardians: Address[],
        entryPoint: Address
    ): Promise<Address> {
        await this.checkParams(owner, recoveryOwner, guardians, entryPoint);
        const dataPayload = this.encodeFunctionData([owner, recoveryOwner, guardians, entryPoint]);

        try {
            const transaction = await this.factory.createProxyWithNonce(dataPayload, SALT);
            const receipt = await transaction.wait();
            // Returns the address of the new wallet.
            return receipt.events[1].args.proxy;
        } catch (e) {
            throw Error(`Error with createProxy: ${e}`);
        }
    }

    /**
     * @dev Listens for the event 'ProxyCreation'.
     */
    async on(): Promise<void> {
        console.log("Listening ...");
        this.factory.on("ProxyCreation", async (proxy, singleton) => {
            console.log("New wallet creation");
            console.log("Wallet address: ", proxy);
        });
    }

    /**
     * @dev Precomputes the address of a proxy that is created through 'create2'.
     * NOTE: This is super useful to pre-compute the address of a new user, so that the real deployment
     * happens when the user receives ETH for the first time.
     */
    async preComputeAddress(dataInitializer: string): Promise<Address> {
        const address = await this.factory.preComputeAddress(dataInitializer, SALT);
        return address;
    }
}
