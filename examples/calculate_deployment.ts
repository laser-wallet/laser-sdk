import { ethers } from "ethers";
import { calculateDeploymentCost, canWalletDeploy } from "../src/utils";

require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`);

async function calculateDeployment(): Promise<void> {
    const guardians = createGuardians(1);
    const recoveryOwners = createRecoveryOwners(1);

    const result = await calculateDeploymentCost(provider, guardians, recoveryOwners);
    console.log(result);
}

calculateDeployment();

function createGuardians(amount: number): string[] {
    const guardians: string[] = [];

    for (let i = 0; i < amount; i++) {
        const newGuardian = ethers.Wallet.createRandom().address;
        guardians.push(newGuardian);
    }
    return guardians;
}

function createRecoveryOwners(amount: number): string[] {
    const recoveryOwners: string[] = [];

    for (let i = 0; i < amount; i++) {
        const newGuardian = ethers.Wallet.createRandom().address;
        recoveryOwners.push(newGuardian);
    }
    return recoveryOwners;
}
