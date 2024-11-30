const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Database setup
// const db = new sqlite3.Database('./database.db', (err) => {
//     if (err) console.error(err.message);
//     console.log('Connected to the SQLite database.');
// });

const db = new sqlite3.Database('./data/database.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Create Movies Table
db.run(`
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        format TEXT,
        release_year INTEGER,
        label TEXT,
        imdb_number TEXT
    )
`);

// Routes
app.get('/', (req, res) => {
    db.all('SELECT * FROM movies', (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.render('index', { movies: rows });
    });
});

app.post('/add', (req, res) => {
    const { title, format, release_year, label, imdb_number } = req.body;
    db.run(
        `INSERT INTO movies (title, format, release_year, label, imdb_number) VALUES (?, ?, ?, ?, ?)`,
        [title, format, release_year, label, imdb_number],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/');
        }
    );
});

app.get('/movie/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM movies WHERE id = ?', [id], async (err, movie) => {
        if (err) return res.status(500).send(err.message);
        if (!movie) return res.status(404).send('Movie not found');

        // Fetch additional data from IMDb API
        try {
            const apiKey = 'your_imdb_api_key'; // Replace with actual API key
            const response = await axios.get(
                `https://www.omdbapi.com/?i=${movie.imdb_number}&apikey=${apiKey}`
            );
            res.render('movie', { movie, details: response.data });
        } catch (error) {
            console.error(error);
            res.render('movie', { movie, details: null });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});