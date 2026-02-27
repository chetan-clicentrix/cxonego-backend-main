import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLeadUniqueConstraint1772100000001 implements MigrationInterface {
    name = 'DropLeadUniqueConstraint1772100000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // The REL_ebe249... index is a unique index created by TypeORM when the
        // Lead relationship was @OneToOne. It also backs a FK constraint.
        // MySQL requires the FK to be dropped before the index can be removed.

        // Step 1: Find and drop the FK that references leadLeadId
        // TypeORM names it FK_<hash> — we look it up dynamically to be safe.
        const fkRows: { CONSTRAINT_NAME: string }[] = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME  = 'oppurtunity'
              AND COLUMN_NAME = 'leadLeadId'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        for (const row of fkRows) {
            await queryRunner.query(
                `ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
            );
        }

        // Step 2: Drop the unique index (now that the FK is gone)
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            DROP INDEX \`REL_ebe249242093c8fefc296e98bb\`
        `);

        // Step 3: Re-add the FK without the UNIQUE constraint so ManyToOne works
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD CONSTRAINT \`FK_oppurtunity_leadLeadId\`
            FOREIGN KEY (\`leadLeadId\`) REFERENCES \`lead\`(\`leadId\`)
            ON DELETE NO ACTION ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the non-unique FK
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            DROP FOREIGN KEY \`FK_oppurtunity_leadLeadId\`
        `);

        // Re-create the original unique index (restores OneToOne behaviour)
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD UNIQUE INDEX \`REL_ebe249242093c8fefc296e98bb\` (\`leadLeadId\`)
        `);

        // Re-add the original FK backed by that unique index
        await queryRunner.query(`
            ALTER TABLE \`oppurtunity\`
            ADD CONSTRAINT \`FK_ebe249242093c8fefc296e98bb\`
            FOREIGN KEY (\`leadLeadId\`) REFERENCES \`lead\`(\`leadId\`)
            ON DELETE NO ACTION ON UPDATE CASCADE
        `);
    }
}

