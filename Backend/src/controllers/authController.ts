import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Register User (Customer or Driver)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, phone, vehicleType, licensePlate } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user. If they are a driver, create driver details too in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'CUSTOMER',
          phone,
        },
      });

      if (role === 'DRIVER') {
        if (!vehicleType) {
          throw new Error('Vehicle type is required for drivers (BICYCLE, MOTORCYCLE, CAR)');
        }
        await tx.driver.create({
          data: {
            userId: user.id,
            vehicleType,
            licensePlate,
          },
        });
      }

      return user;
    });

    // Generate token
    const token = jwt.sign(
      { id: result.id, email: result.email, role: result.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Strip password out of the response
    const { password: _, ...userWithoutPassword } = result;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error registering user' });
  }
};

// Login User
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user and include driver details if they have a driver profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: { driver: true },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Strip password out
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error logging in' });
  }
};