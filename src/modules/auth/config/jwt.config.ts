import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    global: true,
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: `${process.env.JWT_EXPIRATION_TIME}s`,
    },
  }),
);
