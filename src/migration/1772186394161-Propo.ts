import { MigrationInterface, QueryRunner } from "typeorm";

export class Propo1772186394161 implements MigrationInterface {
    name = 'Propo1772186394161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop FK_8ff9dc425f53fc16f6de22a1de4 (batchId FK) if it still exists
        const fkBatch: { CONSTRAINT_NAME: string }[] = await queryRunner.query(`
            SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oppurtunity'
              AND CONSTRAINT_NAME = 'FK_8ff9dc425f53fc16f6de22a1de4'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        for (const row of fkBatch) {
            await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
        }

        // Drop REL_ebe... index if it still exists
        const idxRows: { INDEX_NAME: string }[] = await queryRunner.query(`
            SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oppurtunity'
              AND INDEX_NAME = 'REL_ebe249242093c8fefc296e98bb'
        `);
        if (idxRows.length > 0) {
            await queryRunner.query(`DROP INDEX \`REL_ebe249242093c8fefc296e98bb\` ON \`oppurtunity\``);
        }

        // Create proposal_group table if it doesn't exist
        const pgTable = await queryRunner.getTable('proposal_group');
        if (!pgTable) {
            await queryRunner.query(`CREATE TABLE \`proposal_group\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`modifiedBy\` varchar(255) NULL, \`proposalGroupId\` varchar(36) NOT NULL, \`organizationId\` varchar(36) NULL, PRIMARY KEY (\`proposalGroupId\`)) ENGINE=InnoDB`);
        }

        // Drop batchId column if it exists
        const oppTable = await queryRunner.getTable('oppurtunity');
        if (oppTable?.findColumnByName('batchId')) {
            await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`batchId\``);
        }

        // Add proposalGroupId if missing
        if (!oppTable?.findColumnByName('proposalGroupId')) {
            await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD \`proposalGroupId\` varchar(36) NULL`);
        }

        // Add isPrimary if missing
        if (!oppTable?.findColumnByName('isPrimary')) {
            await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD \`isPrimary\` tinyint NOT NULL DEFAULT 0`);
        }

        // Add FK_81273f72e18a7699080a3b29d6e if missing
        const fkPg: { CONSTRAINT_NAME: string }[] = await queryRunner.query(`
            SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'oppurtunity'
              AND CONSTRAINT_NAME = 'FK_81273f72e18a7699080a3b29d6e'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        if (fkPg.length === 0) {
            await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_81273f72e18a7699080a3b29d6e\` FOREIGN KEY (\`proposalGroupId\`) REFERENCES \`proposal_group\`(\`proposalGroupId\`) ON DELETE SET NULL ON UPDATE CASCADE`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_81273f72e18a7699080a3b29d6e\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`isPrimary\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`proposalGroupId\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD \`batchId\` varchar(255) NULL`);
        await queryRunner.query(`DROP TABLE \`proposal_group\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_ebe249242093c8fefc296e98bb\` ON \`oppurtunity\` (\`leadLeadId\`)`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_8ff9dc425f53fc16f6de22a1de4\` FOREIGN KEY (\`batchId\`) REFERENCES \`opportunity_batch\`(\`batchId\`) ON DELETE NO ACTION ON UPDATE CASCADE`);
    }

}
