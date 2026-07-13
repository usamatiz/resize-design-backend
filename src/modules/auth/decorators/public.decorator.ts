import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skip JwtAuthGuard on this route. Use sparingly (login, bootstrap, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
