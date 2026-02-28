pub mod migrations;

use rusqlite::Connection;
use std::sync::Mutex;

use self::migrations::{apply_pragmas, migrations};

#[allow(dead_code)]
pub struct DbState(pub Mutex<Connection>);

pub fn initialize(db_path: &str) -> Result<DbState, Box<dyn std::error::Error>> {
    let mut conn = Connection::open(db_path)?;
    apply_pragmas(&conn)?;
    migrations().to_latest(&mut conn)?;
    Ok(DbState(Mutex::new(conn)))
}

#[cfg(test)]
pub fn initialize_in_memory() -> DbState {
    let mut conn = Connection::open_in_memory().unwrap();
    apply_pragmas(&conn).unwrap();
    migrations().to_latest(&mut conn).unwrap();
    DbState(Mutex::new(conn))
}
