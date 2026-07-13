import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProjectsAndDesigns1720000020000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'brand_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'text', isNullable: false },
          { name: 'source_json', type: 'jsonb', isNullable: false },
          { name: 'source_image_url', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_brand',
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'IDX_projects_brand',
        columnNames: ['brand_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'designs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'width', type: 'int', isNullable: false },
          { name: 'height', type: 'int', isNullable: false },
          { name: 'prompt', type: 'text', isNullable: false },
          { name: 'resized_json', type: 'jsonb', isNullable: false },
          { name: 'image_url', type: 'text', isNullable: true },
          { name: 'image_storage_path', type: 'text', isNullable: true },
          { name: 'claude_model', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'designs',
      new TableForeignKey({
        name: 'FK_designs_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'designs',
      new TableIndex({
        name: 'IDX_designs_project',
        columnNames: ['project_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('designs', 'IDX_designs_project');
    await queryRunner.dropForeignKey('designs', 'FK_designs_project');
    await queryRunner.dropTable('designs');

    await queryRunner.dropIndex('projects', 'IDX_projects_brand');
    await queryRunner.dropForeignKey('projects', 'FK_projects_brand');
    await queryRunner.dropTable('projects');
  }
}
