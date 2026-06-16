"use client";

import { useRef, memo, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  valorInput: number;
  onAdditionalChange: (mes: number, valor: number) => void;
};

const TableRow = memo(function TableRow({
  fila,
  valorInput,
  onAdditionalChange,
}: TableRowProps) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 text-sm text-center font-medium tabular-nums">
        {fila.mes}
      </td>
      <td className="px-3 py-2.5 text-sm text-center text-muted-foreground">
        {fila.fecha}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono tabular-nums">
        {fila.cuota}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono text-muted-foreground tabular-nums">
        {fila.intereses}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono tabular-nums">
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
      <td className="px-3 py-2.5 text-sm text-right font-mono font-medium tabular-nums">
        {fila.saldoPendiente}
      </td>
      <td className="px-3 py-2.5 text-sm text-right font-mono text-amber-700 dark:text-amber-400 font-medium tabular-nums">
        {fila.interesesAcumulados}
      </td>
    </tr>
  );
});

// ── Cabeceras de la tabla ──
const HEADERS = [
  "Mes",
  "Fecha",
  "Cuota",
  "Intereses",
  "Amortización",
  "Amort. Adic.",
  "Saldo Pend.",
  "Int. Acum.",
];

// ── Página principal ──
export default function Home() {
  const {
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
  } = useAmortizacion();

  const { exportarCSV, exportarPDF } = useExport(tablaAmortizacion, formData);

  // ── Virtual scroll ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tablaAmortizacion.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 5,
    getItemKey: (index) => tablaAmortizacion[index]?.mes ?? index,
  });

  // Calcular valorInput para cada fila (memoizado para todo el array)
  const valoresInput = useMemo(() => {
    const vals: Record<number, number> = {};
    for (const fila of tablaAmortizacion) {
      if (additionalValues[fila.mes] !== undefined) {
        vals[fila.mes] = additionalValues[fila.mes];
      } else if (
        (formData.tipoAmortizacion === "puntual" && fila.mes === 1) ||
        formData.tipoAmortizacion === "mensual" ||
        (formData.tipoAmortizacion === "anual" && fila.mes % 12 === 0)
      ) {
        vals[fila.mes] = formData.amortizacionAdicional;
      } else {
        vals[fila.mes] = 0;
      }
    }
    return vals;
  }, [tablaAmortizacion, additionalValues, formData.tipoAmortizacion, formData.amortizacionAdicional]);

  // Scroll al inicio solo cuando cambia el número de filas (no en cada recálculo)
  const prevLength = useRef(tablaAmortizacion.length);
  useEffect(() => {
    if (tablaAmortizacion.length !== prevLength.current) {
      prevLength.current = tablaAmortizacion.length;
      rowVirtualizer.scrollToIndex(0);
    }
  }, [tablaAmortizacion.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

          {/* Tabla de Resultados — Virtual Scroll */}
          <AnimatePresence>
            {tablaAmortizacion.length > 0 && (
              <motion.section
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

                {/* Contenedor con scroll virtual */}
                <div
                  ref={scrollRef}
                  className="overflow-auto rounded-lg border"
                  style={{ maxHeight: "min(600px, 70vh)" }}
                >
                  <table className="min-w-full divide-y">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/80 backdrop-blur-sm">
                        {HEADERS.map((h) => (
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
                      {/* Espaciador superior */}
                      <tr>
                        <td
                          colSpan={HEADERS.length}
                          style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0 }}
                          className="p-0"
                        />
                      </tr>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const fila = tablaAmortizacion[virtualRow.index];
                        const valorInput =
                          valoresInput[fila.mes] ?? 0;
                        return (
                          <TableRow
                            key={virtualRow.key}
                            fila={fila}
                            valorInput={valorInput}
                            onAdditionalChange={handleAdditionalChange}
                          />
                        );
                      })}
                      {/* Espaciador inferior */}
                      <tr>
                        <td
                          colSpan={HEADERS.length}
                          style={{
                            height:
                              rowVirtualizer.getTotalSize() -
                              (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0),
                          }}
                          className="p-0"
                        />
                      </tr>
                    </tbody>
                  </table>
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
