function calcularTotal(subtotal) {
  const iva = subtotal * 0.15;
  return subtotal + iva;
}

module.exports = { calcularTotal };
