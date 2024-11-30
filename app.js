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

        // Fetch movie details using OMDb API
        try {
            const apiKey = '89ae9603';
            const url = `https://www.omdbapi.com/?i=${movie.imdb_number}&apikey=${apiKey}`;
            const response = await axios.get(url);

            // Render the movie details page with OMDb data
            res.render('movie', { movie, details: response.data });
        } catch (error) {
            console.error(error);
            res.render('movie', { movie, details: null });
        }
    });
});

app.get('/search', async (req, res) => {
    const { query } = req.query;

    try {
        const apiKey = '89ae9603';
        const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${apiKey}`;
        const response = await axios.get(url);

        // Pass search results to a new EJS view
        res.render('search-results', { query, results: response.data.Search });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching search results');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});