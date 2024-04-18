const { decryptInfo } = require("./decryptInfo");

describe("decryptInfo", () => {
  it("should decrypt the encrypted data correctly", () => {
    const decryptedData = decryptInfo("c925d0c569b425eedccbaef5844c4616");
    expect(decryptedData).toEqual("Hello, world!");
  });
});
