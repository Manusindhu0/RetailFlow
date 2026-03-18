use rusqlite::{Connection};
use std::path::Path;
use std::sync::Mutex;
use anyhow::Result;
use crate::db::migrations::run_migrations;

pub struct DbState(pub Mutex<Connection>);

impl DbState {
    pub fn new(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Performance pragmas
        conn.execute_batch("
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
            PRAGMA cache_size = -64000;
        ")?;

        run_migrations(&conn)?;

        Ok(DbState(Mutex::new(conn)))
    }
}
