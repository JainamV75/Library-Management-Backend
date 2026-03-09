import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Library } from '../libraries/library.entity';
import { BookTitle } from './book-title.entity';
import { BookCopyStatus } from './book-copy-status.enum';

@Entity()
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  genre: string;

  @Column({ type: 'text', nullable: true })
  bookCoverUrl: string | null;

  @Column({ unique: true, nullable: true })
  copyCode: string;

  @Column({
    type: 'enum',
    enum: BookCopyStatus,
    default: BookCopyStatus.AVAILABLE,
  })
  status: BookCopyStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Library, (library) => library.books, { onDelete: 'CASCADE' })
  library: Library;

  @ManyToOne(() => BookTitle, (bookTitle) => bookTitle.copies, { nullable: true, onDelete: 'SET NULL' })
  titleRecord: BookTitle;
}
