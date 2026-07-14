import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitProjectSchemaIntoSourceDesign1789500000000
  implements MigrationInterface
{
  name = 'SplitProjectSchemaIntoSourceDesign1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs" ALTER COLUMN "prompt" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "is_source" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_designs_project_is_source" ON "designs" ("project_id", "is_source")`,
    );

    await queryRunner.query(
      `INSERT INTO "designs" (
         "id", "project_id", "width", "height", "prompt", "resized_json",
         "image_url", "image_storage_path", "claude_model",
         "is_source", "created_at", "updated_at"
       )
       SELECT gen_random_uuid(), p."id", p."width", p."height", NULL, p."source_json",
              p."source_image_url", NULL, NULL,
              true, p."created_at", p."updated_at"
         FROM "projects" p`,
    );

    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "source_json"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "width"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "height"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "source_json" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "width" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "height" integer`,
    );

    await queryRunner.query(
      `UPDATE "projects" p
         SET "source_json" = d."resized_json",
             "width" = d."width",
             "height" = d."height"
        FROM "designs" d
        WHERE d."project_id" = p."id"
          AND d."is_source" = true`,
    );

    await queryRunner.query(
      `UPDATE "projects" SET "source_json" = '{}'::jsonb WHERE "source_json" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "projects" SET "width" = 1080 WHERE "width" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "projects" SET "height" = 1080 WHERE "height" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "source_json" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "width" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "height" SET NOT NULL`,
    );

    await queryRunner.query(
      `DELETE FROM "designs" WHERE "is_source" = true`,
    );

    await queryRunner.query(`DROP INDEX "IDX_designs_project_is_source"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "is_source"`);

    await queryRunner.query(
      `UPDATE "designs" SET "prompt" = '' WHERE "prompt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ALTER COLUMN "prompt" SET NOT NULL`,
    );
  }
}
