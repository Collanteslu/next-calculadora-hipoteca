"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/ui/toggle-theme";
import { motion, AnimatePresence } from "framer-motion";

import {
  generarTablaAmortizacion,
  validarDatos,
  type DatosAmortizacion,
  type FilaAmortizacion,
} from "@/lib/amortizacion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [formData, setFormData] = useState<DatosAmortizacion>({
    importeInicial: 100000,
    interesAnual: 3,
    mesesRestantes: 120,
    amortizacionAdicional: 0,
    tipoAmortizacion: "puntual",
    reducir: "cuota",
    mantenerPagoConstante: false,
  });

  // Estado para la tabla de amortización calculada
  const [tablaAmortizacion, setTablaAmortizacion] = useState<FilaAmortizacion[]>([]);
  const [totalInteresesPagados, setTotalInteresesPagados] = useState<string>("0");

  // Estado para almacenar el valor adicional modificado para cada fila (mes)
  const [additionalValues, setAdditionalValues] = useState<Record<number, number>>({});
  const [calculando, setCalculando] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const pageSizeOptions = [12, 24, 50, 100];
  const tablaRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportPdfRef = useRef<(() => Promise<void>) | null>(null);

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

  // Manejo de cambios en los inputs del formulario (incluyendo checkbox)
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

  // Validación del formulario
  const validarFormulario = useCallback((): boolean => {
    const errores = validarDatos(formData);
    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  }, [formData]);

  // Función para calcular la tabla de amortización
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

  // Maneja el cambio en el input de amortización adicional para cada fila (mes)
  const handleAdditionalChange = useCallback((mes: number, value: number) => {
    setAdditionalValues((prev) => ({
      ...prev,
      [mes]: value,
    }));
  }, []);

  // Reiniciar formulario
  const resetFormulario = useCallback(() => {
    setFormData({
      importeInicial: 100000,
      interesAnual: 3,
      mesesRestantes: 120,
      amortizacionAdicional: 0,
      tipoAmortizacion: "puntual",
      reducir: "cuota",
      mantenerPagoConstante: false,
    });
    setTablaAmortizacion([]);
    setTotalInteresesPagados("0");
    setAdditionalValues({});
    setFormErrors({});
    setCurrentPage(1);
  }, []);

  // Exportar a CSV
  const exportarCSV = useCallback(() => {
    const encabezados = [
      "Mes,Fecha,Cuota,Intereses,Amortización,Amort. Adicional,Saldo Pendiente,Intereses Acumulados",
    ];
    const filas = tablaAmortizacion.map(
      (f) =>
        `${f.mes},${f.fecha},${f.cuota},${f.intereses},${f.amortizacion},${f.amortizacionAdicional},${f.saldoPendiente},${f.interesesAcumulados}`
    );
    const csv = [...encabezados, ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amortizacion_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [tablaAmortizacion]);

  // Exportar a PDF (carga diferida de jsPDF)
  const exportarPDF = useCallback(async () => {
    const [jsPDF, autoTable] = await Promise.all([
      import("jspdf").then((m) => m.default),
      import("jspdf-autotable").then((m) => m.default),
    ]);
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Tabla de Amortización de Hipoteca", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Importe: ${formData.importeInicial}€ | Interés: ${formData.interesAnual}% | Plazo: ${formData.mesesRestantes} meses`,
      14,
      22
    );

    const columnas = [
      "Mes",
      "Fecha",
      "Cuota",
      "Intereses",
      "Amortización",
      "Amort. Adic.",
      "Saldo Pend.",
      "Int. Acum.",
    ];
    const datos = tablaAmortizacion.map((f) => [
      f.mes,
      f.fecha,
      f.cuota,
      f.intereses,
      f.amortizacion,
      f.amortizacionAdicional,
      f.saldoPendiente,
      f.interesesAcumulados,
    ]);

    autoTable(doc, {
      head: [columnas],
      body: datos,
      startY: 28,
      theme: "grid",
      styles: { fontSize: 7 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`amortizacion_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [tablaAmortizacion, formData]);

  // Cambiar página
  const irPagina = useCallback((pagina: number) => {
    if (pagina >= 1 && pagina <= totalPages) {
      setCurrentPage(pagina);
      tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [totalPages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-50/30 dark:from-background dark:via-background dark:to-emerald-950/20 transition-colors"
    >
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        <header className="flex justify-between items-center mb-8 md:mb-10">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-1 w-16 bg-primary rounded-full mb-3" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Calculadora de Amortización
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Simula tu hipoteca al instante — sistema francés
            </p>
          </motion.div>
          <ModeToggle aria-label="Cambiar tema" />
        </header>

        <main>
          {/* Tarjeta del Formulario */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="card-premium p-6 md:p-8 mb-8"
            aria-label="Formulario de datos de la hipoteca"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="inline-block w-2 h-5 bg-primary rounded-full" aria-hidden="true" />
              Datos de la Hipoteca
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label-form">
                Importe Inicial Pendiente
              </label>
              <Input
                type="number"
                name="importeInicial"
                value={formData.importeInicial}
                onChange={handleChange}
                className={`input-field ${formErrors.importeInicial ? "border-destructive" : ""}`}
              />
              {formErrors.importeInicial && (
                <p className="text-destructive text-xs mt-1">{formErrors.importeInicial}</p>
              )}
            </div>
            <div>
              <label className="label-form">Interés Anual</label>
              <Input
                type="number"
                name="interesAnual"
                value={formData.interesAnual}
                onChange={handleChange}
                className={`input-field ${formErrors.interesAnual ? "border-destructive" : ""}`}
              />
              {formErrors.interesAnual && (
                <p className="text-destructive text-xs mt-1">{formErrors.interesAnual}</p>
              )}
            </div>
            <div>
              <label className="label-form">Meses Restantes</label>
              <Input
                type="number"
                name="mesesRestantes"
                value={formData.mesesRestantes}
                onChange={handleChange}
                className={`input-field ${formErrors.mesesRestantes ? "border-destructive" : ""}`}
              />
              {formErrors.mesesRestantes && (
                <p className="text-destructive text-xs mt-1">{formErrors.mesesRestantes}</p>
              )}
            </div>
            <div>
              <label className="label-form">
                Amortización Adicional (por defecto)
              </label>
              <Input
                type="number"
                name="amortizacionAdicional"
                value={formData.amortizacionAdicional}
                onChange={handleChange}
                className={`input-field ${formErrors.amortizacionAdicional ? "border-destructive" : ""}`}
              />
              {formErrors.amortizacionAdicional && (
                <p className="text-destructive text-xs mt-1">{formErrors.amortizacionAdicional}</p>
              )}
            </div>
            <div>
              <label className="label-form">Tipo de Amortización</label>
              <Select
                name="tipoAmortizacion"
                value={formData.tipoAmortizacion}
                onValueChange={(value) =>
                  handleChange({ target: { name: "tipoAmortizacion", value } })
                }
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="puntual">Puntual</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="label-form">Reducir</label>
              <Select
                name="reducir"
                value={formData.reducir}
                onValueChange={(value) =>
                  handleChange({ target: { name: "reducir", value } })
                }
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuota">Cuota mensual</SelectItem>
                  <SelectItem value="plazo">Plazo total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Input
                id="mantenerPagoConstante"
                type="checkbox"
                name="mantenerPagoConstante"
                checked={formData.mantenerPagoConstante}
                onChange={handleChange}
                disabled={formData.reducir !== "cuota"}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
              />
              <label
                htmlFor="mantenerPagoConstante"
                className={`text-sm font-medium cursor-pointer select-none ${formData.reducir !== "cuota" ? "text-muted-foreground" : ""}`}
              >
                Mantener el pago total constante
                {formData.reducir !== "cuota" && (
                  <span className="block text-xs text-muted-foreground/60">Solo disponible con "Reducir cuota"</span>
                )}
              </label>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              <button onClick={resetFormulario} type="button" className="btn-secondary text-sm">
                Reiniciar
              </button>
              {tablaAmortizacion.length > 0 && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {calculando ? "Calculando…" : "Actualizado ⏎"}
                </span>
              )}
            </div>
            <button
              onClick={calcularAmortizacion}
              disabled={calculando}
              type="button"
              className="btn-primary text-base order-1 sm:order-2"
            >
              {calculando ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculando…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {tablaAmortizacion.length > 0 ? "Actualizar" : "Calcular"}
                </span>
              )}
            </button>
          </div>
        </motion.section>

        {/* Tabla de Resultados */}
        <AnimatePresence>
        {tablaAmortizacion.length > 0 && (
          <motion.section
            ref={tablaRef}
            key="tabla-resultados"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card-premium p-6 md:p-8"
            aria-label="Tabla de amortización"
            role="region"
          >
            <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="inline-block w-2 h-5 bg-primary rounded-full" aria-hidden="true" />
                Tabla de Amortización
              </h2>
              <div className="flex gap-2">
                <button onClick={exportarCSV} type="button" className="btn-secondary text-xs">
                  CSV
                </button>
                <button onClick={exportarPDF} type="button" className="btn-secondary text-xs">
                  PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y">
                <thead>
                  <tr className="bg-muted/50">
                    {["Mes", "Fecha", "Cuota", "Intereses", "Amortización", "Amort. Adic.", "Saldo Pend.", "Int. Acum."].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedData.map((fila, index) => {
                    const valorInput =
                      additionalValues[fila.mes] !== undefined
                        ? additionalValues[fila.mes]
                        : (
                            ((formData.tipoAmortizacion === "puntual" && fila.mes === 1) ||
                              formData.tipoAmortizacion === "mensual" ||
                              (formData.tipoAmortizacion === "anual" && fila.mes % 12 === 0))
                              ? formData.amortizacionAdicional
                              : 0
                          );
                    return (
                      <motion.tr
                        key={fila.mes}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: index * 0.015 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-sm text-center font-medium">{fila.mes}</td>
                        <td className="px-3 py-2.5 text-sm text-center text-muted-foreground">{fila.fecha}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono">{fila.cuota}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-muted-foreground">{fila.intereses}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono">{fila.amortizacion}</td>
                        <td className="px-3 py-2.5 text-sm text-right">
                          <input
                            type="number"
                            value={valorInput}
                            onChange={(e) =>
                              handleAdditionalChange(fila.mes, Number(e.target.value))
                            }
                            className="w-20 text-right px-2 py-1 text-sm font-mono rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono font-medium">{fila.saldoPendiente}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {fila.interesesAcumulados}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-wrap justify-between items-center gap-3 mt-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-background border rounded-md px-2 py-1 text-xs font-medium text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                  <option value={tablaAmortizacion.length}>Todas</option>
                </select>
                <span className="ml-1">
                  {tablaAmortizacion.length} filas
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => irPagina(currentPage - 1)}
                    disabled={currentPage === 1}
                    type="button"
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    ← Anterior
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center gap-1.5">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-xs text-muted-foreground">···</span>
                          )}
                          <button
                            onClick={() => irPagina(p)}
                            type="button"
                            aria-current={p === currentPage ? "page" : undefined}
                            className={`text-xs font-medium rounded-md w-8 h-8 transition-colors ${
                              p === currentPage
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                  </div>
                  <button
                    onClick={() => irPagina(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    type="button"
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>

            {/* Total */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
            >
              <span className="text-sm text-muted-foreground">
                {tablaAmortizacion.length} cuotas simuladas
              </span>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">Total intereses pagados</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {totalInteresesPagados} €
                </span>
              </div>
            </motion.div>
            </motion.section>
        )}
        </AnimatePresence>
        </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center text-xs text-muted-foreground/60 pb-4"
        >
          Calculadora de amortización — Sistema Francés
        </motion.footer>
      </div>
    </motion.div>
  );
}
