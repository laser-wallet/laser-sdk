import { BigNumberish, utils, Contract, ethers, BigNumber } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Address } from "../types";
import { abi as walletAbi } from "../deployments/localhost/LaserWallet.json";
import { abi as factoryAbi } from "../deployments/localhost/LaserFactory.json";
import { LaserHelper__factory } from "../typechain";

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
