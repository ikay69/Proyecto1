const IP_PERMITIDAS = [
  '192.168.1.15',  // PC de Juan
  '192.168.1.20',  // Laptop de Maria
  '127.0.0.1',     // El propio servidor (localhost)
  '::1'            // Localhost en formato IPv6
];

const validarIPPermitidas = (req, res, next) => {
  // 1. Obtener la IP del cliente de forma segura
  let clienteIp = req.ip || req.connection?.remoteAddress || '';

  // 2. Limpiar el prefijo IPv4 mapeado en IPv6 si existe
  if (clienteIp.startsWith('::ffff:')) {
    clienteIp = clienteIp.split('::ffff:')[1];
  }

  // 3. Verificar si la IP está en la lista blanca
  if (IP_PERMITIDAS.includes(clienteIp)) {
    return next(); // IP permitida, continuar al siguiente proceso
  } 

  // 4. Si no está permitida, bloquear el acceso
  console.log(`Acceso denegado para la IP: ${clienteIp}`);
  return res.status(403).json({ 
    msg: 'Acceso denegado: Dispositivo no autorizado.' 
  });
};

export {validarIPPermitidas}