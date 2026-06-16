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

  // Paginas visibles memoizadas para evitar recrear arrays en cada render
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

  const calcularAmortizacion = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!validarFormulario()) return;
    setCalculando(true);
    const { tabla, totalIntereses } = generarTablaAmortizacion(
      formData,
      additionalValues
    );
    setTablaAmortizacion(tabla);
    setTotalInteresesPagados(totalIntereses.toFixed(2));
    setCurrentPage(1);
    setCalculando(false);
  }, [formData, additionalValues, validarFormulario]);

  // Auto-calcular con debounce al cambiar formulario o adicionales por fila
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
