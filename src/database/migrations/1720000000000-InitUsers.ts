import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitUsers1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM ('admin', 'editor', 'viewer');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'email', type: 'text', isNullable: false },
          { name: 'full_name', type: 'text', isNullable: false },
          {
            name: 'role',
            type: 'user_role',
            isNullable: false,
            default: `'viewer'`,
          },
          { name: 'supabase_auth_id', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'UQ_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'UQ_users_supabase_auth_id',
        columnNames: ['supabase_auth_id'],
        isUnique: true,
        where: 'supabase_auth_id IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'UQ_users_supabase_auth_id');
    await queryRunner.dropIndex('users', 'UQ_users_email');
    await queryRunner.dropTable('users');
    await queryRunner.query('DROP TYPE IF EXISTS "user_role"');
  }
}
