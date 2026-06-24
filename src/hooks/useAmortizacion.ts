"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  generarTablaAmortizacion,
  validarDatos,
  type DatosAmortizacion,
  type FilaAmortizacion,
} from "@/lib/amortizacion";

// Campos del formulario que deben almacenarse como número (los <input type="number">
// entregan siempre un string en target.value, así que hay que convertirlos).
const CAMPOS_NUMERICOS = new Set<keyof DatosAmortizacion>([
  "importeInicial",
  "interesAnual",
  "mesesRestantes",
  "amortizacionAdicional",
]);

// Normaliza los campos numéricos a number antes de calcular. Garantiza que el
// worker (incluso una instancia stale de HMR sin la guarda) y el cálculo
// síncrono nunca reciban strings, evitando "additional.toFixed is not a function".
function normalizarDatos(datos: DatosAmortizacion): DatosAmortizacion {
  return {
    ...datos,
    importeInicial: Number(datos.importeInicial) || 0,
    interesAnual: Number(datos.interesAnual) || 0,
    mesesRestantes: Number(datos.mesesRestantes) || 0,
    amortizacionAdicional: Number(datos.amortizacionAdicional) || 0,
  };
}

const VALORES_INICIALES: DatosAmortizacion = {
  importeInicial: 100000,
  interesAnual: 3,
  mesesRestantes: 120,
  amortizacionAdicional: 0,
  tipoAmortizacion: "puntual",
  reducir: "cuota",
  mantenerPagoConstante: false,
};

// ── Código inline del worker (JS vanilla para evitar dependencias de bundler) ──
export const WORKER_CODE = `
function calcularCuotaFrances(importe, interesAnual, meses) {
  var interesMensual = interesAnual / 100 / 12;
  if (interesMensual === 0) return importe / meses;
  return (importe * interesMensual) / (1 - Math.pow(1 + interesMensual, -meses));
}

function generarTablaAmortizacion(datos, additionalValues) {
  var importeInicial = datos.importeInicial;
  var interesAnual = datos.interesAnual;
  var mesesRestantes = datos.mesesRestantes;
  var amortizacionAdicional = datos.amortizacionAdicional;
  var tipoAmortizacion = datos.tipoAmortizacion;
  var reducir = datos.reducir;
  var mantenerPagoConstante = datos.mantenerPagoConstante;
  var saldoPendiente = importeInicial;
  var tabla = [];
  var totalIntereses = 0;
  var interesMensual = interesAnual / 100 / 12;
  var currentDate = new Date();
  currentDate.setDate(1);
  var cuotaOriginal = reducir === "plazo"
    ? calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes)
    : null;

  for (var mes = 1; mes <= mesesRestantes; mes++) {
    var d = String(currentDate.getDate()).padStart(2, "0");
    var m = String(currentDate.getMonth() + 1).padStart(2, "0");
    var a = currentDate.getFullYear();
    var fecha = d + "/" + m + "/" + a;
    currentDate.setMonth(currentDate.getMonth() + 1);

    var rawAdditional =
      additionalValues[mes] !== undefined
        ? additionalValues[mes]
        : (tipoAmortizacion === "puntual" && mes === 1) ||
          tipoAmortizacion === "mensual" ||
          (tipoAmortizacion === "anual" && mes % 12 === 0)
          ? amortizacionAdicional
          : 0;
    // Forzar conversión a número para evitar errores de tipo en el worker
    var additional = Number(rawAdditional) || 0;

    if (tipoAmortizacion === "puntual" && mes === 1) {
      saldoPendiente -= additional;
    }

    var cuotaMensual = reducir === "cuota"
      ? calcularCuotaFrances(saldoPendiente, interesAnual, mesesRestantes - mes + 1)
      : calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes);

    var interesMes = saldoPendiente * interesMensual;
    var amortizacionMes = cuotaMensual - interesMes;

    if (reducir === "cuota" && mantenerPagoConstante && cuotaOriginal !== null) {
      var pagoExtra = cuotaOriginal - cuotaMensual;
      if (pagoExtra > 0) {
        amortizacionMes += pagoExtra;
      }
    }

    if (tipoAmortizacion === "mensual" || (tipoAmortizacion === "anual" && mes % 12 === 0)) {
      saldoPendiente -= additional;
    }

    saldoPendiente -= amortizacionMes;
    if (saldoPendiente < 0) saldoPendiente = 0;
    totalIntereses += interesMes;

    tabla.push({
      mes: mes,
      fecha: fecha,
      cuota: cuotaMensual.toFixed(2),
      intereses: interesMes.toFixed(2),
      amortizacion: amortizacionMes.toFixed(2),
      amortizacionAdicional: additional.toFixed(2),
      saldoPendiente: saldoPendiente.toFixed(2),
      interesesAcumulados: totalIntereses.toFixed(2),
    });

    if (saldoPendiente === 0) break;
  }

  return { tabla: tabla, totalIntereses: totalIntereses };
}

self.onmessage = function (e) {
  var id = e.data.id;
  var datos = e.data.datos;
  var additionalValues = e.data.additionalValues || {};
  try {
    var result = generarTablaAmortizacion(datos, additionalValues);
    self.postMessage({ id: id, result: result });
  } catch (error) {
    self.postMessage({ id: id, error: error instanceof Error ? error.message : "Error en worker" });
  }
};
`;

let workerBlobUrl: string | null = null;

function getWorkerUrl(): string | null {
  if (typeof Blob === "undefined" || typeof URL === "undefined") return null;
  if (workerBlobUrl) return workerBlobUrl;
  try {
    const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
    workerBlobUrl = URL.createObjectURL(blob);
    return workerBlobUrl;
  } catch {
    return null;
  }
}

// ── Hook principal ──
export function useAmortizacion() {
  const [formData, setFormData] = useState<DatosAmortizacion>(VALORES_INICIALES);
  const [tablaAmortizacion, setTablaAmortizacion] = useState<FilaAmortizacion[]>([]);
  const [totalInteresesPagados, setTotalInteresesPagados] = useState("0");
  const [additionalValues, setAdditionalValues] = useState<Record<number, number>>({});
  const [calculando, setCalculando] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<"idle" | "worker" | "sync">("idle");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Web Worker (Blob URL — compatible con turbopack) ──
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const workerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const url = getWorkerUrl();
    if (!url) return;
    try {
      workerRef.current = new Worker(url);
    } catch {
      workerRef.current = null;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const validarFormulario = useCallback((): boolean => {
    const errores = validarDatos(formData);
    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  }, [formData]);

  const aplicarResultado = useCallback(
    (tabla: FilaAmortizacion[], total: number) => {
      setTablaAmortizacion(tabla);
      setTotalInteresesPagados(total.toFixed(2));
    },
    []
  );

  // ── Cálculo (Web Worker / sync fallback) ──
  const calcularAmortizacion = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!validarFormulario()) return;
    setCalculando(true);
    setModoCalculo("idle");

    const worker = workerRef.current;
    const requestId = ++requestIdRef.current;
    // Datos saneados: número garantizado en campos numéricos.
    const datos = normalizarDatos(formData);

    if (worker) {
      if (workerTimeoutRef.current) clearTimeout(workerTimeoutRef.current);

      workerTimeoutRef.current = setTimeout(() => {
        console.warn("Worker timeout — usando cálculo síncrono");
        const { tabla, totalIntereses } = generarTablaAmortizacion(
          datos,
          additionalValues
        );
        aplicarResultado(tabla, totalIntereses);
        setModoCalculo("sync");
        setCalculando(false);
      }, 5000);

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.id !== requestId) return;
        if (workerTimeoutRef.current) clearTimeout(workerTimeoutRef.current);
        if (e.data.error) {
          console.error("Error en worker:", e.data.error);
          setCalculando(false);
          return;
        }
        aplicarResultado(e.data.result.tabla, e.data.result.totalIntereses);
        setModoCalculo("worker");
        setCalculando(false);
      };

      worker.onerror = () => {
        if (workerTimeoutRef.current) clearTimeout(workerTimeoutRef.current);
        const { tabla, totalIntereses } = generarTablaAmortizacion(
          datos,
          additionalValues
        );
        aplicarResultado(tabla, totalIntereses);
        setModoCalculo("sync");
        setCalculando(false);
      };

      worker.postMessage({ id: requestId, datos, additionalValues });
    } else {
      const { tabla, totalIntereses } = generarTablaAmortizacion(
        datos,
        additionalValues
      );
      aplicarResultado(tabla, totalIntereses);
      setModoCalculo("sync");
      setCalculando(false);
    }
  }, [formData, additionalValues, validarFormulario, aplicarResultado]);

  // ── Debounce ──
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      calcularAmortizacion();
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [calcularAmortizacion]);

  const handleChange = useCallback(
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
        | { target: { name: string; value: string | number | boolean } }
    ) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      const { name } = target;
      let value: string | number | boolean =
        target.type === "checkbox"
          ? (target as HTMLInputElement).checked
          : target.value;

      // Convertir a número los campos numéricos: el input devuelve string y el
      // cálculo (worker y síncrono) espera number. "" se trata como 0.
      if (CAMPOS_NUMERICOS.has(name as keyof DatosAmortizacion) && typeof value === "string") {
        value = value === "" ? 0 : Number(value);
      }

      setFormErrors((prev) => {
        const nuevo = { ...prev };
        delete nuevo[name];
        return nuevo;
      });

      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    },
    []
  );

  const handleAdditionalChange = useCallback((mes: number, value: number) => {
    setAdditionalValues((prev) => ({
      ...prev,
      [mes]: value,
    }));
  }, []);

  const resetFormulario = useCallback(() => {
    setFormData(VALORES_INICIALES);
    setTablaAmortizacion([]);
    setTotalInteresesPagados("0");
    setAdditionalValues({});
    setFormErrors({});
    setModoCalculo("idle");
  }, []);

  return {
    formData,
    tablaAmortizacion,
    totalInteresesPagados,
    additionalValues,
    calculando,
    formErrors,
    handleChange,
    handleAdditionalChange,
    calcularAmortizacion,
    resetFormulario,
    modoCalculo,
  };
}
