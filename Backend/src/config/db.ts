import * as PrismaModule from '@prisma/client';

const { PrismaClient } = PrismaModule as any;

const prisma = new PrismaClient();

export default prisma;