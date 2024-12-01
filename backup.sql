PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        format TEXT,
        release_year INTEGER,
        label TEXT,
        imdb_number TEXT
    , packaging TEXT, slipcover INTEGER DEFAULT 0);
INSERT INTO movies VALUES(1,'3 From Hell','4k',2019,'Lionsgate','tt8134742',NULL,0);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('movies',1);
COMMIT;
