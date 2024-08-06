const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    const { fullname, email, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (fullname, email, username, password) VALUES (?, ?, ?, ?)',
        [fullname, email, username, hashedPassword], (err) => {
            if (err) {
                return res.status(500).json({ message: 'User creation failed', error: err });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.userid }, process.env.JWT_SECRET); // Use an environment variable for production
        res.json({ token, userId: user.userid }); // Return userId for further requests
    });
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // Store the user information decoded from the token
        next();
    });
};

// Get all transactions for the authenticated user, including total expense calculation
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        // Fetch transactions
        const [transactions] = await db.promise().query('SELECT date, amount, description, category FROM transactions WHERE userid = ?', [req.user.id]);

        // Calculate total expenses
        const [expenseResult] = await db.promise().query('SELECT SUM(amount) AS totalExpenses FROM transactions WHERE userid = ?', [req.user.id]);
        const totalExpenses = expenseResult[0].totalExpenses || 0;

        // Combine transactions and total expenses in the response
        res.json({ transactions, totalExpenses });
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred', error: err });
    }
});

// Create a new transaction associated with the logged-in user
app.post('/api/transactions', authenticateToken, (req, res) => {
    const { amount, description, category } = req.body;

    // Validate the input
    if (!amount || !description || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const date = new Date();

    // Insert the transaction with the user ID
    db.query('INSERT INTO transactions (amount, description, category, date, userid) VALUES (?, ?, ?, ?, ?)',
    [amount, description, category, date, req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Transaction creation failed', error: err });
        }
        res.status(201).json({ message: 'Transaction created successfully' });
    });
});

// Delete a transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM transactions WHERE id = ? AND userid = ?', [req.params.id, req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'An error occurred', error: err });
        if (results.affectedRows === 0) { // No rows affected means no such transaction found
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    });
});


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running successfully on port ${PORT}`);
});

module.exports = app;
