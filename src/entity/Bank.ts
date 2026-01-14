import {
    Entity,
    Column,
    ManyToOne,
    PrimaryColumn,
    OneToMany,
    JoinColumn,
    AfterInsert,
    AfterUpdate,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Organisation } from "./Organisation";
import { BankDocumentConfig } from "./BankDocumentConfig";

@Entity()
export class Bank extends CustomBaseEntity {

    constructor(payload: Bank) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    bankId: string;

    @Column({
        nullable: false,
    })
    name: string;

    @Column({
        nullable: true,
    })
    code: string;

    @Column({
        default: true,
    })
    isActive: boolean;

    @ManyToOne(() => Organisation, (organisation) => organisation.banks, {
        cascade: true,
        onUpdate: "CASCADE",
        nullable: false,
        eager: true
    })
    @JoinColumn({ name: "organisationId" })
    organization: Organisation;

    @OneToMany(() => BankDocumentConfig, (config) => config.bank)
    documentConfigs: BankDocumentConfig[];

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
 *     Bank:
 *       type: object
 *       required:
 *         - name
 *         - bankId
 *       properties:
 *         bankId:
 *           type: string
 *           description: Unique identifier for the bank
 *         name:
 *           type: string
 *           description: Name of the bank
 *         code:
 *           type: string
 *           description: Code of the bank
 *         isActive:
 *           type: boolean
 *           description: Status of the bank
 */
