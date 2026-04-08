# REDIN — Paneles de Usuario

## Autenticacion

### Landing (/)
Dos cards: "Soy una institucion" → /login-institucion, "Soy interprete o administrador" → /login. Redirige a dashboard si ya autenticado.

### Login Institucion (/login-institucion)
Fondo calido (earth→gold gradient). Solo rol INSTITUTION. Error + link si otro rol intenta entrar. Link a /registro.
- Despues de login, redirige segun approvalStatus:
  - PENDING → /pendiente
  - REJECTED → /rechazada
  - SUSPENDED → /suspendida
  - APPROVED → /institucion

### Registro (/registro)
Solo instituciones. Campos: nombre institucion, tipo, nombre responsable, email, telefono, contrasena. Crea cuenta Firebase + backend.
- Despues de registrarse, redirige a /pendiente (la cuenta empieza como PENDING).

### Paginas de estado de institucion

**Pendiente (/pendiente):**
- Icono: Clock (amber), titulo: "Tu cuenta esta en revision"
- Texto: proceso 1-3 dias habiles
- Contacto: contacto.redinterpretes@gmail.com
- Boton cerrar sesion (usa Firebase signOut directamente)
- WebSocket: `institution:approved` → toast + redirige a /institucion
- WebSocket: `institution:rejected` → redirige a /rechazada
- Polling fallback: cada 10s consulta /auth/session y redirige si approvalStatus cambio

**Rechazada (/rechazada):**
- Icono: XCircle (rojo), titulo: "Tu solicitud no fue aprobada"
- Muestra motivo de rechazo (rejectionReason del dbUser)
- WebSocket + polling fallback: redirige a /institucion si admin reactiva

**Suspendida (/suspendida):**
- Icono: AlertTriangle (amber), titulo: "Tu cuenta ha sido suspendida"
- WebSocket + polling fallback: redirige a /institucion si admin reactiva

### Login Interno (/login)
Fondo forest-800. Para admin e interpretes. Sin registro. Si interprete tiene mustChangePassword=true, redirige a /cambiar-contrasena.

### Cambio de contrasena (/cambiar-contrasena)
Onboarding obligatorio. Campos: contrasena temporal, nueva, confirmar. Indicador de fuerza. Al completar redirige a /interprete.

---

## Panel Administrador (/admin)

### Dashboard (/admin)
- Alertas de accion: banner amber si hay instituciones pendientes de aprobacion, banner gold si hay pagos pendientes de revision. Cada una con boton "Revisar"
- 4 stats cards: interpretes activos, solicitudes mes, pendientes, completadas hoy
- Grafica de servicios por semana
- Tabla de solicitudes recientes (10)
- Lenguas mas solicitadas
- Se actualiza en tiempo real (WebSocket: request:created, accepted, started, completed, cancelled)

### Interpretes (/admin/interpretes)
- Tabla: nombre, email, telefono, comunidad, lenguas (badges), disponibilidad (toggle switch), tarifa/hr, acceso, acciones
- Columna "Disponible": toggle switch si cuenta activa, badge "Desactivado" (rojo) si inactiva
- Columna "Acceso":
  - Si mustChangePassword=true: badge "Pendiente" + icono Eye (ver contrasena sin regenerar) + icono RefreshCw (regenerar con confirmacion)
  - Si mustChangePassword=false: badge "Activo" + icono RefreshCw (regenerar si pierde contrasena)
- Columna acciones: ver detalle (Eye), editar (Edit3), desactivar (Trash2, solo si cuenta activa)
- Busqueda por nombre, paginacion
- Modal crear: nombre, email, telefono, comunidad, estado, bio, tarifa por hora (default $300), lenguas con proficiency, datos bancarios. Sin campo contrasena (REDIN-XXXX automatico). Modal exito muestra contrasena con boton copiar
- Modal editar: mismos campos incluyendo tarifa, email disabled
- Modal detalle: info completa + lenguas + datos bancarios + boton "Desactivar cuenta" / "Reactivar cuenta"
- Modal eliminar: ahora dice "Desactivar interprete" con lista de consecuencias
- WebSocket: se actualiza automaticamente con eventos de solicitudes
- Validacion: telefono duplicado retorna error 409 claro

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
- 4 stats cards: por revisar (count + total), en proceso, pagado este mes, cobro pendiente instituciones
- Tabs: Por revisar | Aprobados | Pagados | Cobros institucion
- Busqueda por interprete
- **Tab "Por revisar"** (status PENDING):
  - Cards con desglose: fecha, interprete, institucion, lengua, duracion, breakdown, monto grande
  - Boton "Revisar y aprobar" → abre modal de revision
- **Modal de revision:**
  - Servicio: lengua, contexto, tipo, descripcion
  - Timeline visual: creacion, aceptacion, inicio, desconexiones, fin
  - Desglose billing: duracion total, facturable, desconexiones (dentro/fuera gracia), horas cobradas, tarifa, monto
  - Datos bancarios: nombre, banco, CLABE (enmascarada, boton "ver completa"), titular
  - Institucion: nombre, tipo, ciudad
  - Acciones: textarea notas admin, boton "Aprobar pago — $X", boton "Ajustar monto"
  - Sub-formulario ajuste: monto ajustado, motivo obligatorio, boton confirmar
- **Tab "Aprobados"** (status PROCESSING):
  - Tabla: interprete, monto (con tachado si ajustado), CLABE ultimos 4, motivo ajuste
  - Boton "Marcar pagado" → modal confirmacion
- **Tab "Pagados"** (status COMPLETED):
  - Tabla: fecha pago, interprete, monto, confirmado (badge verde/amber)
- **Tab "Cobros institucion":**
  - Tabla: institucion, servicio, fecha, monto, estado cobro (PENDING/INVOICED/COLLECTED)
  - Acciones: Facturar (PENDING→INVOICED), Cobrar (INVOICED→COLLECTED)

### Instituciones (/admin/instituciones)
- Tabs: Aprobadas | Pendientes | Rechazadas | Suspendidas (con conteo). Default a Pendientes si hay alguna
- Tabla: nombre, tipo, ciudad, email, estado (badge), contrato, solicitudes
- Click abre modal detalle:
  - Info: tipo, responsable, email, telefono, ciudad, estado, fecha registro, estatus badge
  - Si rechazada: card roja con motivo
  - Campos admin: notas internas (textarea), numero de contrato (input)
  - Acciones segun status:
    - PENDING: "Aprobar cuenta" + "Rechazar" (abre sub-formulario con motivo obligatorio min 10 chars)
    - APPROVED: "Suspender cuenta"
    - REJECTED/SUSPENDED: "Reactivar cuenta"
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
- Soporta query params: ?variantId=X&from=identification pre-selecciona la variante y muestra banner "Lengua identificada por IA"

### Identificacion linguistica (/institucion/identificacion)
- Prototipo de identificacion de lengua indigena por IA
- **Estado 1 (idle):** Icono Mic grande, boton circular rojo para grabar, link para subir archivo de audio
- **Estado 2 (recording):** Indicador pulsante rojo, timer "00:05", waveform en tiempo real (Web Audio API + AnalyserNode + Canvas, barras redin-gold-400), boton cuadrado para detener
- **Estado 3 (recorded):** "Audio grabado — X segundos", boton "Analizar audio" (Sparkles), boton "Grabar de nuevo"
- **Estado 4 (analyzing):** Barra de progreso animada con 3 fases:
  1. "Procesando audio..." (0-30%, 2s, icono Mic)
  2. "Comparando con base de datos linguistica..." (30-70%, 2s, icono Database)
  3. "Identificando variante linguistica..." (70-100%, icono Brain)
- **Estado 5 (result):** Card con borde dorado, confianza 92%, lengua/variante/region/familia, badge "Prototipo", boton "Solicitar interprete de {variante}" → redirige a nueva-solicitud, boton "Analizar otro audio"
- Llama a POST /api/language-identification (3s delay simulado del backend)

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
- **Tab Pendientes** (PENDING + PROCESSING):
  - Cards con fecha, institucion, lengua, breakdown del cobro, monto grande
  - Badge status: PENDING → "En revision por REDIN" (amber), PROCESSING → "Aprobado — pago en proceso" (blue)
  - Si hay ajuste: card amber con monto original tachado, monto ajustado, motivo
- **Tab Cobrados** (COMPLETED):
  - Tabla con breakdown, boton "Confirmar" si no confirmado
- Se actualiza por WebSocket (payment:completed, payment:approved, payment:adjusted)

### Mi perfil (/interprete/perfil)
- Info personal editable: telefono, comunidad, estado, bio
- Nombre/email: solo lectura
- Lenguas: badges (solo lectura, asignadas por admin)
- Datos bancarios: banco, CLABE (18 digitos), titular (editables)
- Toggle disponibilidad
