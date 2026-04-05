# REDIN — Sistema de Diseno

## Paleta de colores

### Primary — Gold (dorado/ocre)

Acciones primarias, botones CTA, acentos, links.

| Stop | Hex | Uso |
|---|---|---|
| 50 | #FDF8ED | Fondos de highlight |
| 100 | #F9EDCC | Cards destacadas |
| 200 | #F2D98A | Bordes de acento |
| 300 | #E8C04E | Hover de botones |
| 400 | #C4941B | **Botones primary, links, sidebar activo** |
| 500 | #A67B15 | Hover primary |
| 600 | #88630F | Texto sobre fondos gold |
| 700 | #6B4D0B | — |
| 800 | #4E3808 | — |
| 900 | #332504 | — |

### Secondary — Forest (verde bosque)

Botones secundarios, sidebar, estados de exito.

| Stop | Hex | Uso |
|---|---|---|
| 50 | #EDF5F1 | Fondos de exito |
| 100 | #D1E8DD | Cards de exito |
| 200 | #A3D1BB | Bordes verdes |
| 300 | #5DB08E | — |
| 400 | #2D8B66 | — |
| 500 | #1A6B4D | — |
| 600 | #0F5239 | **Botones secondary** |
| 700 | #0A3D2B | Titulos principales, login interno |
| 800 | #06291C | **Sidebar, login interno fondo** |
| 900 | #031A11 | — |

### Neutral — Earth (tonos tierra)

Textos, fondos, bordes, neutrales.

| Stop | Hex | Uso |
|---|---|---|
| 50 | #F7F4F0 | **Fondo de pagina** |
| 100 | #EDE7DF | Hover suave, skeletons |
| 200 | #DDD3C5 | **Bordes de cards y inputs** |
| 300 | #C4B49E | — |
| 400 | #A08A6E | Iconos deshabilitados |
| 500 | #7D6B53 | **Texto secundario** |
| 600 | #5E4F3D | Texto de input labels |
| 700 | #443929 | Texto de titulos menores |
| 800 | #2D2519 | — |
| 900 | #1A150E | **Texto principal (titulos)** |

---

## Tipografia

- **Font:** Geist Sans (via Next.js font optimization)
- **Mono:** Geist Mono (timers, contrasenas, CLABEs)

| Uso | Clase |
|---|---|
| Titulo de pagina | text-2xl font-bold text-redin-earth-900 |
| Subtitulo | text-sm text-redin-earth-500 |
| Texto cuerpo | text-sm text-redin-earth-700 |
| Label de input | text-sm font-medium text-redin-earth-700 |
| Texto pequeno | text-xs text-redin-earth-500 |
| Timer | text-4xl font-mono font-bold text-redin-gold-600 |

---

## Espaciado

| Propiedad | Clase | Uso |
|---|---|---|
| Padding de card | p-6 | Interior de cards |
| Gap entre secciones | space-y-6 | Separacion vertical |
| Gap en grids | gap-4 o gap-6 | Grids de stats, formularios |
| Padding de pagina | p-4 md:p-6 | Contenido principal |

---

## Bordes y esquinas

| Elemento | Clase |
|---|---|
| Cards | rounded-xl border border-redin-earth-200 |
| Botones | rounded-lg |
| Badges | rounded-full |
| Inputs | rounded-lg border border-redin-earth-200 |
| Modales | rounded-xl |
| Avatares | rounded-full |

---

## Fondos

| Elemento | Clase |
|---|---|
| Pagina completa | bg-redin-earth-50 |
| Cards | bg-white |
| Sidebar | bg-redin-forest-800 |
| Login institucion | bg-gradient-to-br from-redin-earth-50 to-redin-gold-50 |
| Login interno | bg-redin-forest-800 |
| Header | bg-white border-b border-redin-earth-200 |

---

## Estados de solicitud

| Estado | Badge variant | Color fondo | Color texto |
|---|---|---|---|
| PENDING | amber | amber-100 | amber-800 |
| NOTIFIED | blue | blue-100 | blue-800 |
| ACCEPTED | forest | forest-100 | forest-800 |
| IN_PROGRESS | purple | purple-100 | purple-800 |
| COMPLETED | green | green-100 | green-800 |
| CANCELLED | red | red-100 | red-800 |
| NO_SHOW | red | red-100 | red-800 |
| INTERRUPTED | amber | amber-100 | amber-800 |
| EXPIRED | gray | gray-100 | gray-600 |

---

## Iconografia

Lucide React para todos los iconos. Tamano estandar: h-4 w-4 (inline), h-5 w-5 (botones), h-6 w-6 (cards).

| Contexto | Icono |
|---|---|
| Dashboard | LayoutDashboard |
| Interpretes | Users |
| Lenguas | Languages |
| Solicitudes | FileText |
| Pagos | CreditCard |
| Instituciones | Building2 |
| Inmediata | Zap |
| Agendada | CalendarClock |
| Zoom | Video |
| Buscar | Search |
| Notificaciones | Bell |
| Logout | LogOut |

---

## Principios de diseno

1. **Paleta CALIDA**: Nunca grises frios (gray-*). Usar redin-earth-* como neutrales.
2. **Hover suave**: transition-all duration-200.
3. **Skeleton loading**: Para cargas de pagina completa. Spinners solo para acciones puntuales.
4. **Responsive**: Grid 4 columnas desktop, 2 tablet, 1 movil.
5. **Touch-friendly**: Botones min-h-[48px] en movil. ZoomButton ancho completo en mobile.
6. **Animaciones GPU**: Usar transform y opacity para animaciones (no width/height).
7. **Toast position**: top-right, duracion 5s, bordes redondeados redin.
