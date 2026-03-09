import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { Book } from './book.entity';
import { Library } from '../libraries/library.entity';

@Entity()
export class BookTitle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  library: Library;

  @OneToMany(() => Book, (book) => book.titleRecord)
  copies: Book[];
}
