import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './book.entity';
import { BookTitle } from './book-title.entity';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Book, BookTitle]), AuditModule],
  providers: [BooksService],
  controllers: [BooksController],
})
export class BooksModule {}
