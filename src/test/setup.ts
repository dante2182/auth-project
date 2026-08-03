import { beforeEach } from "vitest";
import { prisma } from "../config/database";

// Limpia los datos entre tests para que cada test parta de un estado conocido.
// NOTA: los roles (tabla Role) NO se limpian; el global-setup los siembra.
beforeEach(async () => {
  await prisma.post.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
});
