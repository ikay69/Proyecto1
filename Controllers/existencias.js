import Existencias from '../Models/existencias.js';

const existenciasControllers = {
    listarPorArticulo: async (req,res) => {
        try {
            const {idEmpresa, idArticulo} = req.body;
            const bolsas = await Existencias.traerBolsasPorArticulo({pEmpId:idEmpresa, pArticuloId:idArticulo});
            return res.status(200).json({data:bolsas});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarTodo: async (req,res) => {
        try {
            const {idEmpresa, pagina, textoFiltro, BolsaEstado} = req.body;

            const vBolsaEstado = BolsaEstado || '';
            const vTextoFiltro = (textoFiltro && String(textoFiltro).trim().length > 0)
                ? `%${String(textoFiltro).trim()}%`
                : '%%';

            let vPagina = Number(pagina);
            const cantExistencias = await Existencias.contarTodoFiltro({pEmpId:idEmpresa, pBolsaEstado:vBolsaEstado, pTexto:vTextoFiltro});
            const maxPagina = Math.max(1, Math.ceil(cantExistencias/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const existencias = await Existencias.traerTodo({pEmpId:idEmpresa, pBolsaEstado:vBolsaEstado, pOffset:vOffset, pTexto:vTextoFiltro});

            return res.status(200).json({cantData:cantExistencias, data:existencias});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default existenciasControllers;
