import { pool } from '../Database/config.js';

const withRollback = async (testFn) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        await testFn(connection);
    } finally {
        await connection.rollback();
        connection.release();
    }
};

export { withRollback };
