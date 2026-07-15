import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBrandFonts1789800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brand_fonts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'brand_id', type: 'uuid', isNullable: false },
          { name: 'font_family', type: 'text', isNullable: false },
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
      'brand_fonts',
      new TableForeignKey({
        name: 'FK_brand_fonts_brand',
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'brand_fonts',
      new TableIndex({
        name: 'UQ_brand_fonts_brand_family',
        columnNames: ['brand_id', 'font_family'],
        isUnique: true,
      }),
    );

    await queryRunner.query(
      `insert into storage.buckets (id, name, public)
       values ('brand-fonts', 'brand-fonts', true)
       on conflict (id) do nothing`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('brand_fonts', 'UQ_brand_fonts_brand_family');
    await queryRunner.dropForeignKey('brand_fonts', 'FK_brand_fonts_brand');
    await queryRunner.dropTable('brand_fonts');
    await queryRunner.query(
      `delete from storage.buckets where id = 'brand-fonts'`,
    );
  }
}
