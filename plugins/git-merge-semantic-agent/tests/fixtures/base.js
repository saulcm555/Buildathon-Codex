function calcularTotal(monto) {
  const iva = monto * 0.15;
  return monto + iva;
}

module.exports = { calcularTotal };
