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
    BeforeUpdate,
    Unique
} from "typeorm";
import { Organisation } from "./Organisation";
import { User } from "./User";
import { encryption } from "../common/utils";

/**
 * Entity type enum for email templates
 */
export enum TemplateEntityType {
    LEAD = 'LEAD',
    OPPORTUNITY = 'OPPORTUNITY',
    CONTACT = 'CONTACT',
    DOCUMENT_LINK = 'DOCUMENT_LINK',
    GENERAL = 'GENERAL'
}

/**
 * Recipient type enum for email templates
 */
export enum TemplateRecipientType {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    CUSTOMER = 'CUSTOMER',
    CUSTOM = 'CUSTOM'
}

/**
 * Entity to manage email templates for different notification scenarios
 */
@Entity('email_template')
@Index(['entityType', 'isActive', 'deletedAt'])
@Index(['recipientType', 'isActive', 'deletedAt'])
@Index(['organizationId', 'deletedAt'])
@Unique(['templateCode', 'organizationId']) // Unique template code per organization
export class EmailTemplate {
    constructor(payload: Partial<EmailTemplate>) {
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    templateId: string;

    // Template display name
    @Column({ type: 'varchar', length: 255 })
    templateName: string;

    // Unique code for programmatic access (e.g., NEW_LEAD_ADMIN)
    @Column({ type: 'varchar', length: 100 })
    templateCode: string;

    // Entity type this template applies to
    @Column({
        type: 'enum',
        enum: TemplateEntityType,
        default: TemplateEntityType.GENERAL
    })
    entityType: TemplateEntityType;

    // Recipient type for this template
    @Column({
        type: 'enum',
        enum: TemplateRecipientType,
        default: TemplateRecipientType.CUSTOM
    })
    recipientType: TemplateRecipientType;

    // Email subject template with variables (e.g., "New Lead: {{leadName}}")
    @Column({ type: 'varchar', length: 500 })
    subject: string;

    // HTML email body template with variables
    @Column({ type: 'text' })
    bodyHtml: string;

    // Plain text version (optional)
    @Column({ type: 'text', nullable: true })
    bodyText: string;

    // JSON array of available variables (e.g., ["leadName", "companyName", "assignedTo"])
    @Column({ type: 'text' })
    variables: string;

    // JSON array of default recipient emails (e.g., ["admin@example.com"])
    @Column({ type: 'text', nullable: true })
    defaultRecipients: string;

    // Whether template is active
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // Default template for this entity type + recipient type combination
    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    // Foreign Keys - Relationships

    @ManyToOne(() => Organisation, { nullable: true, onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization: Organisation;

    @Column({ nullable: true })
    organizationId: string;

    @ManyToOne(() => User, { nullable: false, onUpdate: 'CASCADE', eager: true })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column({ nullable: false })
    createdById: string;

    // Timestamps
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    // Encryption method (for sensitive template content)
    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        // Optional: encrypt template content if it contains sensitive data
        // For now, we'll keep templates unencrypted for easier management
        // But you can add encryption here if needed
    }
}
