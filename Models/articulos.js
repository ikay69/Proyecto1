import { pool } from '../Database/config.js';
import ArticuloPropiedades from './articuloPropiedades.js';

//SKU temporal usado solo entre el INSERT y el UPDATE dentro de la misma transaccion.
//Articulos.CodigoSKU es VARCHAR(12) y tiene UNIQUE (EmpresaId, CodigoSKU), asi que el
//placeholder debe caber en 12 caracteres y ser practicamente irrepetible: 'T' + tiempo
//en base36 (8) + 2 caracteres al azar = 11 caracteres.
const generarSkuTemporal = () => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `T${tiempo}${azar}`;
};

const Articulos = {
    //crea el articulo y sus propiedades usando la conexion que le pasa el llamador. NO abre
    //transaccion propia: asi la creacion puede formar parte de una transaccion mas grande
    //(p.ej. Helpers/compraService.js, donde un articulo que se da de alta al comprarlo debe
    //revertirse junto con la compra si esta falla). Mismo patron que
    //registrarMovimiento/registrarMovimientoTransaccional en Helpers/inventarioTransacciones.js.
    //El SKU definitivo depende del Id autogenerado, por eso se inserta con un placeholder y se
    //actualiza enseguida.
    async crearConConexion(connection, {
        pEmpId, pUsuIdCrea, pProductoId, pNombre, pDescripcion, pPrecioVentaUnitario, pVender, pPropiedades
    }){
        const skuTemporal = generarSkuTemporal();

        const [insertResult] = await connection.query(
            `INSERT INTO Articulos(
                EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU,
                Nombre, Descripcion, PrecioVentaUnitario, Vender)
            VALUES(?,?,?,?,?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pProductoId,skuTemporal,pNombre,pDescripcion,pPrecioVentaUnitario, pVender ?? true]
        );

        const nuevoId = insertResult.insertId;
        const codigoSku = `ART${String(nuevoId).padStart(8,'0')}`;

        await connection.query(`UPDATE Articulos SET CodigoSKU = ? WHERE Id = ?`, [codigoSku, nuevoId]);

        await ArticuloPropiedades.reemplazarValores(connection, {
            pEmpId, pArticuloId: nuevoId, propiedades: pPropiedades
        });

        return nuevoId;
    },

    //envoltura para el alta suelta de un articulo (ruta /newarticulo): abre y cierra su propia
    //transaccion. Firma sin cambios respecto de antes del refactor; `pVender` es opcional y
    //por omision el articulo queda vendible, que era el comportamiento previo (la columna
    //Vender es NOT NULL DEFAULT TRUE y el INSERT no la incluia).
    async crear(datos){
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const nuevoId = await Articulos.crearConConexion(connection, datos);
            await connection.commit();
            return nuevoId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async editar({pEmpId,pId,pProductoId,pNombre,pDescripcion,pPrecioVentaUnitario,pVender,pEstado,pPropiedades}){
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `UPDATE Articulos SET
                    ProductoId = ?, Nombre = ?, Descripcion = ?,
                    PrecioVentaUnitario = ?, Vender = ?, Estado = ?
                WHERE EmpresaId = ? AND Id = ?;`,
                [pProductoId,pNombre,pDescripcion,pPrecioVentaUnitario,pVender,pEstado,pEmpId,pId]
            );

            await ArticuloPropiedades.reemplazarValores(connection, {
                pEmpId, pArticuloId: pId, propiedades: pPropiedades
            });

            await connection.commit();
            return rows.affectedRows;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                a.Id AS artId, 
                a.EmpresaId AS artEmp, 
                u.Nombres AS artUsuario,
                a.FechaCreacion AS artFecCreacion,

                a.ProductoId AS artProductoId,
                p.Nombre AS artProductoNombre, 
                c.Nombre            AS artCategoria,
                tp.Nombre           AS artTipoProducto,
                
                a.CodigoSKU AS artSKU,
                a.Nombre AS artNombre,
                a.Descripcion AS artDescripcion,
                a.PrecioVentaUnitario AS artPrecio,
                a.Vender AS artVender,
                a.Estado AS artEstado
            FROM Articulos a
                LEFT JOIN Productos p ON p.Id = a.ProductoId
                LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                LEFT JOIN Categorias c ON c.Id = p.CategoriaId 
                LEFT JOIN Usuarios u ON u.Id = a.UsuarioIdCreador
            WHERE a.Id = ? AND a.EmpresaId = ?;`,
            [pId,pEmpId]
        );
        return rows[0] || null;
    },

    //pCampoOrden solo recibe valores fijos ('Nombre','CodigoSKU','FechaCreacion') definidos
    //por el Controller, nunca directamente del body: evita inyeccion SQL por interpolacion
    //de columna, igual que en Models/productos.js
    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                a.Id AS artId, 
                a.CodigoSKU AS artSKU, 
                a.Nombre            AS artNombre,
                a.Descripcion       AS artDescripcion,
                a.PrecioVentaUnitario AS artPrecio,
                a.Vender            AS artVender,
                a.Estado            AS artEstado,
                c.Nombre            AS artCategoria,
                tp.Nombre           AS artTipoProducto,
                IFNULL(
                    GROUP_CONCAT(CONCAT(pr.Nombre, ':', ap.Valor) SEPARATOR ','),
                    ''
                ) AS artPropiedades
            FROM Articulos a
                LEFT JOIN Productos p ON p.Id = a.ProductoId
                LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                LEFT JOIN ArticuloPropiedades ap ON ap.ArticuloId = a.Id
                LEFT JOIN Propiedades pr ON pr.Id = ap.PropiedadId
            WHERE a.EmpresaId = ?
                AND a.${pCampoOrden} LIKE ?
            GROUP BY  a.Id, c.Nombre, tp.Nombre
            ORDER BY a.${pCampoOrden} ${pOrden}
            LIMIT 50 OFFSET ?;`,
            [pEmpId,pTexto,pOffset]
        );
        return rows || [];
    },

    async traerActivas({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                a.Id                AS artId, 
                a.CodigoSKU         AS artSKU, 
                a.Nombre            AS artNombre,
                a.Descripcion       AS artDescripcion,
                a.PrecioVentaUnitario AS artPrecio,
                a.Vender            AS artVender,
                a.Estado            AS artEstado,
                c.Nombre            AS artCategoria,
                tp.Nombre           AS artTipoProducto,
                IFNULL(
                    GROUP_CONCAT(CONCAT(pr.Nombre, ':', ap.Valor) SEPARATOR ','),
                    ''
                ) AS artPropiedades
            FROM Articulos a
                LEFT JOIN Productos p ON p.Id = a.ProductoId
                LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                LEFT JOIN ArticuloPropiedades ap ON ap.ArticuloId = a.Id
                LEFT JOIN Propiedades pr ON pr.Id = ap.PropiedadId
            WHERE a.EmpresaId = ? AND a.Estado = true AND a.Vender = true
                AND a.${pCampoOrden} LIKE ?
            GROUP BY  a.Id, c.Nombre, tp.Nombre
            ORDER BY a.${pCampoOrden} ${pOrden}
            LIMIT 50 OFFSET ?;`,
            [pEmpId,pTexto,pOffset]
        );
        return rows || [];
    },

    //la "ventanilla" de venta: solo articulos que se pueden vender y que tienen algo
    //disponible para vender. pBodegaId es opcional (cadena vacia = todas las bodegas): sin
    //filtro devuelve una fila por cada combinacion articulo+bodega con existencia, para poder
    //elegir de cual bodega sale cada renglon de la venta (una venta puede mezclar bodegas por
    //linea). El join con Existencias nunca duplica mas filas de las necesarias porque
    //uq_existencias_bolsa (EmpresaId, BodegaId, ArticuloId, BolsaEstado, PropietarioIdClave)
    //garantiza una sola fila DISPONIBLE sin propietario por articulo+bodega; por eso el join
    //tambien amarra e.EmpresaId = a.EmpresaId, que es la primera columna de esa unique.
    async traerVendibles({pEmpId,pBodegaId,pCampoOrden,pOrden,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                a.Id AS artId,
                a.Nombre AS artNombre,
                a.CodigoSKU AS artSKU,
                a.PrecioVentaUnitario AS artPrecio,
                e.BodegaId AS artBodegaId,
                bo.Nombre AS artBodegaNombre,
                e.Cantidad AS artCantidadDisponible
            FROM Articulos a
                INNER JOIN Existencias e ON e.ArticuloId = a.Id AND e.EmpresaId = a.EmpresaId
                    AND (? = '' OR e.BodegaId = ?)
                    AND e.BolsaEstado = 'DISPONIBLE' AND e.PropietarioId IS NULL AND e.Cantidad > 0
                INNER JOIN Bodegas bo ON bo.Id = e.BodegaId
            WHERE a.EmpresaId = ? AND a.Estado = true AND a.Vender = true
                AND a.${pCampoOrden} LIKE ?
            ORDER BY a.${pCampoOrden} ${pOrden}, e.BodegaId ASC
            LIMIT 50 OFFSET ?;`,
            [pBodegaId,pBodegaId,pEmpId,pTexto,pOffset]
        );
        return rows || [];
    },

    async contarVendiblesFiltro({pEmpId,pBodegaId,pCampoOrden,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total
            FROM Articulos a
                INNER JOIN Existencias e ON e.ArticuloId = a.Id AND e.EmpresaId = a.EmpresaId
                    AND (? = '' OR e.BodegaId = ?)
                    AND e.BolsaEstado = 'DISPONIBLE' AND e.PropietarioId IS NULL AND e.Cantidad > 0
            WHERE a.EmpresaId = ? AND a.Estado = true AND a.Vender = true AND a.${pCampoOrden} LIKE ?;`,
            [pBodegaId,pBodegaId,pEmpId,pTexto]
        );
        return rows[0].total;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM Articulos
            WHERE EmpresaId = ? AND ${pCampoOrden} LIKE ?;`,
            [pEmpId,pTexto]
        );
        return rows[0].total;
    },

    async contarActivasFiltro({pEmpId,pCampoOrden,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM Articulos
            WHERE EmpresaId = ? AND Estado = true AND Vender = true AND ${pCampoOrden} LIKE ?;`,
            [pEmpId,pTexto]
        );
        return rows[0].total;
    }
};

export default Articulos;
