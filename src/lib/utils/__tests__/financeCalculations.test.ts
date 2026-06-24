import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  roundToTwoDecimals,
  calcularCuotaMensualFrances,
  generarTablaAmortizacion,
  calcularTotales,
  calcularReduccionPago,
  type AmortizationMonth,
} from '../financeCalculations';

// Fecha fija para resultados deterministas en los cálculos de fechas.
// Se usan fake timers en lugar de reemplazar global.Date a mano (evita
// recursión infinita y problemas de tipado con DateConstructor).
const mockDate = new Date('2024-01-01T00:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('Utilities', () => {
  // --- roundToTwoDecimals Tests ---
  describe('roundToTwoDecimals', () => {
    it('should correctly round positive numbers to two decimal places', () => {
      expect(roundToTwoDecimals(123.456)).toBe(123.46);
    });

    it('should handle numbers needing rounding down', () => {
      expect(roundToTwoDecimals(50.993)).toBe(50.99);
    });

    it('should handle zero values and whole numbers', () => {
      expect(roundToTwoDecimals(123)).toBe(123);
      expect(roundToTwoDecimals(0)).toBe(0);
    });

    it('should handle negative numbers correctly', () => {
        expect(roundToTwoDecimals(-9.876)).toBe(-9.88);
        expect(roundToTwoDecimals(-123.456)).toBe(-123.46);
    });

     it('should handle exact two decimal numbers', () => {
      expect(roundToTwoDecimals(50.50)).toBe(50.5); // Should clean up trailing zero if possible, but math is the goal
    });
  });
});


describe('calcularCuotaMensualFrances', () => {

  it('should calculate a standard monthly payment correctly (Example: 120k loan, 3% annual, 60 months)', () => {
    // P=120000, i=3, n=60. M ≈ 2156.24 (sistema francés)
    const principal = 120000;
    const interesAnual = 3;
    const mesesRestantes = 60;
    expect(calcularCuotaMensualFrances(principal, interesAnual, mesesRestantes)).toBeCloseTo(2156.24, 2);
  });

  it('should handle a simple scenario (zero interest)', () => {
    // P=120000, i=0, n=60. Expected M = 2000
    const principal = 120000;
    const interesAnual = 0;
    const mesesRestantes = 60;
    expect(calcularCuotaMensualFrances(principal, interesAnual, mesesRestantes)).toBe(2000);
  });

  it('should handle a short term loan (low n)', () => {
    // P=1000, i=12, n=2. M ≈ 507.51 (sistema francés)
    const principal = 1000;
    const interesAnual = 12;
    const mesesRestantes = 2;
    expect(calcularCuotaMensualFrances(principal, interesAnual, mesesRestantes)).toBeCloseTo(507.51, 2);
  });

  it('should return 0 if principal is zero', () => {
    expect(calcularCuotaMensualFrances(0, 3, 10)).toBe(0);
  });

  it('should return 0 if months are zero or negative', () => {
    expect(calcularCuotaMensualFrances(1000, 3, 0)).toBe(0);
    expect(calcularCuotaMensualFrances(1000, 3, -5)).toBe(0);
  });

})


describe('generarTablaAmortizacion', () => {
  const principal = 120000;
  const interesAnual = 3;
  const mesesRestantes = 60;
  const pagoAdicionalBase = 500; // Pago adicional fijo para pruebas

  // Helper function to check if the generated table has the correct length and structure
  const validateBasicTableStructure = (table: AmortizationMonth[]) => {
    expect(table.length).toBe(mesesRestantes);
    table.forEach((month, index) => {
      expect(month.mes).toBe(index + 1);
      expect(typeof month.capitalAmortizado).toBe('number');
      expect(typeof month.interesesPagados).toBe('number');
      expect(typeof month.amortizacionAdicional).toBe('number');
    });
  }

  it('should generate a correct table using monthly additional payment (Mensual)', () => {
    const tabla = generarTablaAmortizacion(principal, interesAnual, mesesRestantes, pagoAdicionalBase, 'mensual');
    validateBasicTableStructure(tabla);

    // Verification on the first month's data structure and calculations:
    const month1 = tabla[0];
    expect(month1.amortizacionAdicional).toBe(pagoAdicionalBase);
    expect(month1.capitalAmortizado).toBeGreaterThanOrEqual(0);
  });

  it('should correctly apply the additional payment only in the first month (Puntual)', () => {
    const tabla = generarTablaAmortizacion(principal, interesAnual, mesesRestantes, pagoAdicionalBase, 'puntual');
    validateBasicTableStructure(tabla);

    // Verification on Month 1 vs subsequent months:
    expect(tabla[0].amortizacionAdicional).toBe(pagoAdicionalBase); // Mes 1 tiene el pago adicional
    expect(tabla[1].amortizacionAdicional).toBe(0);              // Resto de meses es cero

    // La cuota total pagada en el mes 2 debe ser igual a la calculada por la base.
    const cuotaBase = calcularCuotaMensualFrances(principal, interesAnual, mesesRestantes);
    expect(tabla[1].cuotaTotalPagada).toBeCloseTo(cuotaBase, 2);
  });

  it('should correctly apply the additional payment only every 12 months (Anual)', () => {
    const tabla = generarTablaAmortizacion(principal, interesAnual, mesesRestantes, pagoAdicionalBase, 'anual');
    validateBasicTableStructure(tabla);

    // Verificar que el primer pago adicional es en el mes 12 y no en el 0 o el 1.
    expect(tabla[10].amortizacionAdicional).toBe(0); // Mes 1-11
    expect(tabla[11].amortizacionAdicional).toBe(pagoAdicionalBase); // Índice 11 = Mes 12 (i=11)

  });


  it('should calculate total interests correctly for a full term loan', () => {
    // Caso simple de prueba donde el pago adicional es 0 para aislar la función calcularTotales.
    const tablaBase = generarTablaAmortizacion(principal, interesAnual, mesesRestantes, 0, 'mensual');
    const totales = calcularTotales(tablaBase);

    // Dado que los intereses se acumulan a lo largo de todo el plazo, este es un buen chequeo.
    // 120k al 3% en 60 meses ⇒ ≈ 9374.55€ de intereses totales.
    expect(totales.totalInteresesPagados).toBeCloseTo(9374.55, 2);
  });
});

describe('calcularReduccionPago', () => {
    // Nota: Esta función es extremadamente compleja y depende de inputs específicos de la UI 
    // (ej. cuánto desea reducir el usuario, o mantener un pago total fijo) para ser precisa.
    // Por ahora, los tests se centran en verificar la estructura de retorno esperado.

    it('should return default values if inputs are provided but no reduction logic is applied', () => {
        const principal = 12000;
        const interesAnual = 6;
        const mesesOriginales = 12;
        const cuotaBase = 1150.00;
        
        // Se asume que el resultado inicial es el valor de la implementación actual (placeholder).
        const result = calcularReduccionPago(principal, interesAnual, mesesOriginales, cuotaBase, 'cuota', 50);
        
        expect(result.nuevaCuota).toBe(0);
        expect(result.nuevosMeses).toBe(mesesOriginales);
    });

    // TODO: Cuando se implemente la reducción de CUOTA, añadir un test que verifique:
    // 1. Nueva Cuota = (Pago Total Original) / Meses Originales.
    // 2. El nuevo cuota debe ser menor o igual a la cuota base original.

    // TODO: Cuando se implemente la reducción de PLAZO, añadir un test que verifique:
    // 1. Nuevos Meses = (Principal - Pago Adicional Total) / Cuota Base.
    // 2. Los nuevos meses deben ser menores o iguales a los meses originales.

});