//conversion de lo que manda el cliente a algo que MySQL interprete sin sorpresas.
//Vive aparte, como Helpers/dinero.js, porque es una convencion transversal: cualquier modulo
//que reciba una fecha del front la va a necesitar.

//acepta 'YYYY-MM-DD' con hora opcional, separada por 'T' o por espacio. El resto de un ISO
//completo (milisegundos, 'Z', desfase) se ignora a proposito: ver el comentario de abajo.
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

//devuelve 'YYYY-MM-DD HH:MM:SS' -- lo que MySQL interpreta en la zona horaria de la sesion --
//o null. Lanza si el valor no es una fecha.
//
//NO usa new Date(valor).toISOString(): '2026-10-15' se parsea como medianoche UTC, asi que en
//una sesion en UTC-5 (la del negocio) MySQL guardaria 2026-10-14 19:00:00 y la fecha de pago
//correria un dia hacia atras. Trabajando sobre la cadena, el dia que escribe el usuario es el
//dia que queda en la base.
const normalizarFecha = (valor) => {
    if (valor === undefined || valor === null || valor === '') return null;

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) throw new Error('Fecha inválida');
        const p = (n) => String(n).padStart(2, '0');
        return `${valor.getFullYear()}-${p(valor.getMonth() + 1)}-${p(valor.getDate())} ` +
               `${p(valor.getHours())}:${p(valor.getMinutes())}:${p(valor.getSeconds())}`;
    }

    if (typeof valor !== 'string') throw new Error('Fecha inválida');

    const partes = RE_FECHA.exec(valor.trim());
    if (!partes) throw new Error('Fecha inválida');

    const [, anio, mes, dia, hora = '00', minuto = '00', segundo = '00'] = partes;

    //el regex acepta 2026-02-31 y 2026-13-01: son cuatro digitos, dos y dos. Date.UTC
    //normaliza (31 de febrero -> 3 de marzo), asi que si los componentes no vuelven iguales
    //es que la fecha no existe en el calendario.
    const prueba = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
    if (prueba.getUTCFullYear() !== Number(anio) ||
        prueba.getUTCMonth() !== Number(mes) - 1 ||
        prueba.getUTCDate() !== Number(dia)) {
        throw new Error('Fecha inválida');
    }
    if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 59) {
        throw new Error('Fecha inválida');
    }

    return `${anio}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
};

//true solo si la cadena es 'YYYY-MM-DD' pelada. RE_FECHA no lleva /g, asi que exec no arrastra
//estado entre llamadas: el grupo 4 es la hora, y solo queda undefined cuando no venia ninguna.
const esSoloFecha = (texto) => {
    const partes = RE_FECHA.exec(texto);
    return partes !== null && partes[4] === undefined;
};

//la cota SUPERIOR de un rango de fechas. Una fecha sin hora es medianoche, asi que comparada
//contra un TIMESTAMP con `<=` dejaria fuera todo lo ocurrido ese mismo dia: se lleva al ultimo
//segundo que la columna puede guardar. Si el valor ya trae hora -- o es un Date, que siempre la
//trae --, se respeta tal cual: es una cota que el cliente eligio a proposito.
//
//La cota INFERIOR no necesita funcion aparte: normalizarFecha ya deja 'YYYY-MM-DD' en
//00:00:00, que es justo el principio de ese dia.
const normalizarFechaFin = (valor) => {
    const normalizada = normalizarFecha(valor);
    if (normalizada === null) return null;

    if (typeof valor === 'string' && esSoloFecha(valor.trim())) {
        return `${normalizada.slice(0, 10)} 23:59:59`;
    }
    return normalizada;
};

//para los middlewares de ruta, que responden 400 en vez de lanzar. Un valor vacio da false:
//quien la llama es porque la fecha es obligatoria en ese punto.
const esFechaValida = (valor) => {
    try {
        return normalizarFecha(valor) !== null;
    } catch {
        return false;
    }
};

export { normalizarFecha, normalizarFechaFin, esFechaValida };
