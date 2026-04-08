# REDIN App

**Frontend de la Plataforma de Gestion de Servicios de Interpretacion en Lenguas Indigenas**

## Descripcion

REDIN (Red de Interpretes y Promotores Interculturales) es una plataforma que conecta instituciones publicas de Oaxaca con interpretes de lenguas indigenas. Esta aplicacion web ofrece 3 paneles diferenciados por rol: Administrador, Institucion e Interprete.

Se comunica con un backend Express ([redin-api](https://github.com/redinterprete/redin-api)) via API REST y WebSockets en tiempo real. Incluye integracion con Zoom para videollamadas automaticas, notificaciones in-app, un timer inteligente que solo cobra cuando ambos participantes estan conectados, flujo de aprobacion de instituciones, y un prototipo de identificacion linguistica por IA con grabacion de audio y waveform en tiempo real.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| Next.js 16 | Framework React con App Router |
| React 19 | Interfaz de usuario |
| TypeScript | Tipado estatico |
| Tailwind CSS 4 | Estilos con paleta personalizada REDIN |
| Firebase Auth | Autenticacion por rol (client SDK) |
| Socket.IO Client | Actualizaciones en tiempo real |
| react-hot-toast | Notificaciones toast |
| Lucide React | Iconografia |
| @headlessui/react | Componentes accesibles (Modal, Dialog) |

## Arquitectura

```
src/
  app/
    (auth-institution)/    # Login institucion + registro + pendiente/rechazada/suspendida
    (auth-internal)/       # Login admin/interprete + cambio contrasena
    (dashboard)/
      admin/               # 6 paginas
      institucion/         # 5 paginas
      interprete/          # 5 paginas
  components/
    ui/                    # 10 componentes base
    layout/                # 4 componentes de layout
    shared/                # 10 componentes de negocio
  contexts/                # 3 contexts (Auth, Socket, Notification)
  hooks/                   # 4 hooks
  lib/                     # 4 utilidades
  types/                   # Tipos TypeScript
```

## Instalacion

```bash
git clone https://github.com/redinterprete/redin-app.git
cd redin-app
npm install
cp .env.example .env
npm run dev
```

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend API |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API Key de Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio auth Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID proyecto Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ID mensajeria |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID Firebase |

## Scripts

| Script | Descripcion |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Compilar para produccion |
| `npm start` | Servidor compilado |
| `npm run lint` | Ejecutar ESLint |

## Documentacion

- [Paneles de usuario](docs/PANELS.md)
- [Componentes](docs/COMPONENTS.md)
- [Sistema de diseno](docs/DESIGN_SYSTEM.md)

## Rutas

| Ruta | Descripcion |
|---|---|
| `/` | Landing con selector de portal |
| `/login-institucion` | Login instituciones (con registro) |
| `/registro` | Registro de instituciones |
| `/pendiente` | Cuenta en revision (PENDING) |
| `/rechazada` | Cuenta rechazada con motivo |
| `/suspendida` | Cuenta suspendida |
| `/login` | Login admin/interpretes |
| `/cambiar-contrasena` | Onboarding contrasena temporal |
| `/admin/*` | Panel administrador (6 paginas) |
| `/institucion/*` | Panel institucion (5 paginas) |
| `/interprete/*` | Panel interprete (5 paginas) |

## Licencia

Privado — Red de Interpretes y Promotores Interculturales A.C.
