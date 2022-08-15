import { ethers, BigNumber } from "ethers";
import { LaserFactory } from "../src/sdk/LaserFactory";
import { Laser } from "../src/sdk/Laser";
import { encodeFactoryData, calculateDeploymentCost, estimateLaserGas, encodeWalletData } from "../src/utils";
import { LaserFactory as Factory, LaserFactory__factory, LaserWallet__factory } from "../src/typechain";

const url = "http://127.0.0.1:8545/";

const provider = new ethers.providers.JsonRpcProvider(url);

const acc0 = new ethers.Wallet("0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd", provider);

const factory = new LaserFactory(provider, acc0);
const saltNumber = 1231;

const LASER = "0x5e89769bD1eAa07D884254Eb2954885a89016E32";
async function deploy() {
    const owner = acc0.address;
    const recoveryOwners = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];
    const guardians = [
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
    ];

    const addr = await factory.preComputeAddress(owner, recoveryOwners, guardians, saltNumber);

    await acc0.sendTransaction({
        to: addr,
        value: ethers.utils.parseEther("100"),
    });

    const tx = await factory.createWallet(
        owner,
        recoveryOwners,
        guardians,
        100000000,
        1000000,
        1000000,
        saltNumber,
        owner
    );

    const encodedData = encodeFactoryData(tx);
    const calculation = await calculateDeploymentCost(provider, guardians, recoveryOwners);
    console.log("gas usage -->", calculation.gas.toString());
    const f = LaserFactory__factory.connect(await factory.getAddress(), acc0.connect(provider));

    const result = await f.deployProxyAndRefund(
        tx.owner,
        tx.maxFeePerGas,
        tx.maxPriorityFeePerGas,
        tx.gasLimit,
        tx.relayer,
        tx.ssrModule,
        tx.laserVault,
        tx.ssrInitData,
        tx.saltNumber.toString(),
        tx.ownerSignature,
        { gasLimit: tx.gasLimit }
    );

    const receipt = await result.wait();

    // get the address of the emited event
    const event = receipt.events![0];
    console.log(event.args?.proxy);
}

deploy();

async function view() {
    const laser = new Laser(provider, acc0, LASER);
    await laser.init();

    const walletState = await laser.getWalletState();
    console.log("bal -->", walletState.balance.toString());
    console.log(walletState);
}

const addRecoveryOwner = async () => {
    const laser = new Laser(provider, acc0, LASER);
    await laser.init();

    const wallet = LaserWallet__factory.connect(laser.wallet.address, acc0);
    const newRO = ethers.Wallet.createRandom().address;

    const txInfo = {
        maxFeePerGas: 1000000000,
        maxPriorityFeePerGas: 1000000000,
        gasLimit: 100000,
        relayer: acc0.address,
    };
    const tr = await laser.addRecoveryOwner(newRO, txInfo);

    const data = encodeWalletData(tr);

    await wallet.exec(
        tr.to,
        tr.value,
        tr.callData,
        tr.nonce,
        tr.maxFeePerGas,
        tr.maxPriorityFeePerGas,
        tr.gasLimit,
        tr.relayer,
        tr.signatures,
        { gasLimit: 300000 }
    );
};

async function sendEth(): Promise<any> {
    const to = "0x7681C78fb672024C8ACce686cc9A7Acf7F07640d";
    const laser = new Laser(provider, acc0, LASER);
    await laser.init();

    const wallet = LaserWallet__factory.connect(laser.wallet.address, acc0);
    const newRO = ethers.Wallet.createRandom().address;

    const txInfo = {
        maxFeePerGas: 1000000000,
        maxPriorityFeePerGas: 1000000000,
        gasLimit: 300000,
        relayer: acc0.address,
    };

    const tr = await laser.sendEth(to, 1, txInfo);

    await wallet.exec(
        tr.to,
        tr.value,
        tr.callData,
        tr.nonce,
        tr.maxFeePerGas,
        tr.maxPriorityFeePerGas,
        tr.gasLimit,
        tr.relayer,
        tr.signatures,
        { gasLimit: 300000 }
    );
}

async function addTokensToVault(): Promise<any> {
    const laser = new Laser(provider, acc0, "0xbc8D84315491191Fc46109C71A04C5A355c66939");
    await laser.init();

    const wallet = LaserWallet__factory.connect(laser.wallet.address, acc0);

    const txInfo = {
        maxFeePerGas: 1000000000,
        maxPriorityFeePerGas: 1000000000,
        gasLimit: 300000,
        relayer: acc0.address,
    };
    const tokenAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
    const res = await laser.getTokensInVault(tokenAddress);
    console.log(res.toString());
    const tr = await laser.addTokensToVault(tokenAddress, 0.1, txInfo);

    await wallet.exec(
        tr.to,
        tr.value,
        tr.callData,
        tr.nonce,
        tr.maxFeePerGas,
        tr.maxPriorityFeePerGas,
        tr.gasLimit,
        tr.relayer,
        tr.signatures,
        { gasLimit: 300000 }
    );
}
