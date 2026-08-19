import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiRoutes } from './routes/api-routes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(ApiRoutes.globalPrefix);
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
