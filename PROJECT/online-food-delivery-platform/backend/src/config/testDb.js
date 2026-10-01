const db = require("./db");

async function testDatabase() {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS database_name");

    console.log("✅ MySQL Connected Successfully!");
    console.log("📦 Database:", rows[0].database_name);

    process.exit(0);
  } catch (error) {
    console.error("❌ MySQL Connection Failed");
    console.error(error.message);

    process.exit(1);
  }
}

testDatabase();