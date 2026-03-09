import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';
import { Assignment } from '../assignments/assignment.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Book)
    private bookRepository: Repository<Book>,

    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
  ) {}

  async getStats(libraryId: number) {
    const [totalUsers, totalBooks, activeAssignments, overdueBooks] = await Promise.all([
      this.userRepository.count({ where: { library: { id: libraryId } } }),
      this.bookRepository.count({ where: { library: { id: libraryId } } }),
      this.assignmentRepository.count({
        where: {
          library: { id: libraryId },
          returned: false,
        },
      }),
      this.assignmentRepository.count({
        where: {
          library: { id: libraryId },
          returned: false,
          dueDate: LessThan(new Date()),
        },
      }),
    ]);

    return {
      totalUsers,
      totalBooks,
      activeAssignments,
      overdueBooks,
    };
  }
}
