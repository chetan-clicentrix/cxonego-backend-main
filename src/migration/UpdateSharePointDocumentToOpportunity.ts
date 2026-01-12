import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateSharePointDocumentToOpportunity1736244000000 implements MigrationInterface {
    name = 'UpdateSharePointDocumentToOpportunity1736244000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop the old foreign key constraint for contactId
        const table = await queryRunner.getTable("sharepoint_document");
        const contactForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("contactId") !== -1);
        if (contactForeignKey) {
            await queryRunner.dropForeignKey("sharepoint_document", contactForeignKey);
        }

        // 2. Drop the old index on contactId
        await queryRunner.query(`DROP INDEX \`IDX_sharepoint_document_contactId_deletedAt\` ON \`sharepoint_document\``);

        // 3. Rename contactId column to opportunityId
        await queryRunner.renameColumn("sharepoint_document", "contactId", "opportunityId");

        // 4. Rename customerFolderName column to opportunityFolderName
        await queryRunner.renameColumn("sharepoint_document", "customerFolderName", "opportunityFolderName");

        // 5. Create new index on opportunityId
        await queryRunner.query(`CREATE INDEX \`IDX_sharepoint_document_opportunityId_deletedAt\` ON \`sharepoint_document\` (\`opportunityId\`, \`deletedAt\`)`);

        // 6. Add new foreign key constraint for opportunityId
        await queryRunner.createForeignKey("sharepoint_document", new TableForeignKey({
            columnNames: ["opportunityId"],
            referencedColumnNames: ["opportunityId"],
            referencedTableName: "oppurtunity",
            onUpdate: "CASCADE",
            onDelete: "NO ACTION"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the migration

        // 1. Drop the new foreign key constraint for opportunityId
        const table = await queryRunner.getTable("sharepoint_document");
        const opportunityForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("opportunityId") !== -1);
        if (opportunityForeignKey) {
            await queryRunner.dropForeignKey("sharepoint_document", opportunityForeignKey);
        }

        // 2. Drop the new index on opportunityId
        await queryRunner.query(`DROP INDEX \`IDX_sharepoint_document_opportunityId_deletedAt\` ON \`sharepoint_document\``);

        // 3. Rename opportunityId column back to contactId
        await queryRunner.renameColumn("sharepoint_document", "opportunityId", "contactId");

        // 4. Rename opportunityFolderName column back to customerFolderName
        await queryRunner.renameColumn("sharepoint_document", "opportunityFolderName", "customerFolderName");

        // 5. Create old index on contactId
        await queryRunner.query(`CREATE INDEX \`IDX_sharepoint_document_contactId_deletedAt\` ON \`sharepoint_document\` (\`contactId\`, \`deletedAt\`)`);

        // 6. Add old foreign key constraint for contactId
        await queryRunner.createForeignKey("sharepoint_document", new TableForeignKey({
            columnNames: ["contactId"],
            referencedColumnNames: ["contactId"],
            referencedTableName: "contact",
            onUpdate: "CASCADE",
            onDelete: "NO ACTION"
        }));
    }
}
