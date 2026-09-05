const sendSuccess = (res, statusCode = 200, data = null, meta = null) => {
  const response = { success: true };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  if (meta !== null && meta !== undefined) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
};
