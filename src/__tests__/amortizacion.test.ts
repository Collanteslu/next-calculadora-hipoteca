import { describe, it, expect } from "vitest";
import {
  calcularCuotaFrances,
  generarTablaAmortizacion,
  validarDatos,
} from "@/lib/amortizacion";

describe("calcularCuotaFrances", () => {
  it("calcula cuota correcta para 100.000€ al 3% en 120 meses", () => {
    const cuota = calcularCuotaFrances(100000, 3, 120);
    expect(cuota).toBeCloseTo(965.61, 1);
  });

  it("calcula cuota correcta para 200.000€ al 2.5% en 240 meses", () => {
    const cuota = calcularCuotaFrances(200000, 2.5, 240);
    expect(cuota).toBeCloseTo(1059.62, 0); // ~1059.62€/mes
  });

  it("devuelve importe/meses cuando el interés es 0%", () => {
    const cuota = calcularCuotaFrances(120000, 0, 12);
    expect(cuota).toBe(10000);
  });
});

describe("generarTablaAmortizacion - sin adicional", () => {
  const datos = {
    importeInicial: 100000,
    interesAnual: 3,
    mesesRestantes: 12,
    amortizacionAdicional: 0,
    tipoAmortizacion: "puntual" as const,
    reducir: "cuota" as const,
    mantenerPagoConstante: false,
  };

  it("genera tabla con 12 filas", () => {
    const { tabla } = generarTablaAmortizacion(datos);
    expect(tabla).toHaveLength(12);
  });

  it("primer mes tiene intereses de 250€", () => {
    const { tabla } = generarTablaAmortizacion(datos);
    expect(tabla[0].intereses).toBe("250.00");
  });

  it("último mes saldo es 0", () => {
    const { tabla } = generarTablaAmortizacion(datos);
    expect(tabla[tabla.length - 1].saldoPendiente).toBe("0.00");
  });

  it("calcula total intereses correcto", () => {
    const { totalIntereses } = generarTablaAmortizacion(datos);
    expect(totalIntereses).toBeCloseTo(1632.44, 0);
  });
});

describe("generarTablaAmortizacion - con puntual 10.000€", () => {
  const datos = {
    importeInicial: 100000,
    interesAnual: 3,
    mesesRestantes: 12,
    amortizacionAdicional: 10000,
    tipoAmortizacion: "puntual" as const,
    reducir: "cuota" as const,
    mantenerPagoConstante: false,
  };

  it("mes 1 tiene amortización adicional de 10.000€", () => {
    const { tabla } = generarTablaAmortizacion(datos);
    expect(tabla[0].amortizacionAdicional).toBe("10000.00");
  });

  it("ahorra intereses respecto a sin adicional", () => {
    const datosBase = { ...datos, amortizacionAdicional: 0 };
    const { totalIntereses: sinExtra } = generarTablaAmortizacion(datosBase);
    const { totalIntereses: conExtra } = generarTablaAmortizacion(datos);
    expect(conExtra).toBeLessThan(sinExtra);
  });

  it("reduce el número de pagos con reducir: plazo", () => {
    const datosPlazo = { ...datos, reducir: "plazo" as const };
    const { tabla } = generarTablaAmortizacion(datosPlazo);
    expect(tabla.length).toBeLessThan(12);
  });
});

describe("generarTablaAmortizacion - mensual 500€", () => {
  const datos = {
    importeInicial: 100000,
    interesAnual: 3,
    mesesRestantes: 12,
    amortizacionAdicional: 500,
    tipoAmortizacion: "mensual" as const,
    reducir: "cuota" as const,
    mantenerPagoConstante: false,
  };

  it("cada mes tiene amortización adicional de 500€", () => {
    const { tabla } = generarTablaAmortizacion(datos);
    tabla.forEach((fila) => {
      expect(fila.amortizacionAdicional).toBe("500.00");
    });
  });

  it("termina antes o igual que sin adicional", () => {
    const datosBase = { ...datos, amortizacionAdicional: 0 };
    const { tabla: sinExtra } = generarTablaAmortizacion(datosBase);
    const { tabla: conExtra } = generarTablaAmortizacion(datos);
    expect(conExtra.length).toBeLessThanOrEqual(sinExtra.length);
  });
});

describe("validarDatos", () => {
  it("retorna error para importe 0", () => {
    const errores = validarDatos({ importeInicial: 0 });
    expect(errores.importeInicial).toBeDefined();
  });

  it("retorna error para meses negativos", () => {
    const errores = validarDatos({ mesesRestantes: -1 });
    expect(errores.mesesRestantes).toBeDefined();
  });

  it("retorna vacío para datos válidos", () => {
    const errores = validarDatos({
      importeInicial: 100000,
      interesAnual: 3,
      mesesRestantes: 120,
      amortizacionAdicional: 0,
    });
    expect(Object.keys(errores)).toHaveLength(0);
  });
});
