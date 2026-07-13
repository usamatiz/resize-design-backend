import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBrands1720000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'name', type: 'text', isNullable: false },
          { name: 'logo_url', type: 'text', isNullable: false },
          { name: 'location', type: 'text', isNullable: false },
          { name: 'category', type: 'text', isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'UQ_brands_name',
        columnNames: ['name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('brands', 'UQ_brands_name');
    await queryRunner.dropTable('brands');
  }
}
