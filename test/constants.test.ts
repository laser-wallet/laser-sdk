// import { ZERO, MAGIC_VALUE, SALT } from "../src/constants/constants";
// import { expect } from "chai";
// import { ethers } from "ethers";

// const salt = 1111;

// describe("Constants", () => {
//     it("should be the zero address", () => {
//         // 20 bytes.
//         const zero = "0x0000000000000000000000000000000000000000";
//         expect(ZERO).to.equal(zero);
//     });

//     it("should have correct magic value", async () => {
//         const hash = ethers.utils.keccak256(
//             ethers.utils.toUtf8Bytes("isValidSignature(bytes32,bytes)")
//         );
//         const magicValue = hash.slice(0, 10);
//         expect(magicValue).to.equal(MAGIC_VALUE);
//     });

//     it("should have correct salt", async () => {
//         expect(salt).to.equal(SALT);
//     });
// });
