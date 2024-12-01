const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // To handle environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Static file serving for Bootstrap and Font Awesome
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/fa', express.static(path.join(__dirname, 'node_modules/@fontawesome/fontawesome-free')));

// Database setup
const dbPath = process.env.DB_PATH || './data/database.db';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Failed to connect to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Create or upgrade Movies Table
db.serialize(() => {
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

    db.run(`ALTER TABLE movies ADD COLUMN packaging TEXT`, (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding packaging column:", err.message);
        }
    });

    db.run(`ALTER TABLE movies ADD COLUMN slipcover INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding slipcover column:", err.message);
        }
    });
});

// Routes
// Home route to list all movies with poster URLs
app.get('/', async (req, res) => {
    db.all('SELECT * FROM movies', async (err, rows) => {
        if (err) return res.status(500).send(err.message);

        try {
            const moviesWithPosters = await Promise.all(
                rows.map(async (movie) => {
                    try {
                        const apiKey = process.env.OMDB_API_KEY || '89ae9603';
                        const response = await axios.get(`https://www.omdbapi.com/?i=${movie.imdb_number}&apikey=${apiKey}`);
                        movie.poster = response.data.Poster !== "N/A" ? response.data.Poster : null;
                    } catch (error) {
                        console.error(`Error fetching poster for ${movie.title}:`, error.message);
                        movie.poster = null;
                    }
                    return movie;
                })
            );
            res.render('index', { movies: moviesWithPosters });
        } catch (error) {
            console.error('Error fetching posters:', error.message);
            res.render('index', { movies: rows });
        }
    });
});

// Add movie route
app.post('/add', (req, res) => {
    const { title, format, release_year, label, imdb_number, packaging, slipcover } = req.body;
    const slipcoverValue = slipcover === 'on' ? 1 : 0;
    db.run(
        `INSERT INTO movies (title, format, release_year, label, imdb_number, packaging, slipcover) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, format, release_year, label, imdb_number, packaging, slipcoverValue],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/');
        }
    );
});

// View individual movie route
app.get('/movie/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM movies WHERE id = ?', [id], async (err, movie) => {
        if (err) return res.status(500).send(err.message);
        if (!movie) return res.status(404).send('Movie not found');

        // Fetch movie details using OMDb API
        try {
            const apiKey = process.env.OMDB_API_KEY || '89ae9603';
            const url = `https://www.omdbapi.com/?i=${movie.imdb_number}&apikey=${apiKey}`;
            const response = await axios.get(url);

            res.render('movie', { movie, details: response.data });
        } catch (error) {
            console.error(error);
            res.render('movie', { movie, details: null });
        }
    });
});

// Search OMDb route
app.get('/search', async (req, res) => {
    const { query } = req.query;

    try {
        const apiKey = process.env.OMDB_API_KEY || '89ae9603';
        const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${apiKey}`;
        const response = await axios.get(url);

        if (response.data.Response === 'False') {
            return res.render('search-results', { query, results: [], error: 'No results found' });
        }

        res.render('search-results', { query, results: response.data.Search, error: null });
    } catch (error) {
        console.error(error);
        res.render('search-results', { query, results: [], error: 'Error fetching search results' });
    }
});

// Edit movie form route
app.get('/movie/:id/edit', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM movies WHERE id = ?', [id], (err, movie) => {
        if (err) return res.status(500).send(err.message);
        if (!movie) return res.status(404).send('Movie not found');
        res.render('edit', { movie });
    });
});

// Edit movie submission route
app.post('/movie/:id/edit', (req, res) => {
    const { id } = req.params;
    const { title, format, release_year, label, imdb_number, packaging, slipcover } = req.body;
    const slipcoverValue = slipcover === 'on' ? 1 : 0;

    db.run(
        `UPDATE movies SET title = ?, format = ?, release_year = ?, label = ?, imdb_number = ?, packaging = ?, slipcover = ? WHERE id = ?`,
        [title, format, release_year, label, imdb_number, packaging, slipcoverValue, id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/');
        }
    );
});

// Delete movie route
app.post('/movie/:id/delete', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM movies WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/');
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});