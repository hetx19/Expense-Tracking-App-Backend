const AppError = require("../utils/AppError");

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const errorMessage =
        firstIssue && firstIssue.message ? firstIssue.message : "Invalid input";

      const details = result.error.issues.map((issue) => ({
        field: (issue.path || []).join("."),
        message: issue.message || "Invalid input",
      }));

      return next(new AppError(errorMessage, 400, details));
    }

    req[source] = result.data;
    next();
  };
};

module.exports = validate;
