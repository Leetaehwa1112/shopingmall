const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // 프론트엔드 주소
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/stats',    require('./routes/stats'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/order'));
app.use('/api/products', require('./routes/product'));
app.use('/api/packs',    require('./routes/pack'));
app.use('/api/auctions', require('./routes/auction'));
app.use('/api/users',    require('./routes/user'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use(errorHandler);

module.exports = app;
