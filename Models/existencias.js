import { pool } from '../Database/config.js';

const Existencias = {
    async traerBolsaBloqueada(connection, {pEmpId,pArticuloId,pBolsaEstado,pPropietarioId}){
        const [rows] = await connection.query(
            `SELECT Id, Cantidad, CostoUnitario FROM Existencias
            WHERE EmpresaId = ? AND ArticuloId = ? AND BolsaEstado = ? AND PropietarioId <=> ?
            FOR UPDATE;`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId]
        );
        return rows[0] || null;
    },

    //lectura sin bloqueo de una sola bolsa, para resolver el costo fuera de una transaccion
    //(ej. Controllers/ventas.js antes de abrir la transaccion de la venta).
    async traerBolsa({pEmpId,pArticuloId,pBolsaEstado,pPropietarioId}){
        const [rows] = await pool.query(
            `SELECT Id, Cantidad, CostoUnitario FROM Existencias
            WHERE EmpresaId = ? AND ArticuloId = ? AND BolsaEstado = ? AND PropietarioId <=> ?;`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId]
        );
        return rows[0] || null;
    },

    async upsertCantidad(connection, {pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta}){
        await connection.query(
            `INSERT INTO Existencias (EmpresaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE Cantidad = Cantidad + VALUES(Cantidad);`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta]
        );
    },

    //igual que upsertCantidad, pero ademas fija el costo promedio recalculado de la bolsa: se usa
    //en la ENTRADA a DISPONIBLE, el unico caso donde cantidad y costo cambian juntos.
    async upsertCantidadYCosto(connection, {pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta,pCosto}){
        await connection.query(
            `INSERT INTO Existencias (EmpresaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad, CostoUnitario)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE Cantidad = Cantidad + VALUES(Cantidad), CostoUnitario = VALUES(CostoUnitario);`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta,pCosto]
        );
    },

    //ajuste manual de costo (endpoint updatecostoarticulo): upsert sobre la bolsa indicada (hoy
    //siempre DISPONIBLE/sin propietario) sin tocar Cantidad, para poder fijar un costo base antes
    //de que exista movimiento alguno.
    async editarCosto({pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pCosto}){
        await pool.query(
            `INSERT INTO Existencias (EmpresaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad, CostoUnitario)
             VALUES (?, ?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE CostoUnitario = VALUES(CostoUnitario);`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pCosto]
        );
    },

    async traerBolsasPorArticulo({pEmpId,pArticuloId}, connection = pool){
        const [rows] = await connection.query(
            `SELECT
                e.BolsaEstado AS existBolsa,
                e.PropietarioId AS existPropietarioId,
                t.Nombre AS existPropietarioNombre,
                e.Cantidad AS existCantidad,
                e.CostoUnitario AS existCosto
            FROM Existencias e
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ? AND e.ArticuloId = ? AND e.Cantidad > 0;`,
            [pEmpId,pArticuloId]
        );
        return rows || [];
    },

    async traerTodo({pEmpId,pBolsaEstado,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                e.Id AS existId,
                a.CodigoSKU AS existSKU,
                a.Nombre AS existArticuloNombre,
                e.BolsaEstado AS existBolsa,
                e.PropietarioId AS existPropietarioId,
                t.Nombre AS existPropietarioNombre,
                e.Cantidad AS existCantidad,
                e.CostoUnitario AS existCosto,
                e.FechaActualizacion AS existFecha
            FROM Existencias e
                LEFT JOIN Articulos a ON a.Id = e.ArticuloId
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?)
            ORDER BY e.FechaActualizacion DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, pBolsaEstado, pBolsaEstado, pTexto, pTexto, pOffset]
        );
        return rows || [];
    },

    async contarTodoFiltro({pEmpId,pBolsaEstado,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total
            FROM Existencias e
                LEFT JOIN Articulos a ON a.Id = e.ArticuloId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?);`,
            [pEmpId, pBolsaEstado, pBolsaEstado, pTexto, pTexto]
        );
        return rows[0].total;
    }
};

export default Existencias;
