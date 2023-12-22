const mysql = require('mysql2');

// Create a connection pool

// host: 'srv608.hstgr.io',
// host: '194.163.35.23',
const pool = mysql.createPool({
  host: 'srv608.hstgr.io',
  user: 'u878123107_mail_hunter',
  password: 'aA@1mail',
  database: 'u878123107_mail_hunter',
  connectionLimit: 10000, // Adjust this based on your needs
});

// Listen for the 'error' event
pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool.promise(); // Export the promise-based pool
