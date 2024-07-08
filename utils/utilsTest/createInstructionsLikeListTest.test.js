const { createInstructionsHTML } = require("../createInstructionsLikeList");

test("createInstructionsHTML should return the correct HTML string for multiple instructions", () => {
  const instructionsString =
    "Step 1: Preheat the oven.  Step 2: Mix the ingredients.  Step 3: Pour the mixture into a baking dish.  Step 4: Bake for 30 minutes.";
  const expectedHTML =
    "<ol><li>Step 1: Preheat the oven.</li><li>Step 2: Mix the ingredients.</li><li>Step 3: Pour the mixture into a baking dish.</li><li>Step 4: Bake for 30 minutes.</li></ol>";

  const result = createInstructionsHTML(instructionsString);

  expect(result).toBe(expectedHTML);
});
