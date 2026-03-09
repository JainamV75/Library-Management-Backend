import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  @Column({ type: 'varchar', nullable: true })
  actorRole: string | null;

  @Column({ type: 'int', nullable: true })
  libraryId: number | null;

  @Column()
  action: string;

  @Column()
  entityType: string;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
