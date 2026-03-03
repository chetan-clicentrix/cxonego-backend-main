import { MigrationInterface, QueryRunner } from "typeorm";

export class Whatsapp1772444345633 implements MigrationInterface {
    name = 'Whatsapp1772444345633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_oppurtunity_leadLeadId\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_oppurtunity_proposalGroupId\``);
        await queryRunner.query(`DROP INDEX \`FK_1433ec19450c8855911be6ca285\` ON \`document_upload\``);
        await queryRunner.query(`CREATE TABLE \`agent_skill\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`modifiedBy\` varchar(255) NULL, \`skillId\` varchar(36) NOT NULL, \`skillName\` varchar(255) NOT NULL, \`description\` text NULL, \`instructions\` text NOT NULL COMMENT 'The learned instructions, recipes, or multi-step logic.', \`triggerKeywords\` varchar(255) NULL COMMENT 'Comma-separated keywords to trigger this skill.', \`usageCount\` int NOT NULL DEFAULT '0', \`rating\` float NOT NULL COMMENT 'Average success rating 1-5' DEFAULT '5', \`embedding\` json NULL COMMENT 'Vector embedding of the skill (skillName + description)', \`authorId\` varchar(255) NULL, \`organizationId\` varchar(36) NULL, PRIMARY KEY (\`skillId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` CHANGE \`estimatedRevenue\` \`estimatedRevenue\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`agent_skill\` ADD CONSTRAINT \`FK_7ff8c513dcec7265b2fa5c57565\` FOREIGN KEY (\`authorId\`) REFERENCES \`user\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`agent_skill\` ADD CONSTRAINT \`FK_e7cd64fb2ef67219ce322920ae1\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organisation\`(\`organisationId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_ebe249242093c8fefc296e98bb7\` FOREIGN KEY (\`leadLeadId\`) REFERENCES \`lead\`(\`leadId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_81273f72e18a7699080a3b29d6e\` FOREIGN KEY (\`proposalGroupId\`) REFERENCES \`proposal_group\`(\`proposalGroupId\`) ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`document_upload\` ADD CONSTRAINT \`FK_1433ec19450c8855911be6ca285\` FOREIGN KEY (\`requirementId\`) REFERENCES \`document_requirement\`(\`requirementId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`document_upload\` DROP FOREIGN KEY \`FK_1433ec19450c8855911be6ca285\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_81273f72e18a7699080a3b29d6e\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_ebe249242093c8fefc296e98bb7\``);
        await queryRunner.query(`ALTER TABLE \`agent_skill\` DROP FOREIGN KEY \`FK_e7cd64fb2ef67219ce322920ae1\``);
        await queryRunner.query(`ALTER TABLE \`agent_skill\` DROP FOREIGN KEY \`FK_7ff8c513dcec7265b2fa5c57565\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` CHANGE \`estimatedRevenue\` \`estimatedRevenue\` varchar(255) NOT NULL`);
        await queryRunner.query(`DROP TABLE \`agent_skill\``);
        await queryRunner.query(`CREATE INDEX \`FK_1433ec19450c8855911be6ca285\` ON \`document_upload\` (\`requirementId\`)`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_oppurtunity_proposalGroupId\` FOREIGN KEY (\`proposalGroupId\`) REFERENCES \`proposal_group\`(\`proposalGroupId\`) ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_oppurtunity_leadLeadId\` FOREIGN KEY (\`leadLeadId\`) REFERENCES \`lead\`(\`leadId\`) ON DELETE NO ACTION ON UPDATE CASCADE`);
    }

}
