import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`Bluff server running on http://localhost:${port}`);
  console.log(`WebSocket namespace: /game`);
}

bootstrap();
