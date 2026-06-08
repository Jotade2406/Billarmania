# Billarmania

Sistema de gestión y reserva de mesas de billar para cadenas en Bolivia.

## Aplicaciones

| App | Tecnología | Descripción |
|-----|-----------|-------------|
| `apps/backend` | NestJS + Prisma | API REST + WebSockets + Jobs |
| `apps/web` | React + Vite + Tailwind | Dashboard cajero y panel contable |
| `apps/mobile` | React Native + Expo | App cliente para reservas |
| `packages/shared` | TypeScript | Enums y tipos compartidos |

## Infraestructura

- **Base de datos**: PostgreSQL en Supabase
- **Storage**: Supabase Storage (comprobantes, QRs)
- **Jobs en background**: BullMQ + Redis (Upstash)
- **Tiempo real**: Socket.io

## Inicio rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales reales

# 3. Correr backend en desarrollo
pnpm dev:backend

# 4. Correr web en desarrollo
pnpm dev:web
```

## Fases del proyecto

- [x] **Fase 0** — Entorno e infraestructura base
- [ ] **Fase 1** — MVP: flujo de reserva de punta a punta
- [ ] **Fase 2** — Operación del local (ventas, cierre de caja)
- [ ] **Fase 3** — Panel contable del dueño
- [ ] **Fase 4** — Pulido y producción
