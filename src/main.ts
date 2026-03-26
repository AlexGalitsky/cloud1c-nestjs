import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserStatusGuard } from './auth/guards/user-status.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  console.log(`ORIGIN: ${origin}`);

  app.enableCors({
    origin: origin,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Глобальный guard для проверки статуса пользователя
  app.useGlobalGuards(new UserStatusGuard(app.get(Reflector)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
