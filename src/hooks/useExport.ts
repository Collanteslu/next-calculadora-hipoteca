"use client";

import { useCallback } from "react";
import type { DatosAmortizacion, FilaAmortizacion } from "@/lib/amortizacion";

export function useExport(
  tablaAmortizacion: FilaAmortizacion[],
  formData: DatosAmortizacion
) {
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

  return { exportarCSV, exportarPDF };
}
