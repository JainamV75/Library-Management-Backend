import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Book, User]),
    AuditModule,
  ],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
