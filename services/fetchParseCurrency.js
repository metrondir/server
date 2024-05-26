const cheerio = require("cheerio");
const axios = require("axios");
const CurrencyModel = require("../models/curencyModel");

const parseCurrencyExchange = async () => {
  try {
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
        try {
          const result = await CurrencyModel.bulkWrite(updateOperations);
        } catch (error) {
          throw ApiError.BadRequest("Error updating currency exchange rates");
        }
      } else {
        console.log("No updates found");
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
    throw ApiError.BadRequest("Error fetching data");
  }
};

module.exports = { parseCurrencyExchange };
