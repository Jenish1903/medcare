const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const hospitalshopRoutes = require("./routes/hospitalShopRoutes");
const productRoutes = require("./routes/ProductRoutes");
const cartRoutes = require("./routes/cartRoutes");
const hospitalProductRoutes = require("./routes/hospitalProductRoutes");
// const doctorRoutes = require("./routes/doctorRoutes");
const serviceRoutes = require('./routes/serviceRoutes');

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.use("/api/v1/auth", authRoutes);
app.use('/api/healthshop', hospitalshopRoutes);
// app.use('/api/v1/chat', doctorRoutes);
app.use('/api/services', serviceRoutes);
// app.use("/api/healthstore", hospitalshopRoutes);
// app.use('/api/cart', cartRoutes);
// app.use("/api/hospital-product", hospitalProductRoutes);
// app.use("/api/medications", require("./routes/medicationRoutes"));


const PORT = process.env.PORT || 5000; 
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
