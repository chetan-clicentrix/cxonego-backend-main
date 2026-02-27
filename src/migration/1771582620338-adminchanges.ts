import { MigrationInterface, QueryRunner } from "typeorm";

export class Adminchanges1771582620338 implements MigrationInterface {
    name = 'Adminchanges1771582620338'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP FOREIGN KEY \`FK_33ace2962059155d3669b737a76\``);
        await queryRunner.query(`CREATE TABLE \`opportunity_banks\` (\`opportunityId\` varchar(255) NOT NULL, \`bankId\` varchar(255) NOT NULL, INDEX \`IDX_058358d86bc7d4b74d3f4ae26b\` (\`opportunityId\`), INDEX \`IDX_5e1eba431aa41836d3f0e67df0\` (\`bankId\`), PRIMARY KEY (\`opportunityId\`, \`bankId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` DROP COLUMN \`bankId\``);
        await queryRunner.query(`ALTER TABLE \`opportunity_banks\` ADD CONSTRAINT \`FK_058358d86bc7d4b74d3f4ae26b5\` FOREIGN KEY (\`opportunityId\`) REFERENCES \`oppurtunity\`(\`opportunityId\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`opportunity_banks\` ADD CONSTRAINT \`FK_5e1eba431aa41836d3f0e67df01\` FOREIGN KEY (\`bankId\`) REFERENCES \`bank\`(\`bankId\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`opportunity_banks\` DROP FOREIGN KEY \`FK_5e1eba431aa41836d3f0e67df01\``);
        await queryRunner.query(`ALTER TABLE \`opportunity_banks\` DROP FOREIGN KEY \`FK_058358d86bc7d4b74d3f4ae26b5\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD \`bankId\` varchar(255) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_5e1eba431aa41836d3f0e67df0\` ON \`opportunity_banks\``);
        await queryRunner.query(`DROP INDEX \`IDX_058358d86bc7d4b74d3f4ae26b\` ON \`opportunity_banks\``);
        await queryRunner.query(`DROP TABLE \`opportunity_banks\``);
        await queryRunner.query(`ALTER TABLE \`oppurtunity\` ADD CONSTRAINT \`FK_33ace2962059155d3669b737a76\` FOREIGN KEY (\`bankId\`) REFERENCES \`bank\`(\`bankId\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
