import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectDimensionsAndPreviewPath1789000000000
  implements MigrationInterface
{
  name = 'AddProjectDimensionsAndPreviewPath1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "source_image_path" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "width" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "height" integer`,
    );

    // Backfill rows that predate the dimension columns with a square default.
    await queryRunner.query(
      `UPDATE "projects" SET "width" = 1080 WHERE "width" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "projects" SET "height" = 1080 WHERE "height" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "width" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "height" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "height"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "width"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "source_image_path"`,
    );
  }
}
