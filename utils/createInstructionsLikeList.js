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

/**
 * @desc Create an HTML list from a string of instructions.
 * @param {string} instructionsString - The string of instructions.
 * @returns {string} The HTML list of instructions.
 */
const refactorInstructionbyHTML = (instructionsString) => {
  console.log(instructionsString);
  if (!instructionsString) return "";
  if (typeof instructionsString !== "string") return "";
  if (instructionsString.includes("<ol>")) return instructionsString;
  if (instructionsString.includes("\n")) {
    const instructionsArray = instructionsString.split(/\n/);
    let htmlString = "<ol>";

    for (const instruction of instructionsArray) {
      if (instruction.trim() !== "") {
        htmlString += `<li>${instruction.trim()}</li>`;
      }
    }

    htmlString += "</ol>";

    return htmlString;
  }
  if (instructionsString.includes("<p>")) {
    const instructionsArray = instructionsString.split(/<\/p>/);
    let htmlString = "<ol>";

    for (const instruction of instructionsArray) {
      if (instruction.trim() !== "") {
        htmlString += `<li>${instruction.trim()}</li>`;
      }
    }

    htmlString += "</ol>";
    return htmlString;
  }
  if (instructionsString.includes("<br>")) {
    const instructionsArray = instructionsString.split(/<br>/);
    let htmlString = "<ol>";

    for (const instruction of instructionsArray) {
      if (instruction.trim() !== "") {
        htmlString += `<li>${instruction.trim()}</li>`;
      }
    }

    htmlString += "</ol>";
    return htmlString;
  }
  const instructionsArray = instructionsString.split(".");
  let htmlString = "<ol>";

  for (const instruction of instructionsArray) {
    if (instruction.trim() !== "") {
      htmlString += `<li>${instruction.trim()}</li>`;
    }
  }

  htmlString += "</ol>";
  return htmlString;
};
module.exports = { createInstructionsHTML, refactorInstructionbyHTML };
