import { BigNumberish, utils, Contract, ethers } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address, Transaction, PackedSignatures } from "../types";
import { abi as SSRAbi } from "../deployments/mainnet/LaserModuleSSR.json";
import { abi as walletAbi } from "../deployments/mainnet/LaserWallet.json";
import { abi as factoryAbi } from "../deployments/mainnet/LaserFactory.json";
import { LaserHelper__factory } from "../typechain";
import { FactoryTransaction } from "../sdk/LaserFactory";

export function encodeFunctionData(abi: any, funcName: string, ..._params: any[]): string {
    const params = _params[0];
    return new utils.Interface(abi).encodeFunctionData(funcName, params);
}

export function addressEq(address1: string, address2: string): boolean {
    if (address1.slice(0, 2).toLowerCase() !== "0x") {
        // We will give it a try.
        address1 = "0x" + address1;
    }
    if (address2.slice(0, 2).toLowerCase() !== "0x") {
        address2 = "0x" + address2;
    }
    return address1.toLowerCase() === address2.toLowerCase();
}

export function toWei(amount: BigNumberish): BigNumberish {
    return utils.parseEther(amount.toString());
}

export function toEth(amount: BigNumberish): BigNumberish {
    return utils.formatEther(amount);
}

export async function verifyAddress(provider: Provider, address: Address): Promise<Address> {
    if (address.includes(".")) {
        const result = await provider.resolveName(address);
        if (!result) throw Error("Invalid ENS.");
        else return result;
    } else if (address.length === 42) {
        return utils.getAddress(address);
    } else {
        throw Error("Invalid address.");
    }
}

export async function supports1271(provider: Provider, address: Address): Promise<boolean> {
    const abi = ["function supportsInterface(bytes4) external view returns (bool)"];
    try {
        const contractGuardian = new Contract(address, abi, provider);
        const result = await contractGuardian.supportsInterface("0xae029e0b");
        if (!result) throw Error("Error: address oes not support EIP1271");
    } catch (e) {
        throw Error("address does not support EIP1271.");
    }
    return true;
}

export async function isContract(provider: Provider, address: Address): Promise<boolean> {
    const code = await provider.getCode(address);

    return code.length > 2 ? true : false;
}

export function initSSR(guardians: Address[], recoveryOwners: Address[]): string {
    return encodeFunctionData(SSRAbi, "initSSR", [guardians, recoveryOwners]);
}

export async function getBaseFee(provider: Provider): Promise<BigNumberish> {
    const latestBlock = await provider.getBlock("latest");
    const baseFeePerGas = latestBlock.baseFeePerGas;
    if (baseFeePerGas) {
        return baseFeePerGas.toString();
    } else {
        throw Error("Could not get base fee per gas.");
    }
}

export function packSignatures(packedSigs: PackedSignatures): string {
    ///@todo Do the process automatic.
    if (packedSigs.signature1.length < 132) {
        throw Error("Invalid signature1 length");
    }

    if (packedSigs.signature2.length < 132) {
        throw Error("Invalid signature2 length");
    }

    return packedSigs.signature1 + packedSigs.signature2.slice(2);
}

export function encodeWalletData(txData: Transaction): string {
    return encodeFunctionData(walletAbi, "exec", [
        txData.to,
        txData.value,
        txData.callData,
        txData.nonce,
        txData.maxFeePerGas,
        txData.maxPriorityFeePerGas,
        txData.gasLimit,
        txData.relayer,
        txData.signatures,
    ]);
}

export function encodeFactoryData(txData: FactoryTransaction): string {
    return encodeFunctionData(factoryAbi, "deployProxyAndRefund", [
        txData.owner,
        txData.maxFeePerGas,
        txData.maxPriorityFeePerGas,
        txData.gasLimit,
        txData.relayer,
        txData.laserModule,
        txData.laserModuleData,
        txData.saltNumber,
        txData.ownerSignature,
    ]);
}

export function encodeModuleData(txData: Transaction): string {
    const LOCK = ethers.utils.keccak256("lock()");
    console.log(LOCK);
    return LOCK;
}
