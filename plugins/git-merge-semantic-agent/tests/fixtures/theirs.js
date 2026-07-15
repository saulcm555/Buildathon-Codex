function calcularTotal(monto) {
  if (monto < 0) {
    throw new Error('El monto no puede ser negativo');
  }

  const iva = monto * 0.15;
  return monto + iva;
}

module.exports = { calcularTotal };
