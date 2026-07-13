import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatus1783937220098 implements MigrationInterface {
    name = 'AddUserStatus1783937220098'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_status" AS ENUM('invited', 'active')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" "public"."user_status" NOT NULL DEFAULT 'invited'`);
        // Existing users predate the invite flow — treat them as already active.
        await queryRunner.query(`UPDATE "users" SET "status" = 'active'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."user_status"`);
    }

}
