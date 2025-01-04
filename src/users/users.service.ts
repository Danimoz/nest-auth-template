import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { hash } from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async createUser(dto: RegisterDto) {
    const { email, password, role } = dto;
    // check if user exists
    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await hash(password, 10);
    const user: Omit<User, 'password'> = await this.prisma.user.create({
      data: { email, password: hashedPassword, role: role || 'REGULAR' },
    });
    return user;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    })
  }
}
