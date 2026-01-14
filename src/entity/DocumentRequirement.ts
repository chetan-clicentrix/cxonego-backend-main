import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Oppurtunity } from "./Oppurtunity";

export enum DocumentType {
    AADHAAR = "AADHAAR",
    PAN = "PAN",
    BANK_STATEMENT = "BANK_STATEMENT",
    SALARY_SLIP = "SALARY_SLIP",
    ITR = "ITR",
    BUSINESS_PROOF = "BUSINESS_PROOF",
    ADDRESS_PROOF = "ADDRESS_PROOF",
    PHOTO = "PHOTO",
    OTHER = "OTHER",
}

@Entity()
@Index(["opportunityId", "documentName"], { unique: true })
export class DocumentRequirement extends CustomBaseEntity {
    constructor(payload: DocumentRequirement) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryColumn()
    requirementId: string;

    @Column()
    opportunityId: string;

    @ManyToOne(() => Oppurtunity, { nullable: false, eager: true })
    @JoinColumn({ name: "opportunityId" })
    opportunity: Oppurtunity;

    @Column({ length: 255 })
    documentName: string;

    @Column({
        type: "enum",
        enum: DocumentType,
        default: DocumentType.OTHER,
    })
    documentType: DocumentType;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ default: true })
    isRequired: boolean;

    @Column({ type: "simple-json", nullable: true })
    allowedFileTypes: string[]; // ["pdf", "jpg", "png"]

    @Column({ type: "bigint", nullable: true })
    maxFileSize: number; // in bytes

    @Column({ type: "int", default: 0 })
    displayOrder: number;
}
