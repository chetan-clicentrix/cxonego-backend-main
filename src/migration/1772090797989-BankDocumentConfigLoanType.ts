import { MigrationInterface, QueryRunner } from "typeorm";

export class BankDocumentConfigLoanType1772090797989 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('bank_document_config');
        if (!table?.findColumnByName('loanType')) {
            await queryRunner.query(`
                ALTER TABLE \`bank_document_config\`
                ADD COLUMN \`loanType\` varchar(255) NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`bank_document_config\`
            DROP COLUMN \`loanType\`
        `);
    }

}
