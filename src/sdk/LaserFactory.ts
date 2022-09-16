import { Provider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { BigNumber, BigNumberish, providers } from "ethers";
import { getDeployedAddresses } from "../constants/constants";
import { LaserFactory as _LaserFactory, LaserFactory__factory } from "../typechain";
import { Address } from "../types";
import { estimateDeployGas, getInitHash, getInitializer, sign, verifyDeployment } from "../utils";
import { ILaserFactory } from "./interfaces/ILaserFactory";

/**
 * @title LaserFactory
 *
 * @dev Factory that deploys proxies that delegate all calls to the main implementation.
 *      https://github.com/laser-wallet/laser-wallet-contracts/tree/master/contracts
 */
export class LaserFactory implements ILaserFactory {
    readonly provider: Provider;
    readonly signer: Wallet;

    public factory!: _LaserFactory;
    public chainId!: Number;
    public initialized = false;

    constructor(_provider: Provider, _signer: Wallet) {
        this.provider = _provider;
        this.signer = _signer.connect(this.provider);
    }

    /**
     * @dev Inits Laser factory with proper state.
     */
    async init() {
        const chainId = (await this.provider.getNetwork()).chainId.toString();

        const { laserFactory } = getDeployedAddresses(chainId);
        this.factory = LaserFactory__factory.connect(laserFactory, this.signer);
        this.chainId = Number(chainId);
        this.initialized = true;
    }

    /**
     * @returns The address of the factory.
     */
    async getAddress(): Promise<Address> {
        if (!this.initialized) await this.init();
        return this.factory.address;
    }

    /**
     * @dev Returns the base contract, where all the delegatecalls are forwarded.
     */
    async getSingleton(): Promise<Address> {
        if (!this.initialized) await this.init();
        return this.factory.singleton();
    }

    /**
     * @dev Allows to retrieve the runtime code of a deployed Proxy. This can be used to check that the expected Proxy was deployed.
     */
    async proxyRuntimeCode(): Promise<string> {
        if (!this.initialized) await this.init();
        return this.factory.proxyRuntimeCode();
    }

    /**
     * @dev Allows to retrieve the creation code used for the Proxy deployment. With this it is easily possible to calculate predicted address.
     */
    async proxyCreationCode(): Promise<string> {
        if (!this.initialized) await this.init();
        return this.factory.proxyCreationCode();
    }

    /**
     * @dev Creates a new Laser wallet.
     *      It checks that the parameters are correct.
     */
    async createWallet(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        saltNumber: BigNumberish,
        sender: Wallet
    ): Promise<providers.TransactionResponse> {
        if (!this.initialized) await this.init();

        const initHash = getInitHash(guardians, recoveryOwners, this.chainId);
        const ownerSignature = await sign(this.signer, initHash);
        const initializer = getInitializer(owner, guardians, recoveryOwners, ownerSignature);

        // @todo Check that the signature is correct.
        await verifyDeployment(this.provider, owner, recoveryOwners, guardians);
        const gasEstimate = estimateDeployGas(guardians, recoveryOwners);

        return this.factory.connect(sender.connect(this.provider)).createProxy(initializer, saltNumber, {
            gasLimit: BigNumber.from(gasEstimate),
        });
    }

    /**
     * @dev Precomputes the address of a proxy that is created through 'create2'.
     */
    async preComputeAddress(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        saltNumber: BigNumberish
    ): Promise<Address> {
        if (!this.initialized) await this.init();

        const initHash = getInitHash(guardians, recoveryOwners, this.chainId);
        const ownerSignature = await sign(this.signer, initHash);
        const initializer = getInitializer(owner, guardians, recoveryOwners, ownerSignature);

        return this.factory.preComputeAddress(initializer, saltNumber);
    }
}
