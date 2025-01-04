import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async signup(@Body() dto: RegisterDto, @Res() res: Response) {
    const tokens = await this.authService.signup(dto)
    this.setRefreshCookie(res, tokens.refreshToken);
    return res.json({
      accessToken: tokens.accessToken
    })
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async signin(@Body() dto: LoginDto, @Res() res: Response) {
    const tokens = await this.authService.signin(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return res.json({
      accessToken: tokens.accessToken
    })
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout a user' })
  @ApiResponse({ status: 204, description: 'User logged out successfully' })
  async logout(@Req() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const refreshToken = req.cookies?.refreshToken
    console.log(req.user)
    console.log(refreshToken)
    await this.authService.logout(userId, refreshToken)

    res.clearCookie('refreshToken', { httpOnly: true })
    return res.json({ success: true })
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh a user token' })
  @ApiResponse({ status: 200, description: 'User token refreshed successfully' })
  async refreshToken(@Req() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const oldRefreshToken = req.user.refreshToken;

    const tokens = await this.authService.refreshToken(userId, oldRefreshToken)
    this.setRefreshCookie(res, tokens.refreshToken)
    return res.json({
      accessToken: tokens.accessToken
    })
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
  }
}
