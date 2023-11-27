const asyncHandler = require("express-async-handler");
const ApiError = require("./apiError");

function calculatePagination(page, limit, totalDocuments) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    return {
        startIndex,
        endIndex,
        hasPrevious: startIndex > 0,
        hasNext: endIndex < totalDocuments,
    };
}

module.exports.paginate = function (model, conditions = {}) {
    return asyncHandler(async (req, res, next) => {
        try {
			const totalDocuments = await model.countDocuments();
            const page = parseInt(req.query.page) || 1; // Default to page 1
            const limit = parseInt(req.query.limit) || totalDocuments;

				if (isNaN(page) || page < 1) {
				next(new ApiError.BadRequest('Page must be greater than 0'));
				}
			  if (isNaN(limit) || limit < 1) {
				next(new ApiError.BadRequest('Limit must be greater than 0'));
			  }
			  if(limit > totalDocuments){
				next(new ApiError.BadRequest(`Limit cannot be greater than total documents: ${totalDocuments}`));

			  }

            const { startIndex, endIndex, hasPrevious, hasNext } = calculatePagination(page, limit, totalDocuments);

            const sortBy = req.query.sortBy || '_id';
            const sortOrder = req.query.sortOrder && req.query.sortOrder.toLowerCase() === 'desc' ? -1 : 1;

            const result = {
                next: hasNext ? { page: page + 1, limit } : undefined,
                previous: hasPrevious ? { page: page - 1, limit } : undefined,
            };

            result.results = await model.find(conditions).sort({ [sortBy]: sortOrder }).limit(limit).skip(startIndex).exec();

            res.paginatedResult = result;
            next();
        } catch (e) {
            console.error(e.message);
            res.status(400).send(e.message);
        }
    });
};
