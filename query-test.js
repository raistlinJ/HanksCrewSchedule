const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/rallly' });

async function check() {
  const res = await pool.query(`
    SELECT v.type, pt.deleted 
    FROM votes v 
    JOIN participants pt ON v.participant_id = pt.id 
    WHERE v.poll_id = 'WJOEm4M7E0JY'
  `);
  console.log(res.rows);
  pool.end();
}
check();
