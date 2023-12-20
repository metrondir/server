const convertFieldsToBooleans = (fields) => {
	return (req, res, next) => {
	  fields.forEach(field => {
		 if (req.body[field] === field) {
			req.body[field] = true;
		 } else {
			req.body[field] = false;
		 }
	  });
	  next();
	};
 };

 module.exports = convertFieldsToBooleans;