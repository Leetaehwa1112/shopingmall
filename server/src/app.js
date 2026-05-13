const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // 프론트엔드 주소
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
// app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use(errorHandler);

module.exports = app;
