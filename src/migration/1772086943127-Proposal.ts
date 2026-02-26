import { MigrationInterface, QueryRunner } from "typeorm";

export class Proposal1772086943127 implements MigrationInterface {
    name = 'Proposal1772086943127'

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // This migration was already applied to the database manually.
        // The documentType enum on sharepoint_document is already correct.
        // No-op to allow migration runner to mark this as complete.
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // No-op: cannot safely revert as existing data uses the new enum values.
    }

}
