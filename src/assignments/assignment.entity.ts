import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';
import { Library } from '../libraries/library.entity';

@Entity()
export class Assignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  assignedAt!: Date;

  @Column({ default: false })
  returned!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate!: Date;

  @Column({ type: 'float', default: 0 })
  fineAmount!: number;

  @Column({ default: 0 })
  renewCount!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  book!: Book;

  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  library!: Library;
}
