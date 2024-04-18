const crypto = require("crypto");

const decryptInfo = (encryptedData) => {
  const algorithm = "aes-256-cbc";
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(process.env.KEY_ENCRYPTION, "hex"),
    Buffer.from(process.env.IV_ENCRYPTION, "hex"),
  );

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = {
  decryptInfo,
};
