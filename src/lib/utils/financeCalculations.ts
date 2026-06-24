/**
 * Redondea un número flotante a dos decimales con precisión financiera.
 * @param num El número a redondear.
 * @returns Número redondeado a 2 decimales.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Define la estructura de un mes en la tabla de amortización.
 */
export interface AmortizationMonth {
  mes: number; // Número secuencial del mes (1, 2, ...)
  fecha: Date; // Primer día del mes correspondiente
  capitalAmortizado: number; // Cuota principal pagada en este mes
  interesesPagados: number;   // Intereses devengados en este mes
  amortizacionAdicional: number; // Pago adicional (editable)
  saldoPendiente: number;     // Saldo restante después del pago
  cuotaTotalPagada: number;    // Cuota mensual + Amortización Adicional
}

/**
 * Calcula la cuota fija utilizando el sistema de amortización francés.
 * @param principal Monto inicial del préstamo (L).
 * @param interesAnual Tasa de interés anual (i_anual).
 * @param mesesRestantes Número total de pagos (n).
 * @returns La cuota mensual fija o 0 si los datos son inválidos.
 */
export function calcularCuotaMensualFrances(principal: number, interesAnual: number, mesesRestantes: number): number {
  if (principal <= 0 || interesAnual < 0 || mesesRestantes <= 0) return 0;

  const tasaMensual = interesAnual / 100 / 12; // i/12
  // Fórmula: M = L * [i(1+i)^n] / [(1+i)^n - 1]
  if (tasaMensual === 0) {
    return principal / mesesRestantes;
  }

  const cuota = principal * (tasaMensual * Math.pow(1 + tasaMensual, mesesRestantes)) / (Math.pow(1 + tasaMensual, mesesRestantes) - 1);
  // Redondeamos a dos decimales para consistencia monetaria
  return roundToTwoDecimals(cuota);
}

/**
 * Genera la tabla de amortización completa aplicando las reglas financieras y los pagos adicionales.
 * @param principal Monto inicial del préstamo.
 * @param interesAnual Tasa de interés anual (%).
 * @param mesesRestantes Número total de pagos esperados.
 * @param pagoAdicionalInicial Amortización adicional base por defecto (para la lógica).
 * @param tipoPagoAdicional Determina cómo se aplica el pago extra ('puntual', 'mensual', 'anual').
 * @returns Un array de objetos AmortizationMonth con la tabla completa.
 */
export function generarTablaAmortizacion(
  principal: number,
  interesAnual: number,
  mesesRestantes: number,
  pagoAdicionalInicial: number,
  tipoPagoAdicional: 'puntual' | 'mensual' | 'anual' = 'mensual',
): AmortizationMonth[] {
  const tabla: AmortizationMonth[] = [];
  let saldo = principal;
  const tasaMensual = interesAnual / 100 / 12;

  // Paso 1: Calcular la cuota fija mensual francesa (Base del cálculo)
  const cuotaFijaBase = calcularCuotaMensualFrances(principal, interesAnual, mesesRestantes);

  for (let i = 0; i < mesesRestantes; i++) {
    // Calcular la fecha para el mes actual
    const fechaActual = new Date();
    fechaActual.setMonth(fechaActual.getMonth() + i);

    // Intereses de este mes sobre el saldo pendiente
    const interesesMes = roundToTwoDecimals(saldo * tasaMensual);

    let amortizacionAdicionalMes: number;
    let cuotaBaseMes: number;

    // Determinar la Amortización Adicional según el tipo de pago y el mes
    switch (tipoPagoAdicional) {
      case 'puntual':
        amortizacionAdicionalMes = i === 0 ? pagoAdicionalInicial : 0;
        cuotaBaseMes = cuotaFijaBase; // Cuota base solo aplica en el primer cálculo.
        break;
      case 'mensual':
        amortizacionAdicionalMes = pagoAdicionalInicial;
        cuotaBaseMes = cuotaFijaBase;
        break;
      case 'anual':
        // El pago anual se aplica en el mes 12, 24, ... (mes = i + 1).
        amortizacionAdicionalMes = (i + 1) % 12 === 0 ? pagoAdicionalInicial : 0;
        cuotaBaseMes = cuotaFijaBase;
        break;
      default:
        amortizacionAdicionalMes = 0;
        cuotaBaseMes = cuotaFijaBase;
    }

    // Cuota total pagada este mes (Cuota Base + Adicional)
    const cuotaTotalPagada = roundToTwoDecimals(cuotaBaseMes + amortizacionAdicionalMes);

    // Cálculo del capital amortizado en este mes
    let capitalAmortizadoMes = cuotaTotalPagada - interesesMes;

    if (capitalAmortizadoMes < 0) {
      // Esto no debería pasar con lógica correcta, pero es una salvaguarda.
      capitalAmortizadoMes = 0;
    }

    // Nuevo saldo pendiente: Saldo anterior - Capital amortizado de este mes
    const nuevoSaldo = roundToTwoDecimals(Math.max(0, saldo - capitalAmortizadoMes));

    // Registrar el resultado del mes. Se usa roundToTwoDecimals para asegurar la
    // consistencia monetaria en todos los campos.
    tabla.push({
      mes: i + 1,
      fecha: new Date(fechaActual),
      capitalAmortizado: roundToTwoDecimals(Math.min(saldo, capitalAmortizadoMes)), // No amortizar más de lo que queda
      interesesPagados: interesesMes,
      amortizacionAdicional: amortizacionAdicionalMes,
      saldoPendiente: nuevoSaldo,
      cuotaTotalPagada: cuotaTotalPagada,
    });

    // Actualizar saldo para el siguiente ciclo usando el valor redondeado
    saldo = nuevoSaldo;
  }

  return tabla;
}

/**
 * Calcula los totales acumulados (Intereses y Capital Total) de la tabla.
 * @param amortizacionMonths La tabla generada por generarTablaAmortizacion.
 * @returns Un objeto con el total de intereses pagados.
 */
export function calcularTotales(amortizacionMonths: AmortizationMonth[]): { totalInteresesPagados: number; } {
  const totalIntereses = amortizacionMonths.reduce((acc, month) => acc + month.interesesPagados, 0);
  return { totalInteresesPagados: parseFloat(totalIntereses.toFixed(2)) };
}

/**
 * Simula el cálculo de la nueva cuota si se reduce solo la cuota o solo el plazo manteniendo el pago total constante.
 * (Esta función requiere lógica compleja, aquí dejo un placeholder con la estructura).
 */
export function calcularReduccionPago(
    principal: number,
    interesAnual: number,
    mesesRestantesOriginal: number,
    _cuotaBase: number,
    _tipoReducion: 'cuota' | 'plazo',
    _pagoAdicionalTotal: number // Asumiendo un pago adicional total calculado o fijo.
): { nuevaCuota: number; nuevosMeses: number; } {
    // Implementación avanzada requerida aquí, requiere más inputs de la UI (e.g., cuánto se desea reducir)
    return { nuevaCuota: 0, nuevosMeses: mesesRestantesOriginal };
}