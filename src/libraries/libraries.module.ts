import { Module } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { LibrariesController } from './libraries.controller';

@Module({
  providers: [LibrariesService],
  controllers: [LibrariesController]
})
export class LibrariesModule {}
