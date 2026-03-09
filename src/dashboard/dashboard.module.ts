import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';
import { Assignment } from '../assignments/assignment.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Book, Assignment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
