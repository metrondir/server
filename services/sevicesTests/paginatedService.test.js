const ApiError = require("../../middleware/apiError");
const { paginateArray } = require("../paginatedService");

test("paginateArray should return the correct paginated data", () => {
  const data = Array.from({ length: 100 }, (_, i) => i);
  const page = 1;
  const size = 10;
  const result = paginateArray(data, page, size);
  expect(result).toEqual({
    next: { page: 2, size: 90 },
    previous: undefined,
    totalItems: 100,
    totalPages: 10,
    results: Array.from({ length: 10 }, (_, i) => i),
  });
});

test("paginateArray should return the correct paginated data when the page is greater than the total number of pages", () => {
  const data = Array.from({ length: 100 }, (_, i) => i);
  const page = 100;
  const size = 10;
  const result = paginateArray(data, page, size);
  expect(result).toEqual({
    next: undefined,
    previous: { page: 99, size: 10 },
    totalItems: 100,
    totalPages: 10,
    results: [],
  });
});

test("paginateArray should return the correct paginated data when the page is less than 1", () => {
  const size = 10;
  const data = Array.from({ length: 100 }, (_, i) => i);
  const page = 0;
  const result = paginateArray(data, page, size);
  expect(result).toEqual(data);
});
test("paginateArray should return [] when the totalItems is less than 0", () => {
  const size = 10;
  const data = [];
  const page = 1;
  const result = paginateArray(data, page, size);
  expect(result).toEqual([]);
});

test("paginateArray should throw an error when the page is less than 1", () => {
  const size = 10;
  const data = Array.from({ length: 100 }, (_, i) => i);
  const page = -1;
  expect(() => paginateArray(data, page, size)).toThrow(
    ApiError.BadRequest("Page must be greater than 0"),
  );
});
test("paginateArray should throw an error when the limit is less than 1", () => {
  const size = -1;
  const data = Array.from({ length: 100 }, (_, i) => i);
  const page = 1;
  expect(() => paginateArray(data, page, size)).toThrow(
    ApiError.BadRequest("Limit must be greater than 0"),
  );
});
