"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/ui/toggle-theme";

// Definición de tipos
interface FormData {
  importeInicial: number;
  interesAnual: number;
  mesesRestantes: number;
  amortizacionAdicional: number; // valor por defecto para la amortización adicional
  tipoAmortizacion: "puntual" | "mensual" | "anual";
  reducir: "cuota" | "plazo";
  mantenerPagoConstante: boolean;
}

interface TablaAmortizacion {
  mes: number;
  fecha: string;
  cuota: string;
  intereses: string;
  amortizacion: string;
  amortizacionAdicional: string;
  saldoPendiente: string;
  interesesAcumulados: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    importeInicial: 100000,
    interesAnual: 3,
    mesesRestantes: 120,
    amortizacionAdicional: 0,
    tipoAmortizacion: "puntual",
    reducir: "cuota",
    mantenerPagoConstante: false,
  });

  // Estado para la tabla de amortización calculada
  const [tablaAmortizacion, setTablaAmortizacion] = useState<TablaAmortizacion[]>([]);
  const [totalInteresesPagados, setTotalInteresesPagados] = useState<string>("0");

  // Estado para almacenar el valor adicional modificado para cada fila (mes)
  const [additionalValues, setAdditionalValues] = useState<Record<number, number>>({});

  // Cada vez que se modifiquen los valores adicionales, se recalcula la tabla
  useEffect(() => {
    if (tablaAmortizacion.length > 0) {
      calcularAmortizacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalValues]);

  // Manejo de cambios en los inputs del formulario (incluyendo checkbox)
  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string | number | boolean } }
  ) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value =
      target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    const { name } = target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Cálculo de la cuota utilizando el sistema francés
  const calcularCuotaFrances = (
    importe: number,
    interesAnual: number,
    meses: number
  ): number => {
    const interesMensual = interesAnual / 100 / 12;
    if (interesMensual === 0) return importe / meses;
    return (importe * interesMensual) / (1 - Math.pow(1 + interesMensual, -meses));
  };

  // Función para calcular la tabla de amortización
  const calcularAmortizacion = () => {
    const {
      importeInicial,
      interesAnual,
      mesesRestantes,
      amortizacionAdicional,
      tipoAmortizacion,
      reducir,
      mantenerPagoConstante,
    } = formData;

    let saldoPendiente = importeInicial;
    const tabla: TablaAmortizacion[] = [];
    let totalIntereses = 0;
    const interesMensual = interesAnual / 100 / 12;

    // Fecha de inicio: día 1 del mes actual
    const today = new Date();
    const startYear = today.getFullYear();
    const startMonth = today.getMonth(); // 0-indexado: enero=0, febrero=1, etc.

    // Iteramos por cada mes
    for (let mes = 1; mes <= mesesRestantes; mes++) {
      // Calcular la fecha para la fila actual: sumar (mes - 1) al mes de inicio
      const currentDate = new Date(startYear, startMonth + mes - 1, 1);
      const fecha = currentDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // Determinar el valor de amortización adicional para el mes actual:
      // Si se editó en la tabla se utiliza ese valor; de lo contrario,
      // se usa el valor por defecto según la lógica (puntual, mensual o anual) o 0.
      let additional = 0;
      if (additionalValues[mes] !== undefined) {
        additional = Number(additionalValues[mes]);
      } else if (
        ((formData.tipoAmortizacion === "puntual" && mes === 1) ||
          formData.tipoAmortizacion === "mensual" ||
          (formData.tipoAmortizacion === "anual" && mes % 12 === 0))
      ) {
        additional = Number(amortizacionAdicional);
      }

      // En el caso "puntual", se aplica la amortización adicional en el mes 1 antes de calcular la cuota.
      if (tipoAmortizacion === "puntual" && mes === 1) {
        saldoPendiente -= additional;
      }

      // Calcular la cuota. Si se reduce la cuota, se recalcula según el saldo pendiente y los meses restantes.
      const cuotaMensual =
        reducir === "cuota"
          ? calcularCuotaFrances(saldoPendiente, interesAnual, mesesRestantes - mes + 1)
          : calcularCuotaFrances(importeInicial, interesAnual, mesesRestantes);

      const interesMes = saldoPendiente * interesMensual;
      let amortizacionMes = cuotaMensual - interesMes;

      if (reducir === "cuota" && mantenerPagoConstante) {
        amortizacionMes += cuotaMensual - interesMes;
      }

      // Para los tipos "mensual" y "anual" (en su mes correspondiente), se aplica la amortización adicional
      if (
        (tipoAmortizacion === "mensual") ||
        (tipoAmortizacion === "anual" && mes % 12 === 0)
      ) {
        saldoPendiente -= additional;
      }

      // Se actualiza el saldo pendiente tras el pago mensual
      saldoPendiente -= amortizacionMes;
      if (saldoPendiente < 0) saldoPendiente = 0;
      totalIntereses += interesMes;

      tabla.push({
        mes,
        fecha,
        cuota: cuotaMensual.toFixed(2),
        intereses: interesMes.toFixed(2),
        amortizacion: amortizacionMes.toFixed(2),
        amortizacionAdicional: Number(additional).toFixed(2),
        saldoPendiente: saldoPendiente.toFixed(2),
        interesesAcumulados: totalIntereses.toFixed(2),
      });

      if (saldoPendiente === 0) break;
    }

    setTablaAmortizacion(tabla);
    setTotalInteresesPagados(totalIntereses.toFixed(2));
  };

  // Maneja el cambio en el input de amortización adicional para cada fila (mes)
  const handleAdditionalChange = (mes: number, value: number) => {
    setAdditionalValues((prev) => ({
      ...prev,
      [mes]: value,
    }));
    // El useEffect se encargará de recalcular la tabla al actualizar additionalValues.
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="container mx-auto p-6">
        {/* Encabezado y Toggle de Tema */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold">
            Calculadora de Amortización de Hipoteca
          </h1>
          <ModeToggle/>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Datos de la Hipoteca</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">
                Importe Inicial Pendiente (€):
              </label>
              <Input
                type="number"
                name="importeInicial"
                value={formData.importeInicial}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Interés Anual (%):</label>
              <Input
                type="number"
                name="interesAnual"
                value={formData.interesAnual}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Meses Restantes:</label>
              <Input
                type="number"
                name="mesesRestantes"
                value={formData.mesesRestantes}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">
                Amortización Adicional (valor por defecto) (€):
              </label>
              <Input
                type="number"
                name="amortizacionAdicional"
                value={formData.amortizacionAdicional}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Tipo de Amortización:</label>
              <Select
                name="tipoAmortizacion"
                value={formData.tipoAmortizacion}
                onValueChange={(value) =>
                  handleChange({ target: { name: "tipoAmortizacion", value } })
                }
              >
                <SelectTrigger className="w-full">
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
              <label className="block mb-2 font-medium">¿Qué deseas reducir?</label>
              <Select
                name="reducir"
                value={formData.reducir}
                onValueChange={(value) =>
                  handleChange({ target: { name: "reducir", value } })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuota">Cuota</SelectItem>
                  <SelectItem value="plazo">Plazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <Input
                type="checkbox"
                name="mantenerPagoConstante"
                checked={formData.mantenerPagoConstante}
                onChange={handleChange}
                className="mr-2"
              />
              <label className="font-medium">
                Mantener el pago total constante
              </label>
            </div>
          </div>
          <div className="mt-6 text-right">
            <Button
              onClick={calcularAmortizacion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Calcular
            </Button>
          </div>
        </div>

        {/* Tabla de Resultados */}
        {tablaAmortizacion.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Tabla de Amortización</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="border p-2">Mes</th>
                    <th className="border p-2">Fecha</th>
                    <th className="border p-2">Cuota</th>
                    <th className="border p-2">Intereses</th>
                    <th className="border p-2">Amortización</th>
                    <th className="border p-2">Amort. Adicional</th>
                    <th className="border p-2">Saldo Pendiente</th>
                    <th className="border p-2">Intereses Acumulados</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaAmortizacion.map((fila) => {
                    // Se determina el valor que se mostrará en el input para este mes:
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
                      <tr
                        key={fila.mes}
                        className="odd:bg-white even:bg-gray-100 dark:odd:bg-gray-800 dark:even:bg-gray-700"
                      >
                        <td className="border p-2 text-center">{fila.mes}</td>
                        <td className="border p-2 text-center">{fila.fecha}</td>
                        <td className="border p-2 text-right">{fila.cuota}</td>
                        <td className="border p-2 text-right">{fila.intereses}</td>
                        <td className="border p-2 text-right">{fila.amortizacion}</td>
                        <td className="border p-2 text-right">
                          <input
                            type="number"
                            value={valorInput}
                            onChange={(e) =>
                              handleAdditionalChange(fila.mes, Number(e.target.value))
                            }
                            className="w-20 text-right p-1 border rounded"
                          />
                        </td>
                        <td className="border p-2 text-right">{fila.saldoPendiente}</td>
                        <td className="border p-2 text-right">{fila.interesesAcumulados}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right text-xl font-bold">
              Total de Intereses Pagados: {totalInteresesPagados} €
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
