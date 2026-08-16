const dashboardService = require("../services/dashboard.service");
const asyncHandler = require("../utils/asyncHandler");

const getDashboardData = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardData(req.user._id);
  res.json(data);
});

module.exports = getDashboardData;
