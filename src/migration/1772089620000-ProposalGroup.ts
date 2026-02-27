import { MigrationInterface, QueryRunner } from "typeorm";

export class ProposalGroup1772089620000 implements MigrationInterface {
    name = 'ProposalGroup1772089620000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create the proposal_group table
        await queryRunner.query(`
            CREATE TABLE \`proposal_group\` (
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`proposalGroupId\` varchar(36) NOT NULL,
                \`organizationId\` varchar(36) NULL,
                PRIMARY KEY (\`proposalGroupId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 2. Add proposalGroupId column to oppurtunity (with matching charset for FK)
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD COLUMN \`proposalGroupId\` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
        `);

        // 3. Add isPrimary column to oppurtunity (default false — existing rows are non-grouped)
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD COLUMN \`isPrimary\` tinyint(1) NOT NULL DEFAULT 0
        `);

        // 4. Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD CONSTRAINT \`FK_oppurtunity_proposalGroupId\`
            FOREIGN KEY (\`proposalGroupId\`)
            REFERENCES \`proposal_group\`(\`proposalGroupId\`)
            ON DELETE SET NULL ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FK first
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            DROP FOREIGN KEY \`FK_oppurtunity_proposalGroupId\`
        `);

        // Drop columns
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`isPrimary\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`proposalGroupId\``);

        // Drop table
        await queryRunner.query(`DROP TABLE \`proposal_group\``);
    }
}
