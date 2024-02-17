const cheerio = require("cheerio");
const axios = require("axios");
const CurrencyModel = require("../models/curencyModel");
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
        tables.each((index, table) => {
          const $table = $(table);
          console.log($table.html());
          const relevantTds = $table.find(
            "td:has(span:not(.flag.us)), td:has(b)",
          );

          if (relevantTds.length > 0) {
            relevantTds.each((index, td) => {
              const $td = $(td);

              // Check if it has a flag with class "wf"
              const wfFlag = $td.find(".flag");

              if (wfFlag.length > 0) {
                // Extract values
                const lanClass = wfFlag.attr("class");
                const lan = lanClass ? lanClass.split(" ")[1] : undefined;

                // Use regular expression to extract numeric values from <b> tags
                const numericValues = wfFlag
                  .find("b")
                  .map(function () {
                    const text = $(this).text().trim();
                    const numericValue = parseFloat(text);
                    return isNaN(numericValue) ? 0 : numericValue;
                  })
                  .get();
                const pricePerDollar =
                  numericValues.length > 0 ? numericValues[0] : 0;

                // Use the values as needed (for example, log or set to a database)
                console.log(`lan: ${lan}, pricePerDollar: ${pricePerDollar}`);
              }
            });
          }
        });
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
};

// Create an async function and call ParseCurrencyExchange
const test = async () => {
  await ParseCurrencyExchange();
  console.log("Test completed.");
};

// Call the test function
test();

module.exports = { ParseCurrencyExchange };
