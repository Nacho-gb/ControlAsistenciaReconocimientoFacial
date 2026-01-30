const sql = require('mssql');

// Configuración de la conexión
const config = {
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    }
};

let pool;

// Obtener conexión (singleton pattern)
async function getConnection() {
    if (!pool) {
        pool = await sql.connect(config);
    }
    return pool;
}

// Ejecutar query
async function executeQuery(query, params = {}) {
    try {
        const conn = await getConnection();
        const request = conn.request();
        
        // Añadir parámetros
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

// Ejecutar stored procedure
async function executeStoredProcedure(procedureName, params = {}) {
    try {
        const conn = await getConnection();
        const request = conn.request();
        
        // Añadir parámetros
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        
        const result = await request.execute(procedureName);
        return result.recordset;
    } catch (error) {
        console.error('Stored procedure error:', error);
        throw error;
    }
}

module.exports = {
    getConnection,
    executeQuery,
    executeStoredProcedure,
    sql
};
