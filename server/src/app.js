const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
// app.use('/api/products', require('./routes/productRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use(errorHandler);

module.exports = app;
