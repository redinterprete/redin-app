# REDIN — Componentes

## Componentes UI (`src/components/ui/`)

### Button
Boton con multiples variantes y estados.
- **Props:** variant (primary/secondary/outline/ghost/danger), size (sm/md/lg), loading, disabled, leftIcon, rightIcon, fullWidth
- Primary: redin-gold-400. Secondary: redin-forest-600. Danger: red-600.

### Input
Campo de texto con label, error, e icono izquierdo.
- **Props:** label, error, leftIcon, + todos los props de `<input>`

### Card
Contenedor con variantes de estilo.
- **Props:** variant (default/elevated/highlighted), header, footer, children
- Highlighted: borde izquierdo redin-gold-400

### Badge
Etiqueta de estado con colores y dot animado.
- **Props:** variant (amber/blue/forest/purple/green/red/gray/gold), size (sm/md), dot, children

### Table
Tabla compuesta: Table, TableHeader, TableBody, TableRow, TableHead, TableCell.
- Header sticky al scroll.

### Modal
Dialogo modal con animacion scale+fade.
- **Props:** open, onClose, title, size (sm/md/lg), footer, children
- Usa @headlessui/react Dialog + Transition.

### Select
Selector dropdown custom con busqueda opcional.
- **Props:** options, value, onChange, placeholder, label, error, searchable

### Spinner
Indicador de carga SVG con animacion spin.
- **Props:** size (sm/md/lg), overlay

### StatsCard
Tarjeta de estadistica con icono, valor y label.
- **Props:** title, value, icon, accentColor
- StatsCardSkeleton para loading.

### EmptyState
Estado vacio con icono, titulo, descripcion y accion opcional.
- **Props:** icon, title, description, actionLabel, onAction

---

## Componentes Layout (`src/components/layout/`)

### Sidebar
Navegacion lateral con links segun rol.
- Admin: 6 items. Institucion: 4 items. Interprete: 5 items.
- Fondo forest-800, link activo con borde gold-400.
- Info de usuario + logout en footer.

### Header
Barra superior con titulo de pagina, campana, info de usuario.
- Mapea pathname a titulo via pageTitles record.
- Incluye ConnectionStatus y NotificationBell.

### MobileNav
Drawer lateral para movil usando @headlessui Dialog.
- Overlay bg-black/40 con slide desde izquierda.

### NotificationBell
Campana con badge de no leidas y dropdown.
- Badge rojo con conteo (max "9+").
- Dropdown: lista de notificaciones con icono por tipo, titulo, mensaje, timeAgo.
- No leidas: borde izquierdo gold-400.
- Botones: marcar todas, click individual marca como leida.

---

## Componentes Shared (`src/components/shared/`)

### StatusBadge
Mapea RequestStatus a Badge con color y texto en espanol.
- PENDING→amber, NOTIFIED→blue, ACCEPTED→forest, IN_PROGRESS→purple, COMPLETED→green, CANCELLED→red, NO_SHOW→red, INTERRUPTED→amber, EXPIRED→gray.

### LanguageSelector
Selector de dos niveles: primero lengua, luego variante.
- Carga lenguas con variantes desde GET /api/languages.
- Busqueda integrada.

### ProtectedRoute
Verifica autenticacion, rol, y estado de aprobacion. Redirige a / si no autenticado.
- Si interprete con mustChangePassword, redirige a /cambiar-contrasena.
- Si institucion con approvalStatus != APPROVED, redirige a /pendiente, /rechazada, o /suspendida segun status.
- Role mismatch: redirige al dashboard correcto del rol.

### DateTimePicker
Selector visual de fecha y hora.
- Botones rapidos: Hoy, Manana, Pasado.
- Mini calendario con navegacion de mes.
- Grid de horas (7AM-8PM) + minutos (:00/:15/:30/:45).
- Preview: "Lunes 14 de abril, 2:30 PM".

### ContextSelector
Grid de botones para contexto de interpretacion.
- Opciones: juridico (Scale), medico (Heart), social (Users), educativo (GraduationCap), otro (MoreHorizontal).

### RequestTimeline
Timeline vertical del progreso de una solicitud.
- Pasos: Creada, Notificada, Aceptada, En curso, Completada/Cancelada/No-show/Interrumpida.
- Done: circulo verde check. Active: gold pulse. Cancelled: rojo X.

### ZoomButton
Boton prominente para unirse a Zoom.
- Azul (blue-600, marca Zoom). Abre en nueva pestana.
- Muestra contrasena debajo.
- Retorna null si no hay joinUrl.

### MeetingStatus
Indicador de participantes conectados + timer facturable.
- Dots verde (pulse) / rojo por participante.
- Timer HH:MM:SS. "Pausado" cuando uno se desconecta.

### ConnectionStatus
Indicador de conexion WebSocket.
- Verde + "En vivo" si conectado. Rojo + "Sin conexion" si no.

### ClientProviders
Wrapper client component para providers en el root layout (server component).
- Orden: AuthProvider > SocketProvider > NotificationProvider > Toaster.

---

## Hooks (`src/hooks/`)

### useAuth
Re-export de AuthContext. Retorna: user, dbUser, loading, error, signIn, signUp, signOut.

### useSocket
Gestiona conexion Socket.IO con Firebase token auth.
- Conecta cuando dbUser existe. Desconecta en cleanup.
- Refresh token en reconnect_attempt.
- Retorna: socket, isConnected.

### useApi / useFetch
Llamadas al API con estados de loading/error.
- useApi: imperativo con execute(endpoint) y refetch().
- useFetch: declarativo, auto-fetch cuando endpoint cambia.

### useBillingTimer
Timer facturable con 3 estados que sobrevive refresh de pagina.
- Fetch inicial: GET /requests/:id/meeting para obtener currentBillableSeconds y totalSeconds del servidor.
- 3 estados:
  - **Running** — ambos conectados, billable y total corren cada segundo
  - **Grace** — uno salio, billable y total siguen corriendo + countdown de 5 min (isInGracePeriod=true)
  - **Paused** — gracia expiro, billable congelado, total sigue (isPausedByGrace=true)
- Escucha WebSocket: meeting:both_connected (resume), meeting:participant_left (grace), meeting:disconnection_warning (pause), meeting:ending (freeze todo + isEnding=true)
- Retorna: billableSeconds, totalSeconds, isRunning, isInGracePeriod, isPausedByGrace, graceRemainingSeconds, disconnectedParticipant, isLoading, isEnding.

---

## Contexts (`src/contexts/`)

### AuthContext
Estado global de autenticacion.
- State: user (FirebaseUser), dbUser (backend), loading, error.
- Metodos: signIn, signUp, signOut.
- Listener onAuthStateChanged con handledByAction ref para evitar doble fetch.

### SocketContext
Provee conexion Socket.IO a toda la app.
- Usa useSocket internamente.
- Retorna: socket, isConnected.

### NotificationContext
Estado de notificaciones in-app.
- State: notifications (ultimas 20), unreadCount, loading.
- Fetch inicial desde API, luego actualiza por WebSocket.
- Escucha: notification:new, request:available/taken/accepted/started/completed, payment:completed/approved/adjusted, meeting:renewed/both_connected/no_show, institution:approved/rejected/suspended.
- Metodos: markAsRead, markAllAsRead, refetch.
- Toasts por tipo de evento.

---

## Utilidades (`src/lib/`)

### api.ts
Cliente HTTP con auth automatica.
- getAuthToken() via Firebase getIdToken().
- Retry: 2 intentos para GET en errores 500+.
- Metodos: api.get, api.post, api.patch, api.delete.

### firebase.ts
Configuracion Firebase client SDK.
- Exporta: app, auth.

### socket.ts
Constante SOCKET_URL derivada de NEXT_PUBLIC_API_URL (strip /api).

### utils.ts
Helpers de formateo.
- cn(): clsx + tailwind-merge.
- formatDate(), formatDateTime(): es-MX locale.
- formatCurrency(): MXN con 2 decimales.
- formatDuration(): "1h 30min".
- formatTimer(): HH:MM:SS.
- timeAgo(): "Justo ahora", "Hace 5 min", "Hace 2h", "Hace 3d".
