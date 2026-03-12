import { MigrationInterface, QueryRunner } from "typeorm";

export class ProposalGroupBaseColumns1772089620213 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`proposal_group\`
            ADD COLUMN \`deletedAt\` datetime(6) NULL,
            ADD COLUMN \`modifiedBy\` varchar(255) NULL DEFAULT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`proposal_group\`
            DROP COLUMN \`deletedAt\`,
            DROP COLUMN \`modifiedBy\`
        `);
    }

}
