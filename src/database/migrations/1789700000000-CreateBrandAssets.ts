import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBrandAssets1789700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brand_assets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'brand_id', type: 'uuid', isNullable: false },
          { name: 'storage_path', type: 'text', isNullable: false },
          { name: 'public_url', type: 'text', isNullable: false },
          { name: 'file_name', type: 'text', isNullable: false },
          { name: 'mime_type', type: 'text', isNullable: false },
          { name: 'size_bytes', type: 'int', isNullable: false },
          { name: 'uploaded_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'brand_assets',
      new TableForeignKey({
        name: 'FK_brand_assets_brand',
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'brand_assets',
      new TableIndex({
        name: 'IDX_brand_assets_brand_created',
        columnNames: ['brand_id', 'created_at'],
      }),
    );

    await queryRunner.query(
      `insert into storage.buckets (id, name, public)
       values ('brand-assets', 'brand-assets', true)
       on conflict (id) do nothing`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('brand_assets', 'IDX_brand_assets_brand_created');
    await queryRunner.dropForeignKey('brand_assets', 'FK_brand_assets_brand');
    await queryRunner.dropTable('brand_assets');
    await queryRunner.query(
      `delete from storage.buckets where id = 'brand-assets'`,
    );
  }
}
