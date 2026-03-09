import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Library } from '../libraries/library.entity';
import { Role } from '../common/enums/role.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  // 🔹 Belongs to Library
  @ManyToOne(() => Library, (library) => library.users, { onDelete: 'CASCADE' })
  library: Library;

  // 🔹 Parent User
  @ManyToOne(() => User, (user) => user.children, { nullable: true })
  parent: User;

  // 🔹 Child Users
  @OneToMany(() => User, (user) => user.parent)
  children: User[];
}
