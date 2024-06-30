const ApiError = require("../middleware/apiError");
const calculatePagination = (page, size, totalItems) => {
  const startIndex = (page - 1) * size;
  const endIndex = page * size;

  const hasPrevious = page > 1;
  const hasNext = endIndex < totalItems;

  return { startIndex, endIndex, hasPrevious, hasNext };
};

const paginateArray = (data, page, size) => {
  try {
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
  } catch (error) {
    console.log(error);
    throw ApiError.BadRequest(error);
  }
};
module.exports = {
  paginateArray,
};
