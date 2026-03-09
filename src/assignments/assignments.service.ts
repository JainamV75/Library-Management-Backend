import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { Assignment } from './assignment.entity';
import { Book } from '../books/book.entity';
import { BookCopyStatus } from '../books/book-copy-status.enum';
import { User } from '../users/user.entity';
import { Role } from '../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';

const FINE_PER_DAY = 50;

@Injectable()
export class AssignmentsService {

  constructor(
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,

    @InjectRepository(Book)
    private bookRepo: Repository<Book>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    private auditService: AuditService,
  ) {}

  async assignBook(currentUser, userId: number, bookId: number) {

    if (currentUser.role === Role.USER) {
      throw new ForbiddenException('Users cannot assign books');
    }

    const book = await this.bookRepo.findOne({
      where: { id: bookId },
      relations: ['library'],
    });

    if (!book || book.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Invalid book');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['library'],
    });

    if (!user || user.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Invalid user');
    }

    const existingAssignment = await this.assignmentRepo.findOne({
      where: {
        user: { id: userId },
        book: { id: bookId },
        returned: false,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('Book is already assigned to this user');
    }

    const activeAssignment = await this.assignmentRepo.findOne({
      where: {
        book: { id: bookId },
        returned: false,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException('This book is already assigned to another user');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const assignment = this.assignmentRepo.create({
      book,
      user,
      library: { id: currentUser.libraryId },
      dueDate,
    });
    const saved = await this.assignmentRepo.save(assignment);
    book.status = BookCopyStatus.BORROWED;
    await this.bookRepo.save(book);

    await this.auditService.log(
      currentUser,
      'BOOK_ASSIGNED',
      'ASSIGNMENT',
      saved.id,
      {
        userId,
        bookId,
        dueDate: saved.dueDate,
      },
    );

    return saved;
  }

  async getUserAssignments(userId: number) {
    return this.assignmentRepo.find({
      where: {
        user: { id: userId },
        returned: false,
      },
      relations: ['book'],
    });
  }

  async getUserAssignmentHistory(userId: number) {
    return this.assignmentRepo.find({
      where: { user: { id: userId } },
      relations: ['book'],
      order: { assignedAt: 'DESC' },
    });
  }

  async getLibraryAssignments(currentUser, copyCode?: string) {
    const trimmedCopyCode = copyCode?.trim();
    const baseWhere: any = {
      library: { id: currentUser.libraryId },
      ...(trimmedCopyCode
        ? {
            book: { copyCode: ILike(`%${trimmedCopyCode}%`) },
          }
        : {}),
    };

    const where =
      currentUser.role === Role.LIBRARIAN
        ? { ...baseWhere, user: { role: Not(Role.ROOT) } }
        : baseWhere;

    return this.assignmentRepo.find({
      where,
      relations: ['user', 'book'],
      order: { assignedAt: 'DESC' },
    });
  }

  async returnBook(currentUser, assignmentId: number) {
    if (currentUser.role === Role.USER) {
      throw new ForbiddenException('Users cannot return books');
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['user', 'library', 'book'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Cannot return this book');
    }

    if (assignment.returned) {
      throw new BadRequestException('Book already returned');
    }

    const today = new Date();
    const dueDate = new Date(assignment.dueDate);

    let fine = 0;

    if (today > dueDate) {
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = diffDays * FINE_PER_DAY;
    }

    assignment.returned = true;
    assignment.returnedAt = today;
    assignment.fineAmount = fine;
    const saved = await this.assignmentRepo.save(assignment);
    const book = await this.bookRepo.findOne({ where: { id: assignment.book.id } });
    if (book) {
      book.status = BookCopyStatus.AVAILABLE;
      await this.bookRepo.save(book);
    }

    await this.auditService.log(
      currentUser,
      'BOOK_RETURNED',
      'ASSIGNMENT',
      saved.id,
      { fineAmount: saved.fineAmount },
    );

    return saved;
  }

  async renewBook(currentUser, assignmentId: number) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['user'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.user.id !== currentUser.userId) {
      throw new ForbiddenException('Cannot renew this book');
    }

    if (assignment.returned) {
      throw new BadRequestException('Book already returned');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(assignment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      throw new BadRequestException('Cannot renew overdue book');
    }

    if (assignment.renewCount >= 2) {
      throw new BadRequestException('Renewal limit reached');
    }

    dueDate.setDate(dueDate.getDate() + 7);

    assignment.dueDate = dueDate;
    assignment.renewCount += 1;

    const saved = await this.assignmentRepo.save(assignment);
    await this.auditService.log(
      currentUser,
      'BOOK_RENEWED',
      'ASSIGNMENT',
      saved.id,
      {
        renewCount: saved.renewCount,
        dueDate: saved.dueDate,
      },
    );

    return saved;
  }

  async getMyAssignments(currentUser: any) {
    const assignments = await this.assignmentRepo.find({
      where: {
        user: { id: currentUser.userId },
        returned: false,
      },
      relations: ['book'],
    });

    const today = new Date();
    const finePerDay = FINE_PER_DAY;

    return assignments.map((assignment) => {
      const dueDate = new Date(assignment.dueDate);

      let overdueDays = 0;
      let fine = 0;

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fine = overdueDays * finePerDay;
      }

      return {
        ...assignment,
        overdueDays,
        fine,
      };
    });
  }

  async cleanupDuplicateActiveAssignments(currentUser) {
    if (currentUser.role !== Role.ROOT) {
      throw new ForbiddenException('Only ROOT can run cleanup');
    }

    const activeAssignments = await this.assignmentRepo.find({
      where: {
        library: { id: currentUser.libraryId },
        returned: false,
      },
      relations: ['book', 'user', 'library'],
      order: { assignedAt: 'ASC' },
    });

    const byBook = new Map<number, Assignment[]>();
    for (const assignment of activeAssignments) {
      const key = assignment.book.id;
      const list = byBook.get(key) || [];
      list.push(assignment);
      byBook.set(key, list);
    }

    const now = new Date();
    const updated: Assignment[] = [];
    const cleanedBooks: Array<{
      bookId: number;
      keptAssignmentId: number;
      returnedAssignmentIds: number[];
    }> = [];

    for (const [bookId, assignments] of byBook.entries()) {
      if (assignments.length <= 1) continue;

      const [kept, ...duplicates] = assignments;
      for (const duplicate of duplicates) {
        duplicate.returned = true;
        duplicate.returnedAt = now;
        duplicate.fineAmount = duplicate.fineAmount ?? 0;
        updated.push(duplicate);
      }

      cleanedBooks.push({
        bookId,
        keptAssignmentId: kept.id,
        returnedAssignmentIds: duplicates.map((a) => a.id),
      });
    }

    if (updated.length > 0) {
      await this.assignmentRepo.save(updated);
    }

    return {
      message: 'Duplicate active assignments cleanup completed',
      updatedCount: updated.length,
      cleanedBooks,
    };
  }
}
