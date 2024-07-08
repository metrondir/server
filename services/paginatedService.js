const ApiError = require("../middleware/apiError");

/**
 * @desc Calculate the pagination.
 * @param {number} page - The page number.
 * @param {number} size - The size of the page.
 * @param {number} totalItems - The total number of items.
 * @returns {Object} The pagination object.
 */
const calculatePagination = (page, size, totalItems) => {
  const startIndex = (page - 1) * size;
  const endIndex = page * size;

  const hasPrevious = page > 1;
  const hasNext = endIndex < totalItems;

  return { startIndex, endIndex, hasPrevious, hasNext };
};

/**
 * @desc Paginates an array of data.
 * @param {Array} data - The array of data to paginate.
 * @param {number} page - The page number.
 * @param {number} size - The size of the page.
 * @returns {Object} The paginated data.
 */
const paginateArray = (data, page, size) => {
  if (!size || !page) {
    return data;
  }
  const totalItems = data.length;
  const pageNumber = parseInt(page) || 1;
  const pageSize = parseInt(size) || totalItems;

  if (isNaN(pageNumber) || pageNumber < 1) {
    throw ApiError.BadRequest("Page must be greater than 0");
  }
  if (isNaN(pageSize) || pageSize < 1) {
    throw ApiError.BadRequest("Limit must be greater than 0");
  }

  if (totalItems <= 0) {
    return [];
  }
  const { startIndex, endIndex, hasPrevious, hasNext } = calculatePagination(
    pageNumber,
    pageSize,
    totalItems,
  );

  const result = {
    next: hasNext
      ? { page: pageNumber + 1, size: totalItems - pageSize * page }
      : undefined,
    previous: hasPrevious
      ? { page: pageNumber - 1, size: pageSize }
      : undefined,
    totalItems: totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };

  result.results = data.slice(startIndex, endIndex);

  return result;
};
module.exports = {
  paginateArray,
};
