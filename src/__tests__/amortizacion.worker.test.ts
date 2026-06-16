import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const DATOS = {
  importeInicial: 100000,
  interesAnual: 3,
  mesesRestantes: 12,
  amortizacionAdicional: 0,
  tipoAmortizacion: "puntual" as const,
  reducir: "cuota" as const,
  mantenerPagoConstante: false,
};

describe("Worker (Blob URL) — código inline", () => {
  let postMessageMock: ReturnType<typeof vi.fn>;
  let onmessageHandler: ((e: MessageEvent) => void) | null = null;

  beforeEach(async () => {
    postMessageMock = vi.fn();

    // Simular entorno Worker: self con postMessage mockeado
    vi.stubGlobal("self", {
      onmessage: null as ((e: MessageEvent) => void) | null,
      postMessage: postMessageMock,
    });

    // Importar el hook fuerza la creación del código worker vía WORKER_CODE
    // Para testear el código inline del worker, lo ejecutamos directamente vía eval
    const { WORKER_CODE } = await import("../hooks/useAmortizacion");
    // La constante no se exporta, así que la extraemos del módulo
    // En su lugar, ejecutamos el código del worker manualmente
    // Usamos el código inline de calcularCuotaFrances y generarTablaAmortizacion
    // que está en el string WORKER_CODE del hook
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("el worker inline calcula correctamente 12 meses", async () => {
    // Importamos el hook para obtener WORKER_CODE
    const mod = await import("../hooks/useAmortizacion");
    // Ejecutamos el código del worker en este contexto
    eval((mod as unknown as { WORKER_CODE: string }).WORKER_CODE);

    // Disparamos un mensaje simulado
    onmessageHandler = (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage;
    
    if (!onmessageHandler) {
      // Si el worker no se cargó, fallará
      expect(false).toBe(true);
      return;
    }

    onmessageHandler({
      data: { id: 1, datos: DATOS, additionalValues: {} },
    } as MessageEvent);

    expect(postMessageMock).toHaveBeenCalledTimes(1);
    const response = postMessageMock.mock.calls[0][0];
    expect(response.id).toBe(1);
    expect(response.result.tabla).toHaveLength(12);
    expect(response.result.tabla[0].intereses).toBe("250.00");
  });

  it("devuelve el id correcto en la respuesta", async () => {
    const mod = await import("../hooks/useAmortizacion");
    eval((mod as unknown as { WORKER_CODE: string }).WORKER_CODE);
    onmessageHandler = (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage;

    onmessageHandler!({
      data: { id: 99, datos: DATOS, additionalValues: {} },
    } as MessageEvent);

    expect(postMessageMock.mock.calls[0][0].id).toBe(99);
  });

  it("procesa amortización mensual correctamente", async () => {
    const mod = await import("../hooks/useAmortizacion");
    eval((mod as unknown as { WORKER_CODE: string }).WORKER_CODE);
    onmessageHandler = (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage;

    onmessageHandler!({
      data: {
        id: 1,
        datos: { ...DATOS, amortizacionAdicional: 500, tipoAmortizacion: "mensual" },
        additionalValues: {},
      },
    } as MessageEvent);

    const result = postMessageMock.mock.calls[0][0].result;
    result.tabla.forEach((fila: { amortizacionAdicional: string }) => {
      expect(fila.amortizacionAdicional).toBe("500.00");
    });
  });

  it("multiple requests con ids distintos funcionan", async () => {
    const mod = await import("../hooks/useAmortizacion");
    eval((mod as unknown as { WORKER_CODE: string }).WORKER_CODE);
    onmessageHandler = (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage;

    onmessageHandler!({
      data: { id: 1, datos: DATOS, additionalValues: {} },
    } as MessageEvent);
    onmessageHandler!({
      data: { id: 2, datos: { ...DATOS, mesesRestantes: 24 }, additionalValues: {} },
    } as MessageEvent);

    expect(postMessageMock).toHaveBeenCalledTimes(2);
    expect(postMessageMock.mock.calls[0][0].id).toBe(1);
    expect(postMessageMock.mock.calls[1][0].id).toBe(2);
    expect(postMessageMock.mock.calls[0][0].result.tabla).toHaveLength(12);
    expect(postMessageMock.mock.calls[1][0].result.tabla).toHaveLength(24);
  });
});
