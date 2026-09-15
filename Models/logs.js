import { pool } from "../Database/config";

const Logs = {
    async crear({}){
        try {
            const [result] = await pool.query(
                `INSERT INTO Logs (
                    
                )
                VALUES ()`,
                []
            );
        } catch (error) {
            console.log(error)
        }
    }
}

export default Logs;