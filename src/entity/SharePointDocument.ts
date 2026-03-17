import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from "typeorm";
import { Oppurtunity } from "./Oppurtunity";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { encryption } from "../common/utils";

// Document types enum (reuse existing or define new if needed)
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
    NDA = 'NDA',
    MSA = 'MSA',
    SOW = 'SOW',
    SLA = 'SLA',
    AMC = 'AMC',
    MOU = 'MOU'
}

@Entity('sharepoint_document')
@Index(['opportunityId', 'deletedAt'])  // For opportunity document listing
@Index(['uploadedById', 'deletedAt'])  // For user document listing
@Index(['organizationId', 'deletedAt'])  // For org document listing
@Index(['activityPlanActionId', 'deletedAt'])  // For activity plan action document listing
export class SharePointDocument {
    constructor(payload: Partial<SharePointDocument>) {
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    sharepointDocumentId: string;

    @Column({ type: 'varchar', length: 255 })
    fileName: string;

    @Column({ type: 'varchar', length: 100 })
    fileType: string;

    @Column({ type: 'bigint', nullable: true })
    fileSize: number;

    @Column({ type: 'varchar', length: 500 })
    sharepointFileId: string;

    @Column({ type: 'varchar', length: 1000 })
    sharepointLink: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    sharepointFolderPath: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    opportunityFolderName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: DocumentType,
        nullable: true
    })
    documentType: DocumentType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    customDocumentType: string;

    @Column({ type: 'datetime', nullable: true })
    startTime: Date;

    @Column({ type: 'datetime', nullable: true })
    endTime: Date;

    // Foreign Keys - Relationships

    @ManyToOne(() => Oppurtunity, (opportunity) => opportunity.sharepointDocuments, {
        onUpdate: "CASCADE",
        nullable: false,
    })
    @JoinColumn({ name: "opportunityId" })
    opportunity: Oppurtunity;

    @Column({ nullable: false })
    opportunityId: string;

    @ManyToOne(() => User, (user) => user.sharepointDocuments, {
        onUpdate: "CASCADE",
        nullable: false,
        eager: true
    })
    @JoinColumn({ name: "uploadedById" })
    uploadedBy: User;

    @Column({ nullable: false })
    uploadedById: string;

    @ManyToOne(() => Organisation, (org) => org.sharepointDocuments, {
        onUpdate: "CASCADE",
        nullable: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @Column({ nullable: true })
    organizationId: string;

    @ManyToOne(() => require("./ActivityPlanAction").ActivityPlanAction, (action: any) => action.documents, {
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        nullable: true
    })
    @JoinColumn({ name: "activityPlanActionId" })
    activityPlanAction: any; // Optional: Link to activity plan action if uploaded as part of workflow

    @Column({ nullable: true })
    activityPlanActionId: string;

    // Timestamps
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    // Encryption method
    encrypt() {
        if (this.fileName) this.fileName = encryption(this.fileName);
        if (this.description) this.description = encryption(this.description);
        if (this.customDocumentType) this.customDocumentType = encryption(this.customDocumentType);
        if (this.opportunityFolderName) this.opportunityFolderName = encryption(this.opportunityFolderName);
    }
}
