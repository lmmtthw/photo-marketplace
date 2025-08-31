require('dotenv').config();
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const connectDB = require('./config/db');


const app = express();


app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
secret: process.env.SESSION_SECRET,
resave: false,
saveUninitialized: false,
cookie: { httpOnly: true, sameSite: 'lax' },
store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions' })
}));


// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));


// Static
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res) => { res.status(404).send('Not found'); });


(async () => {
await connectDB(process.env.MONGODB_URI);
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 http://localhost:${port}`));
})();