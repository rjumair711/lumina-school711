"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerSchoolAdmin(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const schoolName = String(formData.get("schoolName") ?? "").trim();

  if (!name || !email || !password || !schoolName) {
    return { error: "Missing required fields" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existingUser) return { error: "An account with this email already exists" };

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