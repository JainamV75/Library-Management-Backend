import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limits to support base64 image uploads.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients and same-origin/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      const isExactAllowed = allowedOrigins.includes(origin);
      let isVercelDomain = false;
      try {
        isVercelDomain = /\.vercel\.app$/.test(new URL(origin).hostname);
      } catch {
        isVercelDomain = false;
      }

      if (isExactAllowed || isVercelDomain) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 🔥 Enable global validation
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
