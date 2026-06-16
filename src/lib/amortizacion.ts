// Tipos públicos para el cálculo de amortización
export interface DatosAmortizacion {
  importeInicial: number;
  interesAnual: number;
  mesesRestantes: number;
  amortizacionAdicional: number;
  tipoAmortizacion: "puntual" | "mensual" | "anual";
  reducir: "cuota" | "plazo";
  mantenerPagoConstante: boolean;
}

export interface FilaAmortizacion {
  mes: number;
  fecha: string;
  cuota: string;
  intereses: string;
  amortizacion: string;
  amortizacionAdicional: string;
  saldoPendiente: string;
  interesesAcumulados: string;
}

/**
 * Calcula la cuota mensual usando el sistema francés.
 * @param importe - Capital pendiente
 * @param interesAnual - Tasa de interés anual en porcentaje (ej: 3 para 3%)
 * @param meses - Número de meses restantes
 */
export function calcularCuotaFrances(
  importe: number,
  interesAnual: number,
  meses: number
): number {
  const interesMensual = interesAnual / 100 / 12;
  if (interesMensual === 0) return importe / meses;
  return (
    (importe * interesMensual) /
    (1 - Math.pow(1 + interesMensual, -meses))
  );
}

/**
 * Genera la tabla de amortización completa.
 * @param datos - Datos del préstamo
 * @param additionalValues - Valores adicionales por mes (del input en tabla)
 * @param fechaReferencia - Fecha base (opcional, por defecto ahora)
 */
export function generarTablaAmortizacion(
  datos: DatosAmortizacion,
  additionalValues: Record<number, number> = {},
  fechaReferencia?: Date
): { tabla: FilaAmortizacion[]; totalIntereses: number } {
  const {
    importeInicial,
    interesAnual,
    mesesRestantes,
    amortizacionAdicional,
    tipoAmortizacion,
    reducir,
    mantenerPagoConstante,
  } = datos;

  let saldoPendiente = importeInicial;
  const tabla: FilaAmortizacion[] = [];
  let totalIntereses = 0;
  const interesMensual = interesAnual / 100 / 12;

  // Fecha de inicio
  const today = fechaReferencia ?? new Date();
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();

  // Cuota original (sin reducciones) para "mantener pago constante"
  const cuotaOriginal = reducir === "plazo"
    ? calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes)
    : null;

  for (let mes = 1; mes <= mesesRestantes; mes++) {
    const currentDate = new Date(startYear, startMonth + mes - 1, 1);
    const fecha = currentDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Determinar el valor adicional para este mes
    let additional = 0;
    if (additionalValues[mes] !== undefined) {
      additional = Number(additionalValues[mes]);
    } else if (
      (tipoAmortizacion === "puntual" && mes === 1) ||
      tipoAmortizacion === "mensual" ||
      (tipoAmortizacion === "anual" && mes % 12 === 0)
    ) {
      additional = Number(amortizacionAdicional);
    }

    // Aplicar adicional para "puntual" ANTES de calcular la cuota
    if (tipoAmortizacion === "puntual" && mes === 1) {
      saldoPendiente -= additional;
    }

    // Calcular cuota del mes
    const cuotaMensual =
      reducir === "cuota"
        ? calcularCuotaFrances(saldoPendiente, interesAnual, mesesRestantes - mes + 1)
        : calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes);

    const interesMes = saldoPendiente * interesMensual;
    let amortizacionMes = cuotaMensual - interesMes;

    // "Mantener pago constante": la diferencia entre cuota original y nueva va a principal
    if (reducir === "cuota" && mantenerPagoConstante && cuotaOriginal !== null) {
      const pagoExtra = cuotaOriginal - cuotaMensual;
      if (pagoExtra > 0) {
        amortizacionMes += pagoExtra;
      }
    }

    // Aplicar adicional para "mensual" o "anual" DESPUÉS de la cuota
    if (tipoAmortizacion === "mensual" || (tipoAmortizacion === "anual" && mes % 12 === 0)) {
      saldoPendiente -= additional;
    }

    // Aplicar amortización normal
    saldoPendiente -= amortizacionMes;
    if (saldoPendiente < 0) saldoPendiente = 0;
    totalIntereses += interesMes;

    tabla.push({
      mes,
      fecha,
      cuota: cuotaMensual.toFixed(2),
      intereses: interesMes.toFixed(2),
      amortizacion: amortizacionMes.toFixed(2),
      amortizacionAdicional: Number(additional).toFixed(2),
      saldoPendiente: saldoPendiente.toFixed(2),
      interesesAcumulados: totalIntereses.toFixed(2),
    });

    if (saldoPendiente === 0) break;
  }

  return { tabla, totalIntereses };
}

/**
 * Valida los datos del formulario de amortización.
 * Retorna un objeto con errores por campo (vacío si es válido).
 */
export function validarDatos(
  datos: Partial<DatosAmortizacion>
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!datos.importeInicial || datos.importeInicial <= 0)
    errores.importeInicial = "Debe ser mayor que 0";
  if (datos.interesAnual === undefined || datos.interesAnual < 0)
    errores.interesAnual = "No puede ser negativo";
  if (!datos.mesesRestantes || datos.mesesRestantes <= 0)
    errores.mesesRestantes = "Debe ser mayor que 0";
  if (datos.amortizacionAdicional === undefined || datos.amortizacionAdicional < 0)
    errores.amortizacionAdicional = "No puede ser negativo";
  return errores;
}
