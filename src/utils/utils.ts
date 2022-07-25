import { BigNumberish, utils, Contract, ethers } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address, Transaction, PackedSignatures } from "../types";
import { abi as SSRAbi } from "../deployments/localhost/LaserModuleSSR.json";
import { LaserHelper__factory } from "../typechain";

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

export async function simulateLaserTransaction(
    provider: Provider,
    walletAddress: Address,
    transaction: Transaction
): Promise<BigNumberish> {
    const walletForSimulation = LaserHelper__factory.connect(walletAddress, provider);

    try {
        return walletForSimulation.callStatic.simulateTransaction(
            walletAddress,
            transaction.to,
            transaction.value,
            transaction.callData,
            transaction.nonce,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.gasLimit,
            transaction.relayer,
            transaction.signatures,
            {
                from: ethers.constants.AddressZero,
                gasLimit: transaction.gasLimit,
                maxFeePerGas: transaction.maxFeePerGas,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
            }
        );
    } catch (e) {
        throw Error(`Error in transaction simulation: ${e}`);
    }
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
