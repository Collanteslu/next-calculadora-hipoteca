# Funcionamiento Interno de la Calculadora de Hipoteca

Este documento describe los mecanismos de cálculo y el flujo de estado interno de la aplicación, detallando cómo se generan la tabla de amortización y cómo interactúa con las entradas del usuario.

## 🏗️ Arquitectura Lógica
El corazón de la aplicación reside en un motor financiero que implementa el **Sistema de Amortización Francés** como cálculo base para determinar la cuota mensual inicial (C). Todos los cálculos subsecuentes se basan en esta cuota y se ajustan por las entradas variables del usuario.

## 🔢 Flujo de Cálculo Principal

El proceso desencadenado al presionar "Calcular" sigue estos pasos:

### 1. Determinación de la Cuota Base (Cálculo Francés)
*   **Inputs necesarios**:
    *   $P$: Importe pendiente (Capital).
    *   $i_{anual}$: Tasa de interés anual.
    *   $n$: Número total de meses restantes (Plazo en meses).
*   **Proceso**: Se calcula la cuota mensual ($M$) utilizando la fórmula financiera del sistema francés: $$M = P \cdot \frac{i/12}{1 - (1 + i/12)^{-n}}$$
    Donde $i$ es la tasa de interés anual. Esta cuota $M$ se establece como el pago base para el primer mes y cada mes subsiguiente, *antes* de aplicar cualquier amortización adicional.

### 2. Generación de la Tabla de Amortización (Iteración)
La tabla se genera mediante un bucle iterativo que simula el paso del tiempo, mes a mes ($t=1$ hasta $n$). En cada ciclo, se calculan los siguientes elementos:

*   **Interés ($I_t$)**: Se calcula sobre el saldo pendiente del período anterior ($S_{t-1}$). $$I_t = S_{t-1} \cdot (i/12)$$
*   **Pago Principal Base ($A_{base, t}$)**: Es la cuota mensual menos los intereses. $$A_{base, t} = M - I_t$$
*   **Saldo Pendiente Final ($S_t$)**: Se obtiene restando el pago principal del mes al saldo anterior. $$S_t = S_{t-1} - A_{total, t}$$

### 3. Integración de Amortización Adicional (El Mecanismo Variable)
Aquí es donde entra la interactividad avanzada y las configuraciones del usuario:

*   **Amortización Total ($A_{total, t}$)**: Es el pago principal base más la amortización adicional ($AD_t$). $$A_{total, t} = A_{base, t} + AD_t$$
*   **Manejo de $AD$**: El valor de $AD_t$ depende del tipo seleccionado:
    *   **Puntual (Mes 1)**: $AD_1$ es el único campo activo. Los meses subsiguientes usan un $AD = 0$.
    *   **Mensual**: $AD_t$ se aplica en todos los meses, modificando el cálculo de $A_{total, t}$ y recalculando la amortización subsecuente.
    *   **Anual**: $AD_t$ solo es activo cuando $t \pmod{12} = 0$.

### 4. Impacto de Reducir Cuota vs. Reducir Plazo (Lógica de Refinanciamiento)
Esta lógica modifica la *meta* del cálculo:

*   **Reducción de Cuota**: Si el usuario selecciona esto, la aplicación mantiene el **plazo ($n$) fijo**, pero ajusta la cuota mensual $M$ para que sea más baja y se adapte a los pagos adicionales. El objetivo es calcular una nueva $M'$ con un pago total constante o reducido.
*   **Reducción de Plazo**: Si selecciona esto, el sistema recalcula el número de meses restantes ($n'$) en función de la amortización adicional aplicada, manteniendo la cuota mensual $M$ lo más cercana posible al original.

## 💡 Recálculo Dinámico (Interacción con UI)
Cuando un usuario edita manualmente una celda de Amortización Adicional en la tabla:
1.  El valor editado ($AD_{edit}$) se toma como el nuevo dato para ese mes $t$.
2.  La aplicación recalcula instantáneamente desde ese punto en adelante (desde $S_t$).
3.  Este recálculo debe asegurar que el saldo final siga siendo cero o lo más cercano posible, ajustando las cuotas y amortizaciones subsiguientes de manera coherente con la lógica financiera aplicada hasta ese momento.

***

**Nota:** Este resumen se centra en los modelos financieros subyacentes (Cálculos $I_t$, $A_{total, t}$, etc.), independientemente de cómo el *frontend* muestre o maneje el estado.