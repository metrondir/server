const mongoose = require("mongoose");

const CurrencyModel = new mongoose.Schema({
  lan: {
    type: String,
    require: true,
  },
  pricePerDollar: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("CurrencyModel", CurrencyModel);
