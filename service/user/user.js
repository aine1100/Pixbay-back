import prisma from "../../prisma/client.js";

export const getUserProfile=async(userId)=>{
    const user=await prisma.user.findUnique({
        where:{id:userId}
    });
    if(!user){
        throw new Error("User not found");
    }
    const {passwordHash,...userWithoutPassword}=user;
    return userWithoutPassword;
};

export const updateUserProfile=async(userId,userData)=>{
    const user=await prisma.user.findUnique({
        where:{id:userId}
    
    });
    if(!user){
        throw new Error("no user found wiht this id");
    }
    const updatedUser=await prisma.user.update({
        where:{id:userId},
        data:userData
    });
    const {passwordHash,...userWithoutPassword}=updatedUser;
    return userWithoutPassword;
};

export const getAllUsers=async()=>{
    const users=await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true
        }
    });
    return users;
};

export const deactivateUser=async(userId)=>{
    const user=await prisma.user.update({
        where:{id:userId},
        data: { isActive: false }
    });
    return { message: "User deactivated successfully" };
};

export const activateUser=async(userId)=>{
    const user=await prisma.user.update({
        where:{id:userId},
        data: { isActive: true }
    });
    return { message: "User activated successfully" };
};

export const getUserByEmail=async(email)=>{
    const user=await prisma.user.findUnique({
        where:{email}
    });
    if(!user) return null;
    const {passwordHash,...userWithoutPassword}=user;
    return userWithoutPassword;
};

export const updateUserRole=async(userId, role)=>{
    const updatedUser=await prisma.user.update({
        where:{id:userId},
        data: { role }
    });
    const {passwordHash,...userWithoutPassword}=updatedUser;
    return userWithoutPassword;
};

export const deleteUser=async(userId)=>{
    await prisma.user.delete({
        where:{id:userId}
    });
    return { message: "User deleted permanently" };
};