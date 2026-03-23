const mysql = require('mysql2/promise');

const defaultPasswords = [
  "",
  "root",
  "password",
  "Saikumar@2005",
  "1234",
  "12345",
  "123456",
  "12345678",
  "admin",
  "admin123",
  "mysql",
  "Saikumar",
  "saikumar"
];

// If you pass passwords in the command line, it uses those. Otherwise, it uses the defaults.
const commonPasswords = process.argv.length > 2 ? process.argv.slice(2) : defaultPasswords;

async function tryLogin(password, port) {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: password,
      port: port
    });
    console.log(`SUCCESS! Password found: '${password}' on port ${port}`);
    await conn.end();
    return true;
  } catch (e) {
    return false;
  }
}

async function bruteForce() {
  console.log("Testing common passwords on port 3306...");
  for (const pwd of commonPasswords) {
    if (await tryLogin(pwd, 3306)) return;
  }
  
  console.log("Testing common passwords on port 3307...");
  for (const pwd of commonPasswords) {
    if (await tryLogin(pwd, 3307)) return;
  }

  console.log("No common passwords worked.");
}

bruteForce();
