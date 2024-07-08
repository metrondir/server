const cheerio = require("cheerio");
const axios = require("axios");
const CurrencyModel = require("../models/curencyModel");
const ApiError = require("../middleware/apiError");

/**
 * @desc Fetches and parses the currency exchange rates.
 * @returns {Object} The result of the query.
 */
const parseCurrencyExchange = async () => {
  const response = await axios.get(
    "https://www.exchangerates.org.uk/US-Dollar-USD-currency-table.html",
  );
  const $ = cheerio.load(response.data);

  const currencyTables = $(".css-panes table.currencypage-mini");

  if (currencyTables.length > 0) {
    const updateOperations = [];

    currencyTables.each((tableIndex, table) => {
      const rows = $(table).find('tr[class^="col"]');

      rows.each((rowIndex, row) => {
        const $row = $(row);
        const flag = $row.find(".flag:not(.us)");
        const country = flag.attr("class").split(" ")[1];
        const exchangeRate = parseFloat($row.find("td b").text().trim());

        const updateOperation = {
          updateOne: {
            filter: { lan: country },
            update: { pricePerDollar: exchangeRate },
          },
        };

        updateOperations.push(updateOperation);

        console.log(`Updating ${country} - Exchange Rate: ${exchangeRate}`);
      });
    });

    if (updateOperations.length > 0) {
      await CurrencyModel.bulkWrite(updateOperations);
    }
  }
};

module.exports = { parseCurrencyExchange };
