import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limits to support base64 image uploads.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: "http://localhost:3000",
    credentials: true,
  });

  // 🔥 Enable global validation
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3001);
}
bootstrap();
