import { prisma } from "@/lib/db/client";

/** Small, cheap reference lists for admin form `<select>`s. */

export function listOrganizations() {
  return prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function listCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function listStates() {
  return prisma.state.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function listExamsForSelect() {
  return prisma.exam.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}
