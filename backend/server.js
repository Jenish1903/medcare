const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const hospitalshopRoutes = require("./routes/hospitalShopRoutes");
const serviceRoutes = require('./routes/serviceRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const articleModel = require("./models/articleModel");

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.use("/api/v1/auth", authRoutes);
app.use('/api/healthshop', hospitalshopRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/v1/chat', doctorRoutes);
app.use('/api', articleModel);

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
