const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Admin User and System Configuration...");

  // 1. Initialize SystemConfig if not already present
  const existingConfig = await prisma.systemConfig.findUnique({
    where: { id: 'system_config' }
  });

  if (!existingConfig) {
    await prisma.systemConfig.create({
      data: {
        id: 'system_config',
        learning_rate_eta: 0.20,
        decay_constant_lambda: 0.10,
        weight_difficulty: 0.20,
        weight_exam: 0.30,
        weight_mastery: 0.15,
        weight_risk: 0.20,
        weight_course_unit: 0.15,
        min_session_duration: 30,
        max_session_duration: 180,
        allow_morning_revision: false
      }
    });
    console.log("✓ System configuration initialized with default parameters.");
  } else {
    console.log("✓ System configuration already exists.");
  }

  // 2. Create default Admin user if not already present
  const adminEmail = 'admin@neuroplan.edu';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('AdminPassword123!', salt);

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'NeuroPlan Admin',
        password_hash: password_hash,
        role: 'ADMIN',
        onboarding_stage: 'COMPLETE'
      }
    });
    console.log(`✓ Admin user created: ${adminEmail} (Password: AdminPassword123!)`);
  } else {
    // Ensure role is ADMIN
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' }
      });
      console.log(`✓ Updated role to ADMIN for: ${adminEmail}`);
    } else {
      console.log(`✓ Admin user already exists: ${adminEmail}`);
    }
  }

  // 3. Initialize default GlobalAcademicSession
  const existingSession = await prisma.globalAcademicSession.findFirst({
    where: { name: '2025/2026 Academic Session' }
  });

  if (!existingSession) {
    await prisma.globalAcademicSession.create({
      data: {
        name: '2025/2026 Academic Session',
        start_date: new Date('2025-10-01'),
        end_date: new Date('2026-07-31'),
        registration_opens: new Date('2025-09-01'),
        registration_closes: new Date('2025-10-15'),
        status: 'ACTIVE'
      }
    });
    console.log("✓ Seeded active academic session: 2025/2026 Academic Session");
  } else {
    console.log("✓ Active academic session '2025/2026 Academic Session' already exists.");
  }

  // 4. Initialize default SemesterWindows
  const existingFirstWindow = await prisma.semesterWindow.findUnique({
    where: { semester: 'First Semester' }
  });
  if (!existingFirstWindow) {
    await prisma.semesterWindow.create({
      data: {
        semester: 'First Semester',
        start_month: 1,
        start_day: 1,
        end_month: 6,
        end_day: 30,
        allow_early_reg: true,
        reg_lead_time: 15
      }
    });
    console.log("✓ Seeded First Semester window.");
  }

  const existingSecondWindow = await prisma.semesterWindow.findUnique({
    where: { semester: 'Second Semester' }
  });
  if (!existingSecondWindow) {
    await prisma.semesterWindow.create({
      data: {
        semester: 'Second Semester',
        start_month: 7,
        start_day: 1,
        end_month: 12,
        end_day: 31,
        allow_early_reg: true,
        reg_lead_time: 15
      }
    });
    console.log("✓ Seeded Second Semester window.");
  }
}

main()
  .catch((e) => {
    console.error("Error seeding admin config:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
