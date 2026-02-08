import prisma from "../../prisma/client.js";

/**
 * Create a new category
 */
export const createCategory = async (categoryData) => {
    const { name, slug, description, icon, type, parentId, orderIndex } = categoryData;

    // Check if slug is unique
    const existing = await prisma.category.findUnique({
        where: { slug }
    });

    if (existing) {
        throw new Error(`Category with slug "${slug}" already exists`);
    }

    return await prisma.category.create({
        data: {
            name,
            slug,
            description,
            icon,
            type,
            parentId,
            orderIndex: orderIndex || 0
        }
    });
};

/**
 * Get all categories (including hierarchy)
 */
export const getAllCategories = async (onlyActive = true) => {
    return await prisma.category.findMany({
        where: onlyActive ? { isActive: true } : {},
        include: {
            children: {
                include: {
                    children: true // Support up to 3 levels for now
                }
            }
        },
        orderBy: { orderIndex: "asc" }
    });
};

/**
 * Get a single category by ID or Slug
 */
export const getCategory = async (idOrSlug) => {
    return await prisma.category.findFirst({
        where: {
            OR: [
                { id: idOrSlug },
                { slug: idOrSlug }
            ]
        },
        include: {
            children: true,
            parent: true
        }
    });
};

/**
 * Update a category
 */
export const updateCategory = async (id, updateData) => {
    return await prisma.category.update({
        where: { id },
        data: updateData
    });
};

/**
 * Delete a category (Hard delete)
 */
export const deleteCategory = async (id) => {
    return await prisma.category.delete({
        where: { id }
    });
};

/**
 * Toggle category activation (Soft status)
 */
export const toggleCategoryStatus = async (id, isActive) => {
    return await prisma.category.update({
        where: { id },
        data: { isActive }
    });
};
