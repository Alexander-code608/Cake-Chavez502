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
- `supabase/site_content_editor.sql`: tabla y permisos del editor visual de textos e imágenes.
- `supabase/capacidad_pedidos.sql`: migración para la capacidad diaria y excepciones por fecha.
- `documentacion/`: instrucciones y lista de pruebas.

## Cambios preparados

1. Galería: precarga la imagen anterior/siguiente, cambia las imágenes sin retraso artificial y oculta la barra de categorías mientras el visor está abierto.
2. Pedidos del panel: agrupación por estado, foto del primer producto si se guardó en el pedido, edición de algunos datos, marcar entregado y cancelar sin borrar el registro.
3. Capacidad: configuración de un límite general y límites especiales por fecha en el panel; `0` cierra esa fecha. Cancelados liberan espacio; entregados siguen contando.
4. Supabase: función para consultar cupos y función RPC para registrar el pedido validando el cupo dentro de la base de datos. El registro final vuelve a validar aunque el calendario haya mostrado espacio antes.
5. Si Supabase no puede registrar el pedido por falta de cupo o por un error de validación, el flujo no debe abrir WhatsApp como si el pedido hubiera sido aceptado.

## Instalación resumida

1. Respaldar el sitio y la base de datos.
2. En Supabase, confirma primero si ya existe `public.site_content`. Si no existe, ejecuta `supabase/site_content_editor.sql` una vez. Si ya existe y el editor visual guarda cambios, no hace falta volver a ejecutar esa migración.
3. Ejecuta `supabase/capacidad_pedidos.sql` solo después de confirmar que `public.orders` tiene las columnas `order_code`, `status` y `payload`, y que `public.admin_users` tiene `user_id`.
4. Confirmar que las tablas `cake_order_capacity_settings` y `cake_order_capacity_overrides` existan.
5. Publicar el contenido del proyecto en el mismo alojamiento y ruta usados por la página actual.
6. Entrar al panel privado, abrir **Entregas y pagos** y guardar el límite general.
7. Probar con un límite bajo y una fecha futura antes de anunciar que está listo.

La guía completa está en `documentacion/INSTALACION_Y_PRUEBAS.md` y `supabase/capacidad_pedidos.sql`.

## Nota sobre el calendario

El calendario nativo marca en rojo el campo cuando se selecciona una fecha llena y muestra un aviso; no pinta por anticipado cada día lleno dentro del selector. Para eso hace falta implementar un calendario visual personalizado. La validación final de capacidad sí se realiza en Supabase.
