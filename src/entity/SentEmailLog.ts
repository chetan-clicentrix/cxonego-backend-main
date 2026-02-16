import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
    BeforeInsert,
    BeforeUpdate
} from "typeorm";
import { Lead } from "./Lead";
import { Oppurtunity } from "./Oppurtunity";
import { Contact } from "./Contact";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { UploadSession } from "./UploadSession";
import { encryption } from "../common/utils";

/**
 * Email types enum for categorizing sent emails
 */
export enum EmailType {
    LEAD_NOTIFICATION = 'LEAD_NOTIFICATION',
    OPPORTUNITY_NOTIFICATION = 'OPPORTUNITY_NOTIFICATION',
    CLOSURE_NOTIFICATION = 'CLOSURE_NOTIFICATION',
    DOCUMENT_LINK = 'DOCUMENT_LINK',
    CUSTOM = 'CUSTOM'
}

/**
 * Email status enum
 */
export enum EmailStatus {
    SENT = 'SENT',
    FAILED = 'FAILED',
    PENDING = 'PENDING'
}

/**
 * Entity to track all sent notification emails for audit trail
 */
@Entity('sent_email_log')
@Index(['leadId', 'deletedAt'])
@Index(['opportunityId', 'deletedAt'])
@Index(['contactId', 'deletedAt'])
@Index(['uploadSessionId', 'deletedAt'])
@Index(['emailType', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['sentById', 'deletedAt'])
@Index(['organizationId', 'deletedAt'])
export class SentEmailLog {
    constructor(payload: Partial<SentEmailLog>) {
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    sentEmailId: string;

    // Email recipient (encrypted)
    @Column({ type: 'varchar', length: 500 })
    recipient: string;

    // CC recipients as JSON array (encrypted)
    @Column({ type: 'text', nullable: true })
    ccRecipients: string;

    // Email subject (encrypted)
    @Column({ type: 'varchar', length: 500 })
    subject: string;

    // First 100 characters of email body for preview
    @Column({ type: 'varchar', length: 100, nullable: true })
    bodyPreview: string;

    // Full HTML email body (encrypted)
    @Column({ type: 'text' })
    bodyHtml: string;

    // Sender mailbox email (encrypted)
    @Column({ type: 'varchar', length: 500 })
    fromMailbox: string;

    // Email type/category
    @Column({
        type: 'enum',
        enum: EmailType,
        default: EmailType.CUSTOM
    })
    emailType: EmailType;

    // Email status
    @Column({
        type: 'enum',
        enum: EmailStatus,
        default: EmailStatus.PENDING
    })
    status: EmailStatus;

    // Error message if failed
    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    // Microsoft Graph API message ID
    @Column({ type: 'varchar', length: 500, nullable: true })
    microsoftMessageId: string;

    // When email was sent
    @Column({ type: 'datetime', nullable: true })
    sentAt: Date;

    // Foreign Keys - Relationships

    @ManyToOne(() => Lead, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'leadId' })
    lead: Lead;

    @Column({ nullable: true })
    leadId: string;

    @ManyToOne(() => Oppurtunity, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'opportunityId' })
    opportunity: Oppurtunity;

    @Column({ nullable: true })
    opportunityId: string;

    @ManyToOne(() => Contact, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'contactId' })
    contact: Contact;

    @Column({ nullable: true })
    contactId: string;

    @ManyToOne(() => UploadSession, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'uploadSessionId' })
    uploadSession: UploadSession;

    @Column({ nullable: true })
    uploadSessionId: string;

    @ManyToOne(() => require('./EmailTemplate').EmailTemplate, { nullable: true, onUpdate: 'CASCADE', eager: true })
    @JoinColumn({ name: 'templateId' })
    template: any;

    @Column({ nullable: true })
    templateId: string;

    @ManyToOne(() => User, { nullable: true, onUpdate: 'CASCADE', eager: true })
    @JoinColumn({ name: 'sentById' })
    sentBy: User;

    @Column({ nullable: true })
    sentById: string;

    @ManyToOne(() => Organisation, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization: Organisation;

    @Column({ nullable: true })
    organizationId: string;

    // Timestamps
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    // Encryption method
    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.recipient) this.recipient = encryption(this.recipient);
        if (this.ccRecipients) this.ccRecipients = encryption(this.ccRecipients);
        if (this.subject) this.subject = encryption(this.subject);
        if (this.bodyHtml) this.bodyHtml = encryption(this.bodyHtml);
        if (this.fromMailbox) this.fromMailbox = encryption(this.fromMailbox);
    }
}
