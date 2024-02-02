const cheerio = require("cheerio");
const axios = require("axios");

const ParseCurrencyExchange = async () => {
  try {
    const response = await axios.get(
      "https://www.exchangerates.org.uk/US-Dollar-USD-currency-table.html",
    );

    const $ = cheerio.load(response.data);

    // Find the table with the name "currencypage-mini"
    const currencyDiv = $(".css-panes");

    if (currencyDiv.length > 0) {
      // Find all tables with the name "currencypage-mini" within the div
      const tables = currencyDiv.find('table[class="currencypage-mini"]');

      // Check if any tables were found
      if (tables.length > 0) {
        tables.each((index, table) => {
          console.log($(table).html());
        });
      } else {
        console.log(
          "No tables with name 'currencypage-mini' found inside the div",
        );
      }
    } else {
      console.log("Div with class 'css-panes' not found");
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
