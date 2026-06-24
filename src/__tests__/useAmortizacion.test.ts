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
    delete (globalThis as Record<string, unknown>).Worker;

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    // 120 meses por defecto
    expect(result.current.tablaAmortizacion).toHaveLength(120);
    expect(result.current.calculando).toBe(false);
  });

  it("inicializa el worker correctamente", () => {
    setupWorker();
    renderHook(() => useAmortizacion());
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
  });

  it("envía al worker los campos numéricos como number (protege a un worker stale)", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.handleChange({
        target: { name: "amortizacionAdicional", value: "500", type: "number" },
      } as unknown as Parameters<typeof result.current.handleChange>[0]);
    });

    act(() => {
      result.current.calcularAmortizacion();
    });

    const payload = workerInstance!.postMessage.mock.calls.at(-1)![0];
    expect(typeof payload.datos.amortizacionAdicional).toBe("number");
    expect(payload.datos.amortizacionAdicional).toBe(500);
    expect(typeof payload.datos.importeInicial).toBe("number");
  });

  it("actualiza el estado cuando el worker responde correctamente", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    const tabla = Array.from({ length: 6 }, (_, i) => ({
      mes: i + 1,
      fecha: "01/06/2025",
      cuota: "17000.00",
      intereses: "250.00",
      amortizacion: "16750.00",
      amortizacionAdicional: "0.00",
      saldoPendiente: "0.00",
      interesesAcumulados: "1500.00",
    }));

    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla, totalIntereses: 1500 } },
      } as MessageEvent);
    });

    expect(result.current.tablaAmortizacion).toHaveLength(6);
    expect(result.current.totalInteresesPagados).toBe("1500.00");
    expect(result.current.calculando).toBe(false);
  });

  it("descarta respuestas stale (requestId antiguo)", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });
    act(() => {
      result.current.calcularAmortizacion();
    });

    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla: [], totalIntereses: 9999 } },
      } as MessageEvent);
    });

    expect(result.current.totalInteresesPagados).toBe("0");
  });

  it("convierte a número los campos numéricos editados (no deja strings en formData)", () => {
    delete (globalThis as Record<string, unknown>).Worker;

    const { result } = renderHook(() => useAmortizacion());

    // El input type="number" entrega siempre un string en target.value
    act(() => {
      result.current.handleChange({
        target: { name: "amortizacionAdicional", value: "500", type: "number" },
      } as unknown as Parameters<typeof result.current.handleChange>[0]);
    });

    expect(typeof result.current.formData.amortizacionAdicional).toBe("number");
    expect(result.current.formData.amortizacionAdicional).toBe(500);
  });

  it("no lanza error al calcular tras insertar una amortización adicional por defecto (string del input)", () => {
    delete (globalThis as Record<string, unknown>).Worker;

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.handleChange({
        target: { name: "amortizacionAdicional", value: "500", type: "number" },
      } as unknown as Parameters<typeof result.current.handleChange>[0]);
    });

    // Antes del fix esto lanzaba "additional.toFixed is not a function"
    expect(() => {
      act(() => {
        result.current.calcularAmortizacion();
      });
    }).not.toThrow();

    expect(result.current.tablaAmortizacion.length).toBeGreaterThan(0);
    expect(result.current.tablaAmortizacion[0].amortizacionAdicional).toBe("500.00");
  });

  it("resetea el formulario correctamente", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla: [{ mes: 1, fecha: "", cuota: "", intereses: "", amortizacion: "", amortizacionAdicional: "", saldoPendiente: "", interesesAcumulados: "" }], totalIntereses: 100 } },
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

// ── Tests de modoCalculo ──
describe("useAmortizacion — estado modoCalculo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    teardownWorker();
  });

  it("inicia en 'idle'", () => {
    const { result } = renderHook(() => useAmortizacion());
    expect(result.current.modoCalculo).toBe("idle");
  });

  it("cambia a 'idle' al iniciar un nuevo cálculo", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    // Primero hacemos un cálculo por worker
    act(() => {
      result.current.calcularAmortizacion();
    });
    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla: [], totalIntereses: 0 } },
      } as MessageEvent);
    });
    expect(result.current.modoCalculo).toBe("worker");

    // Al iniciar otro cálculo, vuelve a idle
    act(() => {
      result.current.calcularAmortizacion();
    });
    expect(result.current.modoCalculo).toBe("idle");
  });

  it("cambia a 'worker' cuando el worker responde exitosamente", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    expect(result.current.modoCalculo).toBe("idle"); // idle durante el cálculo

    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla: [], totalIntereses: 0 } },
      } as MessageEvent);
    });

    expect(result.current.modoCalculo).toBe("worker");
  });

  it("cambia a 'sync' cuando no hay Worker disponible", () => {
    delete (globalThis as Record<string, unknown>).Worker;

    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    expect(result.current.modoCalculo).toBe("sync");
  });

  it("cambia a 'sync' cuando el worker emite onerror", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    act(() => {
      workerInstance!.onerror!(new Event("error"));
    });

    expect(result.current.modoCalculo).toBe("sync");
    expect(result.current.tablaAmortizacion).toHaveLength(120); // fallback síncrono
    expect(result.current.calculando).toBe(false);
  });

  it("cambia a 'sync' cuando el worker timeout se dispara", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });

    expect(result.current.modoCalculo).toBe("idle");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.modoCalculo).toBe("sync");
    expect(result.current.tablaAmortizacion).toHaveLength(120);
    expect(result.current.calculando).toBe(false);
  });

  it("vuelve a 'idle' al hacer reset del formulario", () => {
    setupWorker();
    const { result } = renderHook(() => useAmortizacion());

    act(() => {
      result.current.calcularAmortizacion();
    });
    act(() => {
      workerInstance!.onmessage!({
        data: { id: 1, result: { tabla: [], totalIntereses: 0 } },
      } as MessageEvent);
    });
    expect(result.current.modoCalculo).toBe("worker");

    act(() => {
      result.current.resetFormulario();
    });

    expect(result.current.modoCalculo).toBe("idle");
  });
});
