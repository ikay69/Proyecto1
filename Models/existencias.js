import { pool } from '../Database/config.js';

const Existencias = {
    async traerBolsaBloqueada(connection, {pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId}){
        const [rows] = await connection.query(
            `SELECT Id, Cantidad, CostoUnitario FROM Existencias
            WHERE EmpresaId = ? AND BodegaId = ? AND ArticuloId = ? AND BolsaEstado = ? AND PropietarioId <=> ?
            FOR UPDATE;`,
            [pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId]
        );
        return rows[0] || null;
    },

    //lectura sin bloqueo de una sola bolsa, para resolver el costo fuera de una transaccion
    //(ej. Controllers/ventas.js antes de abrir la transaccion de la venta).
    async traerBolsa({pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId}){
        const [rows] = await pool.query(
            `SELECT Id, Cantidad, CostoUnitario FROM Existencias
            WHERE EmpresaId = ? AND BodegaId = ? AND ArticuloId = ? AND BolsaEstado = ? AND PropietarioId <=> ?;`,
            [pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId]
        );
        return rows[0] || null;
    },

    async upsertCantidad(connection, {pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta}){
        await connection.query(
            `INSERT INTO Existencias (EmpresaId, BodegaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE Cantidad = Cantidad + VALUES(Cantidad);`,
            [pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta]
        );
    },

    //igual que upsertCantidad, pero ademas fija el costo promedio recalculado de la bolsa: se usa
    //en la ENTRADA a DISPONIBLE, el unico caso donde cantidad y costo cambian juntos.
    async upsertCantidadYCosto(connection, {pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta,pCosto}){
        await connection.query(
            `INSERT INTO Existencias (EmpresaId, BodegaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad, CostoUnitario)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE Cantidad = Cantidad + VALUES(Cantidad), CostoUnitario = VALUES(CostoUnitario);`,
            [pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta,pCosto]
        );
    },

    //ajuste manual de costo (endpoint updatecostoarticulo): upsert sobre la bolsa indicada (hoy
    //siempre DISPONIBLE/sin propietario, en la bodega por defecto) sin tocar Cantidad, para poder
    //fijar un costo base antes de que exista movimiento alguno.
    async editarCosto({pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pCosto}){
        await pool.query(
            `INSERT INTO Existencias (EmpresaId, BodegaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad, CostoUnitario)
             VALUES (?, ?, ?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE CostoUnitario = VALUES(CostoUnitario);`,
            [pEmpId,pBodegaId,pArticuloId,pBolsaEstado,pPropietarioId,pCosto]
        );
    },

    //vista por articulo: muestra las bolsas de TODAS las bodegas (util para el detalle del
    //articulo, donde interesa ver en cual bodega esta cada bolsa).
    async traerBolsasPorArticulo({pEmpId,pArticuloId}, connection = pool){
        const [rows] = await connection.query(
            `SELECT
                e.BodegaId AS existBodegaId,
                bo.Nombre AS existBodegaNombre,
                e.BolsaEstado AS existBolsa,
                e.PropietarioId AS existPropietarioId,
                t.Nombre AS existPropietarioNombre,
                e.Cantidad AS existCantidad,
                e.CostoUnitario AS existCosto
            FROM Existencias e
                LEFT JOIN Bodegas bo ON bo.Id = e.BodegaId
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ? AND e.ArticuloId = ? AND e.Cantidad > 0;`,
            [pEmpId,pArticuloId]
        );
        return rows || [];
    },

    //pBodegaId es opcional (cadena vacia = todas las bodegas), igual que pBolsaEstado.
    async traerTodo({pEmpId,pBodegaId,pBolsaEstado,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                e.Id AS existId,
                e.BodegaId AS existBodegaId,
                bo.Nombre AS existBodegaNombre,
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
                LEFT JOIN Bodegas bo ON bo.Id = e.BodegaId
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BodegaId = ?)
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?)
            ORDER BY e.FechaActualizacion DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, pBodegaId, pBodegaId, pBolsaEstado, pBolsaEstado, pTexto, pTexto, pOffset]
        );
        return rows || [];
    },

    async contarTodoFiltro({pEmpId,pBodegaId,pBolsaEstado,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total
            FROM Existencias e
                LEFT JOIN Articulos a ON a.Id = e.ArticuloId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BodegaId = ?)
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?);`,
            [pEmpId, pBodegaId, pBodegaId, pBolsaEstado, pBolsaEstado, pTexto, pTexto]
        );
        return rows[0].total;
    }
};

export default Existencias;
