import {
    Entity,
    Column,
    ManyToOne,
    PrimaryColumn,
    JoinColumn,
    Index,
    AfterInsert,
    AfterUpdate,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Organisation } from "./Organisation";
import { Bank } from "./Bank";
import { ApplicantType } from "../common/utils";

@Entity()
export class BankDocumentConfig extends CustomBaseEntity {

    constructor(payload: BankDocumentConfig) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    configId: string;

    @ManyToOne(() => Bank, (bank) => bank.documentConfigs, {
        cascade: true,
        onUpdate: "CASCADE",
        nullable: false,
        eager: true
    })
    @JoinColumn({ name: "bankId" })
    bank: Bank;

    @Column({
        type: "enum",
        enum: ApplicantType,
        nullable: false,
    })
    applicantType: ApplicantType;

    @Column({
        type: "simple-json",
        nullable: false,
    })
    requiredDocuments: string[];

    @ManyToOne(() => Organisation, {
        cascade: true,
        onUpdate: "CASCADE",
        nullable: false,
        eager: true
    })
    @JoinColumn({ name: "organisationId" })
    organization: Organisation;

    @AfterInsert()
    auditHandlerAfterInsert() {
        console.log(this);
    }

    @AfterUpdate()
    auditHandlerAfterUpdate() {
        console.log(this);
    }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     BankDocumentConfig:
 *       type: object
 *       required:
 *         - configId
 *         - applicantType
 *         - requiredDocuments
 *       properties:
 *         configId:
 *           type: string
 *           description: Unique identifier for the config
 *         applicantType:
 *           type: string
 *           enum: [Salaried, SelfEmployed, Company]
 *           description: Type of applicant
 *         requiredDocuments:
 *           type: array
 *           items:
 *             type: string
 *           description: List of required documents
 */
