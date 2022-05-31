import { ethers, Contract, utils } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { Provider } from "@ethersproject/providers";
import axios from "axios";
import { Address, Numberish, Domain, UserOperation } from "./types";
import { ZERO, MAGIC_VALUE } from "./constants/constants";
import { checksum } from "./utils";
import { abi } from "./abis/LaserWallet.json";

/**
 * @dev Interacts with a Laser Wallet.
 */
export class Laser {
    readonly provider: Provider;
    readonly signer: Wallet;
    readonly contract: Contract; // The actual wallet.
    readonly abi = abi;
    readonly aaUrl: string;

    /**
     *
     * @param providerUrl RPC url to have a connection with a node (INFURA, ALCHEMY).
     * @param _signer The owner of the wallet (the encrypted keypair on the mobile).
     * @param contractAddress The address of the wallet.
     * @param aaUrl Url connection to send the UserOperation struct.
     */
    constructor(providerUrl: string, _signer: Wallet, contractAddress: string, aaUrl: string) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.signer = _signer;
        this.contract = new Contract(contractAddress, abi, this.signer.connect(this.provider));
        this.aaUrl = aaUrl;
    }

    /**
     * @returns True if the address is a contract, false if it is an EOA.
     */
    async isContract(_address: string): Promise<boolean> {
        const address = checksum(_address);
        const code = await this.provider.getCode(address);
        return code.length > 2 ? true : false;
    }
    /**
     * @returns the current version of the wallet.
     */
    async getVersion(): Promise<Numberish> {
        return await this.contract.VERSION();
    }

    /**
     * @returns the nonce of the  wallet.
     */
    async getNonce(): Promise<string> {
        return (await this.contract.nonce()).toString();
    }

    /**
     * @returns the network id that the wallet is connected to.
     */
    async getNetworkId(): Promise<string> {
        return (await this.contract.getChainId()).toString();
    }

    /**
     *
     * @returns The domain for EIP712 signature scheme.
     */
    async getDomain(): Promise<Domain> {
        return {
            chainId: await this.getNetworkId(),
            verifyingContract: this.contract.address,
        };
    }

    /**
     * @returns the address of the  wallet.
     */
    getContractAddress(): Address {
        return this.contract.address;
    }

    /**
     * @returns The address of the owner.
     */
    async getOwner(): Promise<Address> {
        return await this.contract.owner();
    }

    /**
     * @param _address  Address to check if it is an owner of the current wallet.
     * @returns true if owner, false if not.
     */
    async isOwner(_address: string): Promise<boolean> {
        const address = checksum(_address);
        const owner = await this.getOwner();
        return address.toLowerCase() === owner.toLowerCase();
    }

    /**
     * @returns The balance in ETH of the wallet.
     */
    async getBalanceInEth(): Promise<Numberish> {
        return ethers.utils
            .formatEther(await this.provider.getBalance(this.contract.address))
            .toString();
    }

    /**
     * @returns The balance in WEI of the wallet.
     */
    async getBalanceInWei(): Promise<Numberish> {
        return (await this.provider.getBalance(this.contract.address)).toString();
    }

    /**
     * @returns The entry point of the wallet.
     */
    async getEntryPoint(): Promise<Address> {
        return await this.contract.entryPoint();
    }

    /**
     * @returns Boolean if an address is a Laser wallet.
     * COMMENT: It is trivially easy to bypass this, this is just for the guardians.
     */
    async isLaser(_address: Address): Promise<boolean> {
        const address = checksum(_address);
        const _abi = ["function supportsInterface(bytes4) external view returns (bool)"];
        const targetAddress = new ethers.Contract(address, _abi, this.provider);
        if (!(await this.isContract(address))) {
            throw Error("Address is not a contract.");
        }
        // Laser Wallet contract: bytes4(keccak256("I_AM_LASER"))
        const interfaceId = "0xae029e0b";
        try {
            return await targetAddress.supportsInterface(interfaceId);
        } catch (e) {
            throw Error(`Address probably not a Laser wallet: ${e}`);
        }
    }
    /**
     * @param hash that was signed by the owners.
     * @param signatures of the message.
     * @returns true if the signature is valid for the wallet.
     */
    async isValidSignature(hash: string, signatures: string): Promise<boolean> {
        try {
            const res = await this.contract.isValidSignature(hash, signatures);
            return res.toLowerCase() === MAGIC_VALUE.toLowerCase();
        } catch (e) {
            throw Error(`Error in isValidSignature, probably not valid: ${e}`);
        }
    }

    /**
     * @dev Encodes data.
     * @param funcName The name of the function.
     * @param _params The parameters inside of an array. Empty array if there are no params.
     * @returns Encoded data payload.
     */
    encodeFunctionData(funcName: string, ..._params: any[]): string {
        const params = _params[0];
        return new ethers.utils.Interface(this.abi).encodeFunctionData(funcName, params);
    }

    /**
     * @dev Returns the user operation hash to be signed by owners.
     * @param userOp The UserOperation struct.
     */
    async userOperationHash(userOp: UserOperation): Promise<string> {
        return await this.contract.userOperationHash(userOp);
    }

    /**
     * @dev Data payload to change the owner.
     * @param _newOwner New owner.
     */
    async changeOwnerData(_newOwner: Address): Promise<string> {
        const newOwner = checksum(_newOwner);
        const currentOwner = await this.getOwner();
        if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
            throw Error("New owner cannot be current owner.");
        }
        if (await this.isContract(newOwner)) {
            throw Error("Owner cannot be a contract.");
        }
        return this.encodeFunctionData("changeOwner", [_newOwner]);
    }
}




