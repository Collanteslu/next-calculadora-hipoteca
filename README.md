# Calculadora de Amortización de Hipoteca

Esta aplicación es una calculadora interactiva de amortización de hipoteca desarrollada con Next.js y React. Permite al usuario introducir los datos de la hipoteca y obtener una tabla de amortización completa, que incluye la cuota mensual, intereses, amortización, amortización adicional (editable por mes), saldo pendiente y los intereses acumulados. Además, la aplicación muestra la fecha correspondiente al primer día de cada mes a partir del mes actual.

## Características

- **Cálculo de cuota francés**: Calcula la cuota mensual utilizando el sistema de amortización francés.
- **Amortización adicional editable**: Permite modificar la amortización adicional para cada mes de manera individual.
- **Soporte para diferentes tipos de amortización**:
  - **Puntual**: Amortización adicional aplicada en el primer mes.
  - **Mensual**: Amortización adicional aplicada cada mes.
  - **Anual**: Amortización adicional aplicada en cada mes correspondiente (cada 12 meses).
- **Selección de reducción**: Permite elegir entre reducir la cuota o el plazo.
- **Visualización de fechas**: Cada fila de la tabla muestra la fecha correspondiente al primer día del mes en curso, incrementándose un mes por cada fila.
- **Modo oscuro/claro**: Alterna entre tema oscuro y claro para mejorar la experiencia de usuario.

## Tecnologías Utilizadas

- **Next.js**: Framework de React para aplicaciones web.
- **React**: Biblioteca para construir interfaces de usuario.
- **Tailwind CSS**: Framework CSS para estilos rápidos y responsivos.
- **TypeScript**: Lenguaje que añade tipado estático a JavaScript.

## Instalación

### Clonar el repositorio:
```sh
git clone https://github.com/collanteslu/next-calculadora-hipoteca.git
cd calculadora-hipoteca
```

### Instalar dependencias:
Con npm:
```sh
npm install
```
O con yarn:
```sh
yarn install
```

### Iniciar el servidor de desarrollo:
Con npm:
```sh
npm run dev
```
Con yarn:
```sh
yarn dev
```

### Abrir la aplicación en el navegador:
Accede a [http://localhost:3000](http://localhost:3000) para ver la calculadora en acción.

## Uso

1. **Configurar los datos de la hipoteca**:
   - Completa los campos del formulario con el importe pendiente, el interés anual, la cantidad de meses restantes y la amortización adicional por defecto.
2. **Seleccionar el tipo de amortización**:
   - Escoge entre "puntual", "mensual" o "anual".
3. **Elegir qué reducir**:
   - Selecciona si deseas reducir la cuota o el plazo.
4. **Opcional**:
   - Marca la opción de "Mantener el pago total constante" si lo deseas.
5. **Calcular**:
   - Haz clic en el botón "Calcular" para generar la tabla de amortización.
6. **Modificar la amortización adicional**:
   - En la tabla, cada fila dispone de un campo editable para la amortización adicional. Modifica el valor y la tabla se recalculará automáticamente.

## Estructura del Proyecto

- `/pages`: Contiene las páginas principales de la aplicación (por ejemplo, `index.tsx`).
- `/components`: Componentes reutilizables, como botones, inputs, select, y el toggle de tema.
- `/styles`: Archivos de estilos y configuraciones de Tailwind CSS.

## Contribuciones

🎉 ¡Las contribuciones son bienvenidas! Si deseas mejorar la aplicación, por favor sigue estos pasos:

1. **Haz un fork** del repositorio.
2. **Crea una rama** para tu funcionalidad:
   ```sh
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Realiza tus cambios y haz un commit:**
   ```sh
   git commit -am 'Agrega nueva funcionalidad'
   ```
4. **Envía tu pull request.**

## Licencia

Este proyecto se distribuye bajo la licencia **MIT**.

## Contacto

Para consultas, sugerencias o reportar errores, por favor contacta a:

- **Correo**: [collandev@gmail.com](mailto:collandev@gmail.com)  

