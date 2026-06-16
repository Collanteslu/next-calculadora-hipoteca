import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Testeamos la lógica del worker sin depender del bundler
// El WORKER_CODE se evalúa para simular el entorno del worker
let workerHandler: ((e: MessageEvent) => void) | null = null;

async function loadWorkerHandler() {
  const mod = await import("../hooks/useAmortizacion");
  // Simulamos self como el contexto del worker
  const mockSelf = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    postMessage: vi.fn(),
  };
  vi.stubGlobal("self", mockSelf);
  eval((mod as unknown as { WORKER_CODE: string }).WORKER_CODE);
  workerHandler = (mockSelf as unknown as { onmessage: (e: MessageEvent) => void }).onmessage;
}

describe("amortizacion.worker — Blob URL worker", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    workerHandler = null;
    await loadWorkerHandler();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    workerHandler = null;
  });

  it("procesa un mensaje válido y devuelve resultado", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("self", {
      onmessage: workerHandler,
      postMessage: mockPostMessage,
    });

    workerHandler!({
      data: {
        id: 1,
        datos: {
          importeInicial: 100000, interesAnual: 3, mesesRestantes: 120,
          amortizacionAdicional: 0, tipoAmortizacion: "puntual",
          reducir: "cuota", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const call = mockPostMessage.mock.calls[0][0];
    expect(call.id).toBe(1);
    expect(call.result.tabla).toHaveLength(120);
  });

  it("devuelve el ID correcto en la respuesta", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("self", {
      onmessage: workerHandler,
      postMessage: mockPostMessage,
    });

    workerHandler!({
      data: {
        id: 42,
        datos: {
          importeInicial: 50000, interesAnual: 2, mesesRestantes: 60,
          amortizacionAdicional: 0, tipoAmortizacion: "puntual",
          reducir: "cuota", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockPostMessage.mock.calls[0][0].id).toBe(42);
    expect(mockPostMessage.mock.calls[0][0].result.tabla).toHaveLength(60);
  });

  it("procesa valores adicionales correctamente", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("self", {
      onmessage: workerHandler,
      postMessage: mockPostMessage,
    });

    workerHandler!({
      data: {
        id: 1,
        datos: {
          importeInicial: 100000, interesAnual: 3, mesesRestantes: 12,
          amortizacionAdicional: 1000, tipoAmortizacion: "mensual",
          reducir: "cuota", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    const tabla = mockPostMessage.mock.calls[0][0].result.tabla;
    expect(tabla).toHaveLength(12);
    for (const fila of tabla) {
      expect(fila.amortizacionAdicional).toBe("1000.00");
    }
  });

  it("maneja datos inválidos sin crashear", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("self", {
      onmessage: workerHandler,
      postMessage: mockPostMessage,
    });

    // mesesRestantes = 0 -> no itera, tabla vacía
    workerHandler!({
      data: {
        id: 1,
        datos: {
          importeInicial: 100000, interesAnual: 3, mesesRestantes: 0,
          amortizacionAdicional: 0, tipoAmortizacion: "puntual",
          reducir: "cuota", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockPostMessage.mock.calls[0][0].result).toBeDefined();
  });

  it("maneja múltiples requests secuenciales", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("self", {
      onmessage: workerHandler,
      postMessage: mockPostMessage,
    });

    workerHandler!({
      data: {
        id: 1,
        datos: {
          importeInicial: 100000, interesAnual: 3, mesesRestantes: 24,
          amortizacionAdicional: 0, tipoAmortizacion: "puntual",
          reducir: "cuota", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    workerHandler!({
      data: {
        id: 2,
        datos: {
          importeInicial: 200000, interesAnual: 4, mesesRestantes: 36,
          amortizacionAdicional: 0, tipoAmortizacion: "puntual",
          reducir: "plazo", mantenerPagoConstante: false,
        },
        additionalValues: {},
      },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(2);
    const r1 = mockPostMessage.mock.calls[0][0];
    const r2 = mockPostMessage.mock.calls[1][0];
    expect(r1.id).toBe(1);
    expect(r1.result.tabla).toHaveLength(24);
    expect(r2.id).toBe(2);
    expect(r2.result.tabla).toHaveLength(36);
  });
});
