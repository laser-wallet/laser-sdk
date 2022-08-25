import { ethers, Wallet, BigNumber, BigNumberish } from "ethers";
import { Domain, Address, types, Transaction, LaserTypes, RecoveryTransaction } from "../types";
import { LaserWallet } from "../typechain";
import { verifyPackedSignatures } from "./verifiers";

export async function signTypedData(signer: Wallet, domain: Domain, transaction: Transaction): Promise<string> {
    const laserTypes: LaserTypes = {
        to: transaction.to,
        value: transaction.value,
        callData: transaction.callData,
        nonce: transaction.nonce,
    };
    const signature = await signer._signTypedData(domain, types, laserTypes);
    return signature;
}

export async function sign(signer: Wallet, hash: string): Promise<string> {
    const toSignHash = ethers.utils.arrayify(hash);
    const signature = (await signer.signMessage(toSignHash)).replace(/1b$/, "1f").replace(/1c$/, "20");
    return signature;
}

export type LaserTransaction = Transaction | RecoveryTransaction;

/**
 * Bundles 2 transactions into one so it can be sent to a Laser wallet.
 */
export function bundleTransactions(tr1: LaserTransaction, tr2: LaserTransaction): LaserTransaction {
    verifyPackedSignatures(tr1, tr2);

    if ("value" in tr1) {
        // Normal transaction.
        // It can only be the owner + recovery owner or owner + guardian.
        return {
            to: tr1.to,
            value: tr1.value,
            callData: tr1.callData,
            nonce: tr1.nonce,
            signatures:
                tr1.signer === "owner"
                    ? tr1.signatures + tr2.signatures.slice(2)
                    : tr2.signatures + tr1.signatures.slice(2),
        };
    } else {
        // If it is a recovery transaction, only a recovery owner + guardian or recovery owner
        // + recovery owner can send the transaction.
        let sigs: string;
        if (tr1.signer === "owner") {
            sigs = tr1.signatures + tr2.signatures.slice(2);
        } else if (tr2.signer === "owner") {
            sigs = tr2.signatures + tr1.signatures.slice(2);
        } else {
            sigs =
                tr1.signer === "recoveryOwner"
                    ? tr1.signatures + tr2.signatures.slice(2)
                    : tr2.signatures + tr1.signatures.slice(2);
        }
        return {
            nonce: tr1.nonce,
            callData: tr1.callData,
            signatures: sigs,
        };
    }
}
