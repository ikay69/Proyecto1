//todo redondeo de dinero del sistema pasa por aqui: comparar decimales con === despues de
//sumas o restas en punto flotante es la fuente clasica de descuadres de un centavo.
//Vive fuera de ventaCalculos/compraCalculos para que ambos modulos compartan exactamente
//la misma regla en vez de tener cada uno la suya.
const redondear = (valor) => Math.round(Number(valor) * 100) / 100;

export { redondear };
