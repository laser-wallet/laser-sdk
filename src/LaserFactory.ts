import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address, Numberish } from "./types";
import { ZERO, SALT } from "./constants/constants";
import { checksum } from "./utils";
import { abi } from "./abis/LaserProxyFactory.json";

// This is a deployed version of the factory in GOERLI.
const GOERLI_FACTORY = "0xcCed5B88f14f1e133680117d01dEFeB38fC9a5A3";

/**
 * @dev ProxyFactory that deploys new proxies and has additional features.
 * code: https://github.com/laser-wallet/laser-wallet-contracts/blob/master/contracts/proxies/LaserProxyFactory.sol
 */
export class LaserFactory {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly factory: Contract;
    readonly abi = abi;

    /**
     *
     * @param providerUrl RPC url to have a connection with a node (INFURA, ALCHEMY).
     * @chainId The id of the chain for this connection (e.g 1 for mainnet).
     * @param _signer Deployer of the wallet. It can be Laser, and the transaction gets refunded after the user receives a first deposit.
     */
    constructor(providerUrl: string, chainId: Numberish, _signer: Wallet) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.signer = _signer;
        this.factory = new ethers.Contract(GOERLI_FACTORY, abi, this.signer.connect(this.provider));

        this.provider
            .getNetwork()
            .then((res) => {
                const id = res.chainId;
                if (chainId.toString() !== id.toString()) {
                    throw Error("Chain Id do not match.");
                }
            })
            .catch((err) => {
                throw Error("LaserFactory constructor.");
            });
    }

    /**
     * @dev Encodes data.
     * @param funcName The name of the function.
     * @param _params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    encodeFunctionData(funcName: string, ..._params: any[]): string {
        const initAbi = [
            "function init(address _owner,address[] calldata _guardians,address _entryPoint) external",
        ];
        const params = _params[0];
        return new ethers.utils.Interface(initAbi).encodeFunctionData(funcName, params);
    }

    /**
     * Checks the correctness of the parameters.
     * This checks are also done with more vigour in the contract side.
     * @param _owner The target owner address.
     * @param guardians The target guardian addresses.
     * @param _entryPoint The target EntryPoint address.
     */
    async checkParams(_owner: Address, guardians: Address[], _entryPoint: Address): Promise<void> {
        const owner = checksum(_owner);
        if (owner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Owner cannot be address 0.");
        }
        if (await this.isContract(owner)) {
            throw Error("Owner cannot be a contract.");
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
     * @param guardians The target guardian addresses.
     * @param entryPoint The target EntryPoint address.
     * @returns The address of the new wallet or reverts on error.
     */
    async createProxy(owner: Address, guardians: Address[], entryPoint: Address): Promise<Address> {
        await this.checkParams(owner, guardians, entryPoint);
        const dataPayload = this.encodeFunctionData("init", [owner, guardians, entryPoint]);

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
     * @param guardians The target guardian addresses.
     * @param entryPoint The target EntryPoint address.
     * @returns The address of the new wallet or reverts on error.
     */
    async createProxyWithCreate2(
        owner: Address,
        guardians: Address[],
        entryPoint: Address
    ): Promise<Address> {
        await this.checkParams(owner, guardians, entryPoint);
        const dataPayload = this.encodeFunctionData("init", [owner, guardians, entryPoint]);

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
     * @dev Precomputes the address of a proxy that is created through 'create2'.
     * NOTE: This is super useful to pre-compute the address of a new user, so that the real deployment
     * happens when the user receives ETH for the first time.
     */
    // async preComputeAddress(owner: Address): Promise<void> {
    //     const addr = await this.factory.preComputeAddress("0x", 1);
    //     console.log(addr);
    // }
}
