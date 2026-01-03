// Configure Enviroment Variables
require("dotenv").config();
const app = require("./app");
const connectDb = require("./config/db");

connectDb();

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server is successfully listing at http://localhost:${port}`);
});
