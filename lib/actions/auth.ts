"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function registerSchoolAdmin(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const schoolName = formData.get("schoolName") as string;

  if (!name || !email || !password || !schoolName) {
    return { error: "Missing required fields" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "User already registered" };

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.school.create({
      data: {
        name: schoolName,
        users: {
          create: {
            name,
            email,
            password: hashedPassword,
            role: "ADMIN",
          },
        },
      },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to register school account" };
  }
}