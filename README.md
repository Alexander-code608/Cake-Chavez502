# Cake Chávez — proyecto organizado

Este es el código fuente de la página de Cake Chávez y su panel privado. Conserva una copia de la versión que ya está publicada antes de reemplazar archivos.

## Estructura principal

- `index.html`: página pública.
- `script.js`: catálogo, carrito, personalización, calendario, envío por WhatsApp y registro/consulta de pedidos.
- `style.css`: estilos de la página pública y estados visuales del calendario.
- `admin.html`: panel privado.
- `admin.js`: productos, pedidos, reseñas, ajustes y configuración de capacidad diaria.
- `admin.css`: estilos del panel privado.
- `store-editor.js` / `store-editor.css`: editor visual del contenido del sitio.
- `supabase-config.js`: conexión pública de Supabase. Solo debe contener URL del proyecto y clave publicable/anon; nunca `service_role`.
- `supabase/`: carpeta para las migraciones SQL finales que la IA deberá preparar únicamente si hacen falta tras revisar el esquema real. No se incluye un conjunto de migraciones SQL en este archivo fuente.
- `documentacion/`: carpeta para las instrucciones finales de instalación y pruebas que deberán acompañar la entrega actualizada; no está incluida en este archivo fuente.

## Cambios preparados

1. Galería: precarga la imagen anterior/siguiente, cambia las imágenes sin retraso artificial y oculta la barra de categorías mientras el visor está abierto.
2. Pedidos del panel: agrupación por estado, foto del primer producto si se guardó en el pedido, edición de algunos datos, marcar entregado y cancelar sin borrar el registro.
3. Capacidad: configuración de un límite general y límites especiales por fecha en el panel; `0` cierra esa fecha. Cancelados liberan espacio; entregados siguen contando.
4. Supabase: función para consultar cupos y función RPC para registrar el pedido validando el cupo dentro de la base de datos. El registro final vuelve a validar aunque el calendario haya mostrado espacio antes.
5. Si Supabase no puede registrar el pedido por falta de cupo o por un error de validación, el flujo no debe abrir WhatsApp como si el pedido hubiera sido aceptado.

## Instalación resumida y preparación de Supabase

1. Respaldar el sitio y la base de datos antes de reemplazar archivos.
2. Este ZIP fuente no incluye los archivos SQL que mencionan algunas notas históricas ni una carpeta `documentacion` completa. No des por hecho que esos archivos están presentes.
3. No solicites a la usuaria que te envíe SQL, migraciones ni credenciales de Supabase. Revisa el código y la estructura de la base de datos que esté disponible para identificar los cambios necesarios.
4. Si hacen falta cambios de base de datos, prepara tú las migraciones SQL reales, completas y compatibles con el esquema existente, e inclúyelas en la entrega final junto con una guía de instalación y pruebas. Si no hace falta ningún cambio, indícalo expresamente y no inventes SQL.
5. La usuaria recibirá el SQL listo para revisar, copiar y ejecutar en Supabase. No ejecutes operaciones destructivas ni incluyas claves privadas o `service_role` en archivos públicos.
6. Publica los archivos del proyecto actualizado en el mismo alojamiento y ruta usados por la página actual, conservando el respaldo anterior.
7. Prueba los pedidos y las funciones administrativas en un entorno controlado antes de usar la actualización con clientes.

## Nota sobre el calendario

El calendario nativo marca en rojo el campo cuando se selecciona una fecha llena y muestra un aviso; no pinta por anticipado cada día lleno dentro del selector. Para eso hace falta implementar un calendario visual personalizado. La validación final de capacidad sí se realiza en Supabase.
