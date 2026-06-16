import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAmortizacion } from "@/hooks/useAmortizacion";

// ── Mock Worker controlado ──
let workerInstance: {
  postMessage: ReturnType<typeof vi.fn>;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  terminate: ReturnType<typeof vi.fn>;
} | null = null;

class MockWorker {
  postMessage = vi.fn();
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  terminate = vi.fn();

  constructor() {
    workerInstance = this;
  }
}

const originalWorker = globalThis.Worker;

function setupWorker() {
  workerInstance = null;
  globalThis.Worker = MockWorker as unknown as typeof Worker;
}

function teardownWorker() {
  globalThis.Worker = originalWorker;
  workerInstance = null;
}

describe("useAmortizacion — integración con Web Worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    teardownWorker();
  });

  it("usa cálculo síncrono cuando Worker no está disponible", () => {
    // jsdom no expone Worker por defecto (es undefined)
    // Aseguramos que no esté disponible
    delete (globalThis as Record<string, unknown>).Worker;

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    // Con valores por defecto (120 meses), la tabla tiene 120 filas
    expect(result.current.tablaAmortizacion).toHaveLength(120);
    expect(result.current.calculando).toBe(false);
  });

  it("inicializa el worker correctamente", () => {
    setupWorker();

    renderHook(() => useAmortizacion());

    // El worker se instancia en el useEffect
    expect(workerInstance).not.toBeNull();
  });

  it("postMessage envía los datos correctos al worker", () => {
    setupWorker();

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    expect(workerInstance!.postMessage).toHaveBeenCalledTimes(1);
    const payload = workerInstance!.postMessage.mock.calls[0][0];
    expect(payload.id).toBe(1);
    expect(payload.datos.importeInicial).toBe(100000);
    expect(payload.datos.interesAnual).toBe(3);
    expect(payload.datos.mesesRestantes).toBe(120);
    expect(payload.additionalValues).toEqual({});
  });

  it("actualiza el estado cuando el worker responde correctamente", () => {
    setupWorker();

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    // Simular respuesta del worker con una tabla de 6 filas
    const tabla = Array.from({ length: 6 }, (_, i) => ({
      mes: i + 1,
      fecha: "01/06/2025",
      cuota: "17000.00",
      intereses: "250.00",
      amortizacion: "16750.00",
      amortizacionAdicional: "0.00",
      saldoPendiente: (100000 - (i + 1) * 16750).toFixed(2),
      interesesAcumulados: ((i + 1) * 250).toFixed(2),
    }));

    act(() => {
      workerInstance!.onmessage!({
        data: {
          id: 1,
          result: { tabla, totalIntereses: 1500 },
        },
      } as MessageEvent);
    });

    expect(result.current.tablaAmortizacion).toHaveLength(6);
    expect(result.current.totalInteresesPagados).toBe("1500.00");
    expect(result.current.calculando).toBe(false);
  });

  it("descarta respuestas stale (requestId antiguo)", () => {
    setupWorker();

    const { result } = renderHook(() => useAmortizacion());

    // Primer cálculo → requestId = 1
    act(() => {
      result.current.calcularAmortizacion();
    });

    // Segundo cálculo (antes de que responda el primero) → requestId = 2
    act(() => {
      result.current.calcularAmortizacion();
    });

    // Respuesta stale del request 1 (debería ignorarse)
    act(() => {
      workerInstance!.onmessage!({
        data: {
          id: 1,
          result: { tabla: [], totalIntereses: 9999 },
        },
      } as MessageEvent);
    });

    // El estado NO debe haberse actualizado con datos stale
    // (sigue con el valor inicial "0" porque la respuesta fue descartada)
    expect(result.current.totalInteresesPagados).toBe("0");
  });

  it("resetea el formulario correctamente", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    // Simular respuesta worker
    act(() => {
      workerInstance!.onmessage!({
        data: {
          id: 1,
          result: {
            tabla: [{ mes: 1, fecha: "", cuota: "", intereses: "", amortizacion: "", amortizacionAdicional: "", saldoPendiente: "", interesesAcumulados: "" }],
            totalIntereses: 100,
          },
        },
      } as MessageEvent);
    });

    expect(result.current.tablaAmortizacion).toHaveLength(1);

    act(() => {
      result.current.resetFormulario();
    });

    expect(result.current.tablaAmortizacion).toHaveLength(0);
    expect(result.current.totalInteresesPagados).toBe("0");
  });
});
