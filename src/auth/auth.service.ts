import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { compare, compareSync, hash } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService
  ) { }

  async getTokens(id: number, role: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: id, email, role },
        { expiresIn: '15m', secret: process.env.JWT_ACCESS_SECRET }
      ),
      this.jwtService.signAsync(
        { sub: id, email, role },
        { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET }
      )
    ])
    return { accessToken, refreshToken }
  }

  async saveRefreshToken(userId: number, refreshToken: string) {
    const hashed = await hash(refreshToken, 10)
    await this.prisma.refreshToken.create({
      data: { userId, token: hashed }
    })
  }

  async signup(dto: RegisterDto) {
    const user = await this.usersService.createUser(dto)
    const tokens = await this.getTokens(user.id, user.role, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async signin(dto: LoginDto) {
    const { email, password } = dto
    const user = await this.usersService.findUserByEmail(email);
    if (!user) throw new NotFoundException('User does not exist');
    const passwordMatches = await compare(password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Wrong password, Access Denied');

    const tokens = await this.getTokens(user.id, user.role, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken)

    return tokens;
  }

  async logout(userId: number, refreshToken: string) {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId }
    });

    const matchedToken = storedTokens.find((tokenRecord) => {
      compareSync(refreshToken, tokenRecord.token)
    })

    if (matchedToken) {
      await this.prisma.refreshToken.delete({
        where: { id: matchedToken.id }
      })
    }

    return { success: true }
  }

  async refreshToken(userId: number, refreshToken: string) {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId }
    });

    // Compare the incoming token with the hashed tokens in the DB
    const tokenRecord = storedTokens.find((tokenObj) => {
      compareSync(refreshToken, tokenObj.token)
    })

    if (!tokenRecord) throw new NotFoundException('No token exist')

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('No user exist');

    const tokens = await this.getTokens(user.id, user.role, user.email);

    const hashedNewRefreshToken = await hash(tokens.refreshToken, 10);

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { token: hashedNewRefreshToken }
    });

    return tokens;
  }

}
