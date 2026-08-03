import { prisma } from "../src/config/database";
import { env } from "../src/config/env";
import { auth } from "../src/auth/auth";

// Crea los roles base y el usuario administrador inicial.
// Uso: pnpm db:seed
async function main() {
  const roles = [
    { name: "admin", description: "Administrador del sistema" },
    { name: "user", description: "Usuario regular" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) throw new Error("No se pudo crear el rol 'admin'");

  const existingAdmin = await prisma.user.findUnique({
    where: { email: env.ADMIN_EMAIL },
  });

  if (!existingAdmin) {
    // Delegamos la creación (y hasheo del password) a better-auth.
    const response = await auth.api.signUpEmail({
      body: {
        name: "Administrador",
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      },
      asResponse: true,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`No se pudo crear el admin: ${JSON.stringify(body)}`);
    }
    const { user } = await response.json();

    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    });
    console.log(`Administrador creado: ${env.ADMIN_EMAIL}`);
  } else {
    console.log(`El administrador ya existe: ${env.ADMIN_EMAIL}`);
  }

  console.log("Seed completado ✅");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
