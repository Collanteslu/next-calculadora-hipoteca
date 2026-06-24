// src/hooks/useMortgageCalculator.ts
import { useState, useCallback, useEffect } from 'react';
import { AmortizationMonth, generarTablaAmortizacion, calcularTotales } from '../lib/utils/financeCalculations';

// Tipos para los estados del formulario (copiados de page.tsx)
export interface MortgageFormState {
  importePendiente: number;
  interesAnual: number; // Porcentaje (%)
  mesesRestantes: number;
  amortizacionAdicionalPorDefecto: number;
}

type PagoAdicionalTipo = 'puntual' | 'mensual' | 'anual';

/**
 * Custom Hook que encapsula toda la lógica de negocio y estado del cálculo hipotecario.
 * Esto separa el manejo de estados complejos de la presentación (componente).
 * @returns Un objeto con los datos necesarios para renderizar y los manejadores de acción.
 */
export const useMortgageCalculator = () => {
  // --- Estado Local (Simulando los inputs del formulario) ---
  const [formData, setFormData] = useState<MortgageFormState>({
    importePendiente: 0,
    interesAnual: 0,
    mesesRestantes: 360, // Valor por defecto de un préstamo grande
    amortizacionAdicionalPorDefecto: 0,
  });

  const [tipoPagoAdicional, setTipoPagoAdicional] = useState<PagoAdicionalTipo>('mensual');
  const [modoCalculo, setModoCalculo] = useState<'cuota' | 'plazo'>('cuota'); // Cuota o Plazo

  // --- Handlers de Formulario ---
  const handleChangeForm = useCallback((field: keyof MortgageFormState, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTipoPagoAdicionalChange = useCallback((type: PagoAdicionalTipo) => {
    setTipoPagoAdicional(type);
  }, []);


  // --- Lógica de Cálculo Principal (Memoizada para optimización) ---
  const [tablaAmortizacion, setTablaAmortizacion] = useState<AmortizationMonth[]>([]);
  const [totalInteresesPagados, setTotalInteresesPagados] = useState(0);
  const [calculando, setCalculando] = useState(false);

  const calcularAmortizacion = useCallback(() => {
    if (formData.importePendiente <= 0 || formData.mesesRestantes <= 0) {
      setTablaAmortizacion([]);
      setTotalInteresesPagados(0);
      return;
    }

    setCalculando(true);
    // Simulación de un retraso para que el estado 'calculando' sea visible
    setTimeout(() => {
      try {
        const tablaGenerada = generarTablaAmortizacion(
          formData.importePendiente,
          formData.interesAnual,
          formData.mesesRestantes,
          formData.amortizacionAdicionalPorDefecto,
          tipoPagoAdicional
        );

        const totales = calcularTotales(tablaGenerada);
        
        setTablaAmortizacion(tablaGenerada);
        setTotalInteresesPagados(totales.totalInteresesPagados);
      } catch (e) {
        console.error("Error durante el cálculo de la amortización:", e);
        setTablaAmortizacion([]);
        setTotalInteresesPagados(0);
      } finally {
        setCalculando(false);
      }
    }, 100);

  }, [formData, tipoPagoAdicional]);


  // Inicializar cálculo al montar el componente o cuando cambie un input clave.
  // calcularAmortizacion ya está memoizado sobre [formData, tipoPagoAdicional],
  // así que su identidad cambia cuando cambia cualquier input relevante.
  useEffect(() => {
    calcularAmortizacion();
  }, [calcularAmortizacion]);


  // --- Funciones de Exportación / Reset (Ejemplos) ---
  const exportarCSV = useCallback(() => {
    console.log("Exportando datos a CSV...");
    // Aquí iría la lógica de serialización y descarga de archivos.
  }, []);

  const resetFormulario = useCallback(() => {
    setFormData({ importePendiente: 0, interesAnual: 0, mesesRestantes: 360, amortizacionAdicionalPorDefecto: 0 });
    setTipoPagoAdicional('mensual');
    setModoCalculo('cuota');
    setTablaAmortizacion([]);
    setTotalInteresesPagados(0);
  }, []);


  // Devolvemos todo lo necesario para el componente de presentación
  return {
    formData, 
    setFormData: handleChangeForm, // Usamos la versión tipada del handler
    tipoPagoAdicional, 
    handleTipoPagoAdicionalChange,
    modoCalculo,
    setModoCalculo: (mode: 'cuota' | 'plazo') => setModoCalculo(mode),
    tablaAmortizacion,
    totalInteresesPagados,
    calculando,
    calcularAmortizacion, // El callback para forzar un recálculo manual si es necesario
    exportarCSV,
    resetFormulario,
  };
};