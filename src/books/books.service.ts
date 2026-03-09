import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Book } from './book.entity';
import { BookTitle } from './book-title.entity';
import { BookCopyStatus } from './book-copy-status.enum';
import { Role } from '../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';


@Injectable()
export class BooksService {

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,

    @InjectRepository(BookTitle)
    private bookTitleRepository: Repository<BookTitle>,

    private auditService: AuditService,
  ) {}

  async createBook(currentUser, body) {
    if (currentUser.role === Role.USER) {
      throw new ForbiddenException('Users cannot create books');
    }

    let titleRecord = await this.bookTitleRepository.findOne({
      where: {
        title: body.title,
        author: body.author,
        library: { id: currentUser.libraryId },
      },
      relations: ['library'],
    });

    if (!titleRecord) {
      titleRecord = this.bookTitleRepository.create({
        title: body.title,
        author: body.author,
        library: { id: currentUser.libraryId },
      });
      titleRecord = await this.bookTitleRepository.save(titleRecord);
    }

    const copyCode = `B-${currentUser.libraryId}-${Date.now().toString(36).toUpperCase()}`;

    const book = this.bookRepository.create({
      title: body.title,
      author: body.author,
      genre: body.genre?.trim() || null,
      bookCoverUrl: body.bookCoverUrl || null,
      library: { id: currentUser.libraryId },
      titleRecord: { id: titleRecord.id },
      copyCode,
      status: BookCopyStatus.AVAILABLE,
    });

    const saved = await this.bookRepository.save(book);
    await this.auditService.log(
      currentUser,
      'BOOK_COPY_CREATED',
      'BOOK',
      saved.id,
      {
        title: saved.title,
        author: saved.author,
        genre: saved.genre,
        bookCoverUrl: saved.bookCoverUrl,
        copyCode: saved.copyCode,
        titleRecordId: titleRecord.id,
      },
    );

    return saved;
  }

  async getBooks(
    currentUser,
    filters?: {
      q?: string;
      title?: string;
      author?: string;
      genre?: string;
      copyCode?: string;
    },
  ) {
    const q = filters?.q?.trim();
    const title = filters?.title?.trim();
    const author = filters?.author?.trim();
    const genre = filters?.genre?.trim();
    const copyCode = filters?.copyCode?.trim();

    const whereBase = { library: { id: currentUser.libraryId } };

    let where: any = whereBase;
    if (q) {
      where = [
        { ...whereBase, title: ILike(`%${q}%`) },
        { ...whereBase, author: ILike(`%${q}%`) },
        { ...whereBase, genre: ILike(`%${q}%`) },
        { ...whereBase, copyCode: ILike(`%${q}%`) },
      ];
    } else if (title || author || genre || copyCode) {
      where = {
        ...whereBase,
        ...(title ? { title: ILike(`%${title}%`) } : {}),
        ...(author ? { author: ILike(`%${author}%`) } : {}),
        ...(genre ? { genre: ILike(`%${genre}%`) } : {}),
        ...(copyCode ? { copyCode: ILike(`%${copyCode}%`) } : {}),
      };
    }

    return this.bookRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async updateBook(currentUser, bookId: number, body) {
    if (currentUser.role === Role.USER) {
      throw new ForbiddenException('Users cannot update books');
    }

    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['library', 'titleRecord'],
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Cannot update outside library');
    }

    const nextTitle = (body.title ?? book.title).trim();
    const nextAuthor = (body.author ?? book.author).trim();
    const nextGenre = (body.genre ?? book.genre ?? '').trim();
    const nextCover = body.bookCoverUrl === undefined ? book.bookCoverUrl : (body.bookCoverUrl || null);

    let titleRecord = await this.bookTitleRepository.findOne({
      where: {
        title: nextTitle,
        author: nextAuthor,
        library: { id: currentUser.libraryId },
      },
      relations: ['library'],
    });

    if (!titleRecord) {
      titleRecord = this.bookTitleRepository.create({
        title: nextTitle,
        author: nextAuthor,
        library: { id: currentUser.libraryId },
      });
      titleRecord = await this.bookTitleRepository.save(titleRecord);
    }

    book.title = nextTitle;
    book.author = nextAuthor;
    book.genre = nextGenre || null;
    book.bookCoverUrl = nextCover;
    book.titleRecord = titleRecord;

    const saved = await this.bookRepository.save(book);
    await this.auditService.log(
      currentUser,
      'BOOK_COPY_UPDATED',
      'BOOK',
      saved.id,
      {
        title: saved.title,
        author: saved.author,
        genre: saved.genre,
        bookCoverUrl: saved.bookCoverUrl,
        copyCode: saved.copyCode,
        titleRecordId: titleRecord.id,
      },
    );

    return saved;
  }

  async deleteBook(currentUser, bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['library'],
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Cannot delete outside library');
    }

    if (currentUser.role !== Role.ROOT && currentUser.role !== Role.LIBRARIAN) {
      throw new ForbiddenException('Only ROOT or LIBRARIAN can delete books');
    }

    await this.auditService.log(
      currentUser,
      'BOOK_COPY_DELETED',
      'BOOK',
      book.id,
      {
        title: book.title,
        author: book.author,
        genre: book.genre,
        bookCoverUrl: book.bookCoverUrl,
        copyCode: book.copyCode,
      },
    );

    return this.bookRepository.remove(book);
  }
}
