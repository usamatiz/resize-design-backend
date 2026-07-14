import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDesignPromptAndClaudeModel1789600000000
  implements MigrationInterface
{
  name = 'DropDesignPromptAndClaudeModel1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "prompt"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "claude_model"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "prompt" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "claude_model" text`,
    );
  }
}
