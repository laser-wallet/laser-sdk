import { ethers, Contract, utils, ContractReceipt, BigNumberish, BigNumber, Signer } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import { Address } from "../types";
import { ZERO, DEPLOYED_ADDRESSES } from "../constants/constants";
import {
    LaserFactory__factory,
    LaserFactory as _LaserFactory,
    LaserModuleSSR__factory,
    LaserModuleSSR,
} from "../typechain";
import { LaserWallet__factory, LaserWallet as _LaserWallet } from "../typechain";
import { ILaserFactory } from "./interfaces/ILaserFactory";
import { encodeFunctionData, initSSR, verifyAddress, isContract, sign } from "../utils";

export type FactoryTransaction = {
    owner: Address;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    gasLimit: BigNumberish;
    relayer: Address;
    ssrModule: Address;
    laserVault: Address;
    ssrInitData: string;
    saltNumber: BigNumberish;
    ownerSignature: string;
};

///@title LaserFactory
///@dev Factory that deploys proxies that delegate all calls to the main implementation.
///https://github.com/laser-wallet/laser-wallet-contracts/tree/master/contracts
export class LaserFactory implements ILaserFactory {
    readonly provider: Provider;
    readonly signer: Wallet;

    public ssrModule!: Address;
    public laserVault!: Address;
    public laserRegistry!: Address;

    private factory!: _LaserFactory;
    private initialized = false;

    constructor(_provider: Provider, _signer: Wallet) {
        this.provider = _provider;
        this.signer = _signer;
    }

    ///@dev Inits Laser factory with proper state.
    async init() {
        const chainId = (await this.provider.getNetwork()).chainId.toString();

        const deployedAddressess = DEPLOYED_ADDRESSES;

        switch (chainId.toString()) {
            case "1": {
                this.factory = LaserFactory__factory.connect(deployedAddressess["1"].laserFactory, this.provider);
                this.ssrModule = deployedAddressess["1"].laserModuleSSR;
                this.initialized = true;
                break;
            }
            case "5": {
                this.factory = LaserFactory__factory.connect(deployedAddressess["5"].laserFactory, this.provider);
                this.ssrModule = deployedAddressess["5"].laserModuleSSR;
                this.laserVault = deployedAddressess["5"].laserVault;
                this.laserRegistry = deployedAddressess["5"].laserRegistry;
                this.initialized = true;
                break;
            }
            case "42": {
                this.factory = LaserFactory__factory.connect(deployedAddressess["42"].laserFactory, this.provider);
                this.ssrModule = deployedAddressess["42"].laserModuleSSR;
                this.initialized = true;
                break;
            }
            case "3": {
                this.factory = LaserFactory__factory.connect(deployedAddressess["3"].laserFactory, this.provider);
                this.ssrModule = deployedAddressess["3"].laserModuleSSR;
                this.initialized = true;
                break;
            }
            case "31337": {
                this.factory = LaserFactory__factory.connect(deployedAddressess["31337"].laserFactory, this.provider);
                this.ssrModule = deployedAddressess["31337"].laserModuleSSR;
                this.laserVault = deployedAddressess["31337"].laserVault;
                this.laserRegistry = deployedAddressess["31337"].laserRegistry;
                this.initialized = true;
                break;
            }
            default: {
                throw Error("Laser does not support the connected network.");
            }
        }
    }

    ///@dev The address of the factory.
    async getAddress(): Promise<Address> {
        if (!this.initialized) await this.init();
        return this.factory.address;
    }

    async getInitHash(
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        gasLimit: BigNumberish,
        preComputeAddress: Address
    ): Promise<string> {
        const chainId = (await this.provider.getNetwork()).chainId;
        const abiCoder = new utils.AbiCoder();
        const dataHash = utils.solidityKeccak256(
            ["uint256", "uint256", "uint256", "uint256", "address"],
            [maxFeePerGas, maxPriorityFeePerGas, gasLimit, chainId, preComputeAddress]
        );
        return dataHash;
    }

    async verifySignature(
        owner: Address,
        signature: string,
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        gasLimit: BigNumberish
    ): Promise<void> {
        if (signature.length !== 132) {
            throw Error("Invalid init signature length.");
        }

        // r, s and v values.
        const r = signature.slice(0, 66); // first 32 bytes.
        const s = `0x${signature.slice(66, 130)}`; // second 32 bytes.
        const v = `0x${signature.slice(130)}`; // last byte.

        ///@todo This can be done through ethers.js so we save the rpc request..
        // const signer = await singleton.returnSigner(dataHash, r, s, v, signature);

        // if (owner.toLowerCase() !== signer.toLowerCase()) {
        //     throw Error("Invalid init signature.");
        // }
    }

    ///@dev Verifies that the wallet has balance to refund the relayer.
    async verifyPayment(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        _maxFeePerGas: BigNumberish,
        _maxPriorityFeePerGas: BigNumberish,
        _gasLimit: BigNumberish,
        saltNumber: BigNumberish
    ) {
        if (!this.initialized) await this.init();
        // We use ethers BigNumber for precision (very likely exceeds js max safety).
        // const maxFeePerGas = BigNumber.from(_maxFeePerGas);
        // const maxPriorityFeePerGas = BigNumber.from(_maxFeePerGas);
        const gasLimit = BigNumber.from(_gasLimit);
        const feeData = await this.provider.getFeeData();
        const maxFeePerGas = BigNumber.from(feeData.maxFeePerGas);
        const maxPriorityFeePerGas = BigNumber.from(feeData.maxPriorityFeePerGas);

        // The first thing we need to do, is to precompute the address.
        // The wallet is not created yet.
        const preComputedAddress = await this.preComputeAddress(owner, recoveryOwners, guardians, saltNumber);
        const balance = await this.provider.getBalance(preComputedAddress);
        const latestBlock = await this.provider.getBlock("latest");
        const baseFee = BigNumber.from(latestBlock.baseFeePerGas);

        let gasPrice = BigNumber.from(0);

        if (maxFeePerGas.eq(maxPriorityFeePerGas)) {
            // Legacy mode (chains that don't support EIP 1559)
            // We calculate the gas price the same way as the contracts do (so we are 100% compliant).
            // https://github.com/laser-wallet/laser-wallet-contracts/blob/master/contracts/utils/Utils.sol#L90
            gasPrice = maxFeePerGas;
        } else {
            gasPrice = maxFeePerGas.lt(maxPriorityFeePerGas.add(baseFee))
                ? maxFeePerGas
                : maxPriorityFeePerGas.add(baseFee);
        }
        const refundAmount = gasLimit.mul(gasPrice);
        if (balance.lt(refundAmount)) {
            throw Error("Wallet does not have enough ETH to pay the relayer for wallet creation.");
        }
    }

    async checkParams(
        _owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        gasLimit: BigNumberish,
        saltNumber: BigNumberish,
        relayer: Address,
        ownerSignature: string
    ): Promise<void> {
        if (!this.initialized) await this.init();
        const owner = await verifyAddress(this.provider, _owner);
        if (owner.toLowerCase() === ZERO.toLowerCase()) {
            throw Error("Owner cannot be address 0.");
        }
        if (await isContract(this.provider, owner)) {
            throw Error("Owner cannot be a contract.");
        }
        if (guardians.length < 1) {
            throw Error("There needs to be at least 1 guardian.");
        }
        if (recoveryOwners.length < 1) {
            throw Error("There needs to be at least 1 recovery owner.");
        }

        if (gasLimit < 180000 && gasLimit > 0) {
            throw Error("Gas limit too low, transaction will revert.");
        }

        let dupRecoveryOwners: string[] = [];

        for (let i = 0; i < recoveryOwners.length; i++) {
            const recoveryOwner = await verifyAddress(this.provider, recoveryOwners[i]);
            dupRecoveryOwners.push(recoveryOwner.toLowerCase());
            if (recoveryOwner.toLowerCase() === ZERO.toLowerCase()) {
                throw Error("Recovery owner cannot be address 0.");
            }
            if (recoveryOwner.toLowerCase() === owner.toLowerCase()) {
                throw Error("Recovery owner cannot be the owner.");
            }
        }

        if (new Set(dupRecoveryOwners).size < dupRecoveryOwners.length) {
            throw Error("Duplicate recovery owners.");
        }

        let dupGuardians: string[] = [];

        for (let i = 0; i < guardians.length; i++) {
            const guardian = await verifyAddress(this.provider, guardians[i]);
            dupGuardians.push(guardian.toLowerCase());
            if (guardian.toLowerCase() === ZERO.toLowerCase()) {
                throw Error("Guardian cannot be address 0.");
            }
            if (guardian.toLowerCase() === owner.toLowerCase()) {
                throw Error("Guardian cannot be the owner.");
            }
        }

        if (new Set(dupGuardians).size < dupGuardians.length) {
            throw Error("Duplicate guardians.");
        }

        dupGuardians.map((guardian) => {
            dupRecoveryOwners.map((recoveryOwner) => {
                if (guardian === recoveryOwner) {
                    throw Error("Recovery owner cannot be a guardian");
                }
            });
        });

        // We check that the signature is correct.
        this.verifySignature(owner, ownerSignature, maxFeePerGas, maxPriorityFeePerGas, gasLimit);
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

    async createWallet(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        gasLimit: BigNumberish,
        saltNumber: BigNumberish,
        relayer: Address
    ): Promise<FactoryTransaction> {
        if (!this.initialized) await this.init();
        const preComputedAddress = await this.preComputeAddress(owner, recoveryOwners, guardians, saltNumber);
        const hash = await this.getInitHash(maxFeePerGas, maxPriorityFeePerGas, gasLimit, preComputedAddress);
        const ownerSignature = await sign(this.signer, hash);
        // Checks the correctness of all the parameters.
        await this.checkParams(
            owner,
            recoveryOwners,
            guardians,
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit,
            saltNumber,
            relayer,
            ownerSignature
        );

        await this.verifyPayment(
            owner,
            recoveryOwners,
            guardians,
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit,
            saltNumber
        );

        const ssrInitData = initSSR(guardians, recoveryOwners);

        return {
            owner,
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit,
            relayer,
            ssrModule: this.ssrModule,
            laserVault: this.laserVault,
            ssrInitData,
            saltNumber,
            ownerSignature,
        };
    }

    /**
     * @dev Listens for the event 'ProxyCreation'.
     */
    async on(): Promise<void> {
        if (!this.initialized) await this.init();
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
     * @notice Any change will return a completely different address !!
     */
    async preComputeAddress(
        owner: Address,
        recoveryOwners: Address[],
        guardians: Address[],
        saltNumber: BigNumberish
    ): Promise<Address> {
        if (!this.initialized) await this.init();
        const initData = initSSR(guardians, recoveryOwners);
        return this.factory.preComputeAddress(owner, this.ssrModule, initData, saltNumber);
    }
}
