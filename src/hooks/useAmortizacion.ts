"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  generarTablaAmortizacion,
  validarDatos,
  type DatosAmortizacion,
  type FilaAmortizacion,
} from "@/lib/amortizacion";

const VALORES_INICIALES: DatosAmortizacion = {
  importeInicial: 100000,
  interesAnual: 3,
  mesesRestantes: 120,
  amortizacionAdicional: 0,
  tipoAmortizacion: "puntual",
  reducir: "cuota",
  mantenerPagoConstante: false,
};

const PAGE_SIZE_OPTIONS = [12, 24, 50, 100] as const;

// ── Código inline del worker (evita depender de new URL() + bundler) ──
// Incluye calcularCuotaFrances y generarTablaAmortizacion como funciones puras
export const WORKER_CODE = `
function calcularCuotaFrances(importe, interesAnual, meses) {
  var interesMensual = interesAnual / 100 / 12;
  if (interesMensual === 0) return importe / meses;
  return (importe * interesMensual) / (1 - Math.pow(1 + interesMensual, -meses));
}

function generarTablaAmortizacion(datos, additionalValues, fechaReferencia) {
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
  var today = fechaReferencia ? new Date(fechaReferencia) : new Date();
  var startYear = today.getFullYear();
  var startMonth = today.getMonth();
  var cuotaOriginal = reducir === "plazo"
    ? calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes)
    : null;

  for (var mes = 1; mes <= mesesRestantes; mes++) {
    var currentDate = new Date(startYear, startMonth + mes - 1, 1);
    var d = String(currentDate.getDate()).padStart(2, "0");
    var m = String(currentDate.getMonth() + 1).padStart(2, "0");
    var a = currentDate.getFullYear();
    var fecha = d + "/" + m + "/" + a;
    var additional = 0;
    if (additionalValues[mes] !== undefined) {
      additional = Number(additionalValues[mes]);
    } else if (
      (tipoAmortizacion === "puntual" && mes === 1) ||
      tipoAmortizacion === "mensual" ||
      (tipoAmortizacion === "anual" && mes % 12 === 0)
    ) {
      additional = Number(amortizacionAdicional);
    }

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
      amortizacionAdicional: Number(additional).toFixed(2),
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Web Worker (Blob URL — compatible con turbopack, webpack, vite) ──
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

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

  const paginatedData = useMemo(
    () =>
      tablaAmortizacion.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [tablaAmortizacion, currentPage, pageSize]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tablaAmortizacion.length / pageSize)),
    [tablaAmortizacion.length, pageSize]
  );

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        Math.abs(i - currentPage) <= 1
      ) {
        pages.push(i);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const validarFormulario = useCallback((): boolean => {
    const errores = validarDatos(formData);
    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  }, [formData]);

  // ── Cálculo (vía Web Worker si está disponible, si no síncrono) ──
  const calcularAmortizacion = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!validarFormulario()) return;
    setCalculando(true);

    const worker = workerRef.current;
    const requestId = ++requestIdRef.current;

    const aplicarResultado = (tabla: FilaAmortizacion[], total: number) => {
      setTablaAmortizacion(tabla);
      setTotalInteresesPagados(total.toFixed(2));
      setCurrentPage(1);
    };

    if (worker) {
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.id !== requestId) return;

        if (e.data.error) {
          console.error("Error en worker:", e.data.error);
          setCalculando(false);
          return;
        }

        aplicarResultado(e.data.result.tabla, e.data.result.totalIntereses);
        setCalculando(false);
      };

      worker.onerror = () => {
        const { tabla, totalIntereses } = generarTablaAmortizacion(
          formData,
          additionalValues
        );
        aplicarResultado(tabla, totalIntereses);
        setCalculando(false);
      };

      worker.postMessage({
        id: requestId,
        datos: formData,
        additionalValues,
      });
    } else {
      const { tabla, totalIntereses } = generarTablaAmortizacion(
        formData,
        additionalValues
      );
      aplicarResultado(tabla, totalIntereses);
      setCalculando(false);
    }
  }, [formData, additionalValues, validarFormulario]);

  // Auto-calcular con debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      calcularAmortizacion();
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, additionalValues]);

  const handleChange = useCallback(
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
        | { target: { name: string; value: string | number | boolean } }
    ) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      const value =
        target.type === "checkbox"
          ? (target as HTMLInputElement).checked
          : target.value;
      const { name } = target;

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
    setCurrentPage(1);
  }, []);

  const irPagina = useCallback(
    (pagina: number) => {
      if (pagina >= 1 && pagina <= totalPages) {
        setCurrentPage(pagina);
      }
    },
    [totalPages]
  );

  return {
    formData,
    tablaAmortizacion,
    totalInteresesPagados,
    additionalValues,
    calculando,
    formErrors,
    currentPage,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    paginatedData,
    totalPages,
    handleChange,
    handleAdditionalChange,
    validarFormulario,
    calcularAmortizacion,
    resetFormulario,
    setPageSize,
    irPagina,
    visiblePages,
  };
}
