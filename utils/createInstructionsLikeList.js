/**
 * @desc Create an HTML list from a string of instructions.
 * @param {string} instructionsString - The string of instructions.
 * @returns {string} The HTML list of instructions.
 */
const createInstructionsHTML = (instructionsString) => {
  const instructionsArray = instructionsString.split(/\s{2,}/);
  let htmlString = "<ol>";

  for (const instruction of instructionsArray) {
    if (instruction.trim() !== "") {
      htmlString += `<li>${instruction.trim()}</li>`;
    }
  }

  htmlString += "</ol>";
  return htmlString;
};

module.exports = { createInstructionsHTML };
