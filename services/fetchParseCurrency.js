const cheerio = require("cheerio");
const axios = require("axios");
const CurrencyModel = require("../models/curencyModel");
const cron = require("node-cron");

const ParseCurrencyExchange = async () => {
  try {
    const response = await axios.get(
      "https://www.exchangerates.org.uk/US-Dollar-USD-currency-table.html",
    );

    const $ = cheerio.load(response.data);

    const currencyDiv = $(".css-panes");

    if (currencyDiv.length > 0) {
      const tables = currencyDiv.find('table[class="currencypage-mini"]');

      if (tables.length > 0) {
        const updateOperations = [];

        tables.each(async (tableIndex, table) => {
          const $table = $(table);

          const rows = $table.find('tr[class^="col"]');

          rows.each(async (rowIndex, row) => {
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
            console.log(result);
            console.log("Currency updates complete!");
          } catch (error) {
            throw new Error(error);
          }
        } else {
          console.log("No updates found");
        }
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
    throw new Error(error);
  }
};
cron.schedule("0 0 * * *", async () => {
  console.log("Running currency update...");
  await ParseCurrencyExchange();
});

module.exports = { ParseCurrencyExchange };
