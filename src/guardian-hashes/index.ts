import { utils, BigNumber } from "ethers";
import { Address } from "../types";

/// @dev Returns the hash to be signed by a guardian to remove
///      tokens from the vault.
export function removeTokensFromVaultHash(
    tokenAddress: Address,
    amount: BigNumber,
    chainId: number,
    walletAddress: Address,
    walletNonce: number
): string {
    const dataHash = utils.solidityKeccak256(
        ["address", "uint256", "uint256", "address", "uint256"],
        [tokenAddress, amount, chainId, walletAddress, walletNonce]
    );
    return dataHash;
}
