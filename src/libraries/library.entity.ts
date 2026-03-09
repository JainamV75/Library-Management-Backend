import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';
import { BookTitle } from '../books/book-title.entity';

@Entity()
export class Library {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => User, (user) => user.library)
  users: User[];

  @OneToMany(() => Book, (book) => book.library)
  books: Book[];

  @OneToMany(() => BookTitle, (bookTitle) => bookTitle.library)
  bookTitles: BookTitle[];
}
