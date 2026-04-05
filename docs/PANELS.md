# REDIN — Paneles de Usuario

## Autenticacion

### Landing (/)
Dos cards: "Soy una institucion" → /login-institucion, "Soy interprete o administrador" → /login. Redirige a dashboard si ya autenticado.

### Login Institucion (/login-institucion)
Fondo calido (earth→gold gradient). Solo rol INSTITUTION. Error + link si otro rol intenta entrar. Link a /registro.

### Registro (/registro)
Solo instituciones. Campos: nombre institucion, tipo, nombre responsable, email, telefono, contrasena. Crea cuenta Firebase + backend.

### Login Interno (/login)
Fondo forest-800. Para admin e interpretes. Sin registro. Si interprete tiene mustChangePassword=true, redirige a /cambiar-contrasena.

### Cambio de contrasena (/cambiar-contrasena)
Onboarding obligatorio. Campos: contrasena temporal, nueva, confirmar. Indicador de fuerza. Al completar redirige a /interprete.

---

## Panel Administrador (/admin)

### Dashboard (/admin)
- 4 stats cards: interpretes activos, solicitudes mes, pendientes, completadas hoy
- Grafica de servicios por semana
- Tabla de solicitudes recientes (10)
- Lenguas mas solicitadas
- Se actualiza en tiempo real (WebSocket: request:created, accepted, started, completed, cancelled)

### Interpretes (/admin/interpretes)
- Tabla: nombre, email, telefono, lenguas (badges), comunidad, disponibilidad
- Columna "Acceso": contrasena temporal (copiable) o badge "Activo"
- Busqueda por nombre
- Modal crear: nombre, email, telefono, comunidad, estado, bio, lenguas, datos bancarios. Sin campo contrasena (REDIN-XXXX automatico). Modal exito muestra contrasena
- Modal editar: mismos campos, email disabled
- Boton regenerar contrasena (KeyRound icon)
- Paginacion

### Lenguas (/admin/lenguas)
- Vista accordion: lengua → variantes
- Cada lengua: nombre, familia, variantes count, interpretes count
- Cada variante: nombre, region, codigo INALI
- Modales: agregar lengua, agregar variante, editar
- Busqueda

### Solicitudes (/admin/solicitudes)
- Tabs: Todas, Pendientes, En curso, Completadas, Canceladas, No-show
- Tabla: fecha, institucion, lengua, variante, tipo, estado, interprete, duracion
- Modal detalle: info completa, timeline visual, ZoomButton para observar
- Acciones: Marcar no-show (PATCH /:id/no-show), Reasignar (PATCH /:id/reassign)
- Se actualiza en tiempo real

### Pagos (/admin/pagos)
- Resumen: total pendiente, pagado este mes
- Tabs: Pendientes, Pagados
- Tabla: fecha, interprete, institucion, duracion, monto, CLABE, estado
- Boton "Marcar como pagado"
- Busqueda por interprete

### Instituciones (/admin/instituciones)
- Tabla: nombre, tipo, ciudad, estado, email, total solicitudes
- Busqueda, paginacion

---

## Panel Institucion (/institucion)

### Dashboard (/institucion)
- Bienvenida con nombre institucion
- 4 stats: total solicitudes, completadas, pendientes, en curso
- Solicitudes activas con ZoomButton (ACCEPTED/IN_PROGRESS)
- Lengua mas solicitada
- CTA "Nueva solicitud"
- Se actualiza en tiempo real

### Nueva solicitud (/institucion/nueva-solicitud)
- Formulario guiado en 3 pasos:
  1. LanguageSelector (lengua → variante con busqueda)
  2. Tipo: Inmediata (Zap) o Agendada (CalendarClock) como radio cards. Si agendada: DateTimePicker visual
  3. ContextSelector (juridico, medico, social, educativo, otro) + descripcion opcional
- Envia timezone local automaticamente
- Modal exito: "Estamos buscando interprete" o "Agendada correctamente"

### Historial (/institucion/historial)
- Tabs: Todas, Pendientes, En curso, Completadas, Canceladas
- Tabla con todas las solicitudes
- Modal detalle: RequestTimeline, ZoomButton si activa, boton cancelar
- Se actualiza en tiempo real

### Perfil (/institucion/perfil)
- Datos editables: nombre, tipo, direccion, ciudad, estado, telefono
- Datos lectura: email, nombre responsable, fecha registro

---

## Panel Interprete (/interprete)

### Solicitudes disponibles (/interprete)
- Toggle disponibilidad prominente
- 3 stats: servicios mes, ganancias, pagos pendientes
- Cards de solicitudes matching (por variante linguistica):
  - Badge tipo, lengua/variante, institucion, contexto, timeAgo
  - Boton "Aceptar solicitud" con modal confirmacion
  - Error 409: toast "ya fue tomada"
- Se actualiza por WebSocket (NO polling): request:available agrega, request:taken remueve
- Boton "Actualizar" manual como respaldo

### Mi agenda (/interprete/agenda)
- **Servicio en curso** (card destacada):
  - MeetingStatus: dots verde/rojo para interprete/institucion
  - Timer facturable (HH:MM:SS) — sobrevive refresh, se pausa en desconexiones
  - ZoomButton (start_url para reconectar)
  - Boton "Finalizar servicio" (respaldo manual, cierra Zoom)
  - Texto: "Se completara automaticamente al cerrar la videollamada"
- **Proximos servicios** (ACCEPTED):
  - ZoomButton si tiene link, o boton "Iniciar servicio" como fallback
  - Texto: "Iniciara automaticamente cuando ambos esten en la videollamada"
- WebSocket: meeting:both_connected, participant_joined/left, meeting:renewed, request:started

### Historial (/interprete/historial)
- Tabla: fecha, institucion, lengua, contexto, duracion, monto, estado
- Filtro por fecha
- Modal detalle con RequestTimeline

### Mis pagos (/interprete/pagos)
- 3 stats: total ganado, este mes, pendiente
- Tabs: Pendientes (cards), Cobrados (tabla)
- Boton "Confirmar recepcion"
- Se actualiza por WebSocket (payment:completed)

### Mi perfil (/interprete/perfil)
- Info personal editable: telefono, comunidad, estado, bio
- Nombre/email: solo lectura
- Lenguas: badges (solo lectura, asignadas por admin)
- Datos bancarios: banco, CLABE (18 digitos), titular (editables)
- Toggle disponibilidad
