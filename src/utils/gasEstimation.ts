import { ethers, BigNumberish, BigNumber } from "ethers";
import { Provider } from "@ethersproject/providers";
import { LaserWallet } from "../typechain";
import { Transaction, Address } from "../types";

export async function getBaseFee(provider: Provider): Promise<BigNumber> {
    const latestBlock = await provider.getBlock("latest");
    const baseFeePerGas = latestBlock.baseFeePerGas;
    if (baseFeePerGas) {
        return baseFeePerGas;
    } else {
        throw Error("Could not get base fee per gas.");
    }
}

///@dev Estimates the amount of gas a Laser transaction will use.
export async function estimateLaserGas(wallet: LaserWallet, provider: Provider, tx: Transaction): Promise<BigNumber> {
    const tr = await wallet
        .connect(provider)
        .callStatic.simulateTransaction(
            tx.to,
            tx.value,
            tx.callData,
            tx.nonce,
            tx.maxFeePerGas,
            tx.maxPriorityFeePerGas,
            tx.gasLimit,
            tx.relayer,
            tx.signatures,
            {
                gasLimit: tx.gasLimit,
                from: ethers.constants.AddressZero,
            }
        );

    return tr.add(8500); // we add 8.5k as buffer.
}

type DeploymentCost = {
    wei: BigNumberish;
    eth: BigNumberish;
    gas: BigNumberish;
};
///@dev Calculates the approx. deployment costs for a wallet (in wei and gas).
export async function calculateDeploymentCost(
    provider: Provider,
    guardians: Address[],
    recoveryOwners: Address[]
): Promise<DeploymentCost> {
    ///@dev upper bound.
    const baseGas = 450000;

    const increment = 30000;

    const guardiansLength = guardians.length;
    const recoveryOwnersLength = recoveryOwners.length;

    const baseFee = await getBaseFee(provider);
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    const totalFee = BigNumber.from(baseFee).add(BigNumber.from(maxPriorityFeePerGas));

    if (guardiansLength === 1 && recoveryOwnersLength === 1) {
        return {
            wei: totalFee.mul(BigNumber.from(baseGas)),
            eth: ethers.utils.formatEther(totalFee.mul(BigNumber.from(baseGas))),
            gas: baseGas,
        };
    } else {
        const newStorageSlots = guardiansLength + recoveryOwnersLength - 2;

        const extraGas = BigNumber.from(increment).mul(newStorageSlots);
        const totalGas = extraGas.add(baseGas);

        return {
            wei: totalFee.mul(totalGas),
            eth: ethers.utils.formatEther(totalFee.mul(totalGas)),
            gas: totalGas,
        };
    }
}

///@dev Returns true if the wallet has enough funds to deploy or false if not.
export async function canWalletDeploy(
    provider: Provider,
    walletAddress: Address,
    guardians: Address[],
    recoveryOwners: Address[]
): Promise<boolean> {
    const walletBalance = await provider.getBalance(walletAddress);

    const { wei, gas } = await calculateDeploymentCost(provider, guardians, recoveryOwners);

    return walletBalance.gt(wei);
}

///@dev Verifies that the wallet has enough funds to pay for the tx.
export async function verifyWalletCanPayGas(
    provider: Provider,
    walletBalance: BigNumber,
    callGas: BigNumber,
    value: BigNumber
): Promise<any> {
    const feeData = await provider.getFeeData();
    const baseFee = await getBaseFee(provider);
    const maxPriorityFeePerGas = BigNumber.from(feeData.maxPriorityFeePerGas);

    // upper bound
    const gasPrice = baseFee.add(maxPriorityFeePerGas);
    const amountOfWei = gasPrice.mul(callGas);

    if (value.eq(0)) {
        if (walletBalance.lt(amountOfWei)) {
            throw Error("Insufficient balance, wallet can't pay fees.");
        }
    } else {
        const walletBalancePostTransfer = walletBalance.sub(value);
        if (walletBalancePostTransfer.lt(amountOfWei)) {
            throw Error("Insufficient balance, wallet can't pay fees.");
        }
    }
}
