"use client";

import { useRef, useCallback, memo } from "react";
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
import type { FilaAmortizacion } from "@/lib/amortizacion";
import { useAmortizacion } from "@/hooks/useAmortizacion";
import { useExport } from "@/hooks/useExport";

// ── Fila de tabla memoizada ──
type TableRowProps = {
  fila: FilaAmortizacion;
  index: number;
  valorInput: number;
  onAdditionalChange: (mes: number, valor: number) => void;
};

const TableRow = memo(function TableRow({
  fila,
  index,
  valorInput,
  onAdditionalChange,
}: TableRowProps) {
  return (
    <tr
      className="table-row-animate hover:bg-muted/30 transition-colors"
      style={{ animationDelay: `${index * 15}ms` }}
    >
      <td className="px-3 py-2.5 text-sm text-center font-medium">
        {fila.mes}
      </td>
      <td className="px-3 py-2.5 text-sm text-center text-muted-foreground">
        {fila.fecha}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono">
        {fila.cuota}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono text-muted-foreground">
        {fila.intereses}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono">
        {fila.amortizacion}
      </td>
      <td className="px-3 py-2.5 text-sm text-right">
        <input
          type="number"
          value={valorInput}
          onChange={(e) =>
            onAdditionalChange(fila.mes, Number(e.target.value))
          }
          className="w-20 text-right px-2 py-1 text-sm font-mono rounded-md border bg-background focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
        />
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono font-medium">
        {fila.saldoPendiente}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono text-amber-700 dark:text-amber-400 font-medium">
        {fila.interesesAcumulados}
      </td>
    </tr>
  );
});

// ── Página principal ──
export default function Home() {
  const {
    formData,
    tablaAmortizacion,
    totalInteresesPagados,
    additionalValues,
    calculando,
    formErrors,
    currentPage,
    pageSize,
    pageSizeOptions,
    paginatedData,
    totalPages,
    visiblePages,
    handleChange,
    handleAdditionalChange,
    calcularAmortizacion,
    resetFormulario,
    setPageSize,
    irPagina,
  } = useAmortizacion();

  const { exportarCSV, exportarPDF } = useExport(tablaAmortizacion, formData);
  const tablaRef = useRef<HTMLDivElement>(null);

  const navegarPagina = useCallback(
    (pagina: number) => {
      irPagina(pagina);
      tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [irPagina]
  );

  const cambiarPageSize = useCallback(
    (size: number) => {
      setPageSize(size);
      irPagina(1);
    },
    [setPageSize, irPagina]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/20 dark:from-background dark:via-background dark:to-amber-950/15 transition-colors"
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
              <span
                className="inline-block w-2 h-5 bg-primary rounded-full"
                aria-hidden="true"
              />
              Datos de la Hipoteca
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-form" htmlFor="importeInicial">
                  Importe Inicial Pendiente
                </label>
                <Input
                  id="importeInicial"
                  type="number"
                  name="importeInicial"
                  value={formData.importeInicial}
                  onChange={handleChange}
                  className={`input-field ${formErrors.importeInicial ? "border-destructive" : ""}`}
                />
                {formErrors.importeInicial && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.importeInicial}
                  </p>
                )}
              </div>
              <div>
                <label className="label-form" htmlFor="interesAnual">
                  Interés Anual
                </label>
                <Input
                  id="interesAnual"
                  type="number"
                  name="interesAnual"
                  value={formData.interesAnual}
                  onChange={handleChange}
                  className={`input-field ${formErrors.interesAnual ? "border-destructive" : ""}`}
                />
                {formErrors.interesAnual && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.interesAnual}
                  </p>
                )}
              </div>
              <div>
                <label className="label-form" htmlFor="mesesRestantes">
                  Meses Restantes
                </label>
                <Input
                  id="mesesRestantes"
                  type="number"
                  name="mesesRestantes"
                  value={formData.mesesRestantes}
                  onChange={handleChange}
                  className={`input-field ${formErrors.mesesRestantes ? "border-destructive" : ""}`}
                />
                {formErrors.mesesRestantes && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.mesesRestantes}
                  </p>
                )}
              </div>
              <div>
                <label className="label-form" htmlFor="amortizacionAdicional">
                  Amortización Adicional (por defecto)
                </label>
                <Input
                  id="amortizacionAdicional"
                  type="number"
                  name="amortizacionAdicional"
                  value={formData.amortizacionAdicional}
                  onChange={handleChange}
                  className={`input-field ${formErrors.amortizacionAdicional ? "border-destructive" : ""}`}
                />
                {formErrors.amortizacionAdicional && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.amortizacionAdicional}
                  </p>
                )}
              </div>
              <div>
                <label className="label-form">Tipo de Amortización</label>
                <Select
                  name="tipoAmortizacion"
                  value={formData.tipoAmortizacion}
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: "tipoAmortizacion", value },
                    })
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
                  className={`text-sm font-medium cursor-pointer select-none ${
                    formData.reducir !== "cuota"
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  Mantener el pago total constante
                  {formData.reducir !== "cuota" && (
                    <span className="block text-xs text-muted-foreground/60">
                      Solo disponible con &quot;Reducir cuota&quot;
                    </span>
                  )}
                </label>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3 order-2 sm:order-1">
                <button
                  onClick={resetFormulario}
                  type="button"
                  className="btn-secondary text-sm"
                >
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
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Calculando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    {tablaAmortizacion.length > 0
                      ? "Actualizar"
                      : "Calcular"}
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
                    <span
                      className="inline-block w-2 h-5 bg-primary rounded-full"
                      aria-hidden="true"
                    />
                    Tabla de Amortización
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={exportarCSV}
                      type="button"
                      className="btn-secondary text-xs"
                    >
                      CSV
                    </button>
                    <button
                      onClick={exportarPDF}
                      type="button"
                      className="btn-secondary text-xs"
                    >
                      PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full divide-y">
                    <thead>
                      <tr className="bg-muted/50">
                        {[
                          "Mes",
                          "Fecha",
                          "Cuota",
                          "Intereses",
                          "Amortización",
                          "Amort. Adic.",
                          "Saldo Pend.",
                          "Int. Acum.",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedData.map((fila, index) => {
                        const valorInput =
                          additionalValues[fila.mes] !== undefined
                            ? additionalValues[fila.mes]
                            : (formData.tipoAmortizacion === "puntual" &&
                                fila.mes === 1) ||
                                formData.tipoAmortizacion === "mensual" ||
                                (formData.tipoAmortizacion === "anual" &&
                                  fila.mes % 12 === 0)
                              ? formData.amortizacionAdicional
                              : 0;
                        return (
                          <TableRow
                            key={fila.mes}
                            fila={fila}
                            index={index}
                            valorInput={valorInput}
                            onAdditionalChange={handleAdditionalChange}
                          />
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
                        cambiarPageSize(Number(e.target.value));
                      }}
                      className="bg-background border rounded-md px-2 py-1 text-xs font-medium text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                      {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
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
                        onClick={() => navegarPagina(currentPage - 1)}
                        disabled={currentPage === 1}
                        type="button"
                        className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                      >
                        ← Anterior
                      </button>
                      <div className="flex items-center gap-1.5">
                        {visiblePages.map((p, idx, arr) => (
                          <span
                            key={p}
                            className="flex items-center gap-1.5"
                          >
                            {idx > 0 &&
                              arr[idx - 1] !== p - 1 && (
                                <span className="text-xs text-muted-foreground">
                                  ···
                                </span>
                              )}
                            <button
                              onClick={() => navegarPagina(p)}
                              type="button"
                              aria-current={
                                p === currentPage ? "page" : undefined
                              }
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
                        onClick={() => navegarPagina(currentPage + 1)}
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
                    <span className="text-sm text-muted-foreground mr-2">
                      Total intereses pagados
                    </span>
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
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
