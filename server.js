const env = require("./config/env");
const app = require("./app");
const connectDb = require("./config/db");

connectDb();

const port = env.PORT;
app.listen(port, () => {
  console.log(`Server is successfully listing at http://localhost:${port}`);
});
