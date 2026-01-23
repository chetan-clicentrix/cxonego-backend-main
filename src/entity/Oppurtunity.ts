import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { Currency, encryption, forecastCategory, opportunityLostReason, opportunityStatus, opportunityWonReason, priorityStatus, probability, purchaseProcess, purchaseTimeFrame, stage, ApplicantType } from "../common/utils";
import { Bank } from "./Bank";
import { Account } from "./Account";
import { Activity } from "./Activity";
import { Contact } from "./Contact";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Lead } from "./Lead";
import { User } from "./User";
import { Note } from "./Note";
import { Organisation } from "./Organisation";
import { SharePointDocument } from "./SharePointDocument";
import { encrypt } from "typeorm-encrypted";

@Entity()
export class Oppurtunity extends CustomBaseEntity {
    constructor(payload: Oppurtunity) {
        super();
        Object.assign(this, payload);
    }


    @Column({
        primary: true,
        unique: true,
        nullable: false,
    })
    opportunityId: string;

    @Column({
        nullable: false,
    })
    title: string;


    @Column({
        type: "enum",
        enum: Currency,
        default: Currency.INR
    })
    currency: Currency;

    @Column({
        type: "enum",
        enum: purchaseTimeFrame,
        // default:purchaseTimeFrame.first_MONTH     
    })
    purchaseTimeFrame: purchaseTimeFrame;

    @Column({
        type: "enum",
        enum: purchaseProcess,
        default: purchaseProcess.COMMITTEE
    })
    purchaseProcess: purchaseProcess;


    @Column({
        type: "enum",
        enum: forecastCategory,
        default: forecastCategory.PIPELINE
    })
    forecastCategory: forecastCategory;

    @Column({
        nullable: false,
    })
    estimatedRevenue: string;

    @Column({
        nullable: true,
    })
    actualRevenue: string;

    @Column({
        type: "datetime",
        nullable: false,
    })
    estimatedCloseDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    actualCloseDate: Date;

    @Column({
        type: "text",
        nullable: true,
    })
    description: string;

    @Column({
        type: "text",
        nullable: true,
    })
    currentNeed: string;

    @Column({
        type: "text",
        nullable: true,
    })
    proposedSolution: string;

    @Column({
        type: "enum",
        enum: probability,
        default: probability.fifthRange
    })
    probability: probability;

    @Column({
        type: "enum",
        enum: stage,
        default: stage.DOCUMENT_COLLECTION
    })
    stage: stage;

    @Column({
        type: "enum",
        enum: opportunityStatus,
        default: opportunityStatus.ACTIVE
    })
    status: opportunityStatus;

    @Column({
        type: "enum",
        enum: priorityStatus,
        default: priorityStatus.MEDIUM
    })
    priority: priorityStatus;

    @Column({
        type: "enum",
        enum: opportunityWonReason,
        nullable: true,
    })
    wonReason: opportunityWonReason;

    @Column({
        type: "enum",
        enum: opportunityLostReason,
        nullable: true,
    })
    lostReason: opportunityLostReason;

    @Column({ length: 2500, nullable: true })
    wonLostDescription: string;

    @OneToOne(() => Lead)
    @JoinColumn()
    Lead: Lead;

    @ManyToOne(() => Account, (Account) => Account.oppurtunities, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true //ethe egar true karun data yeto ka bagane 
    })
    @JoinColumn()
    company: Account;

    @ManyToOne(() => Contact, (Contact) => Contact.oppurtunities, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn()
    contact: Contact;

    @OneToMany(() => Activity, Activity => Activity.opportunity)
    activity: Activity[];

    @ManyToOne(() => User, (User) => User.opportunity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @OneToMany(() => Note, (Note) => Note.opportunity)
    notes: Note[];

    @ManyToOne(() => Organisation, (Organisation) => Organisation.opportunities, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @OneToMany(() => SharePointDocument, (doc) => doc.opportunity)
    sharepointDocuments: SharePointDocument[];

    @Column({ nullable: true })
    bankId: string;

    @ManyToOne(() => Bank, { nullable: true, eager: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "bankId" })
    bank: Bank;

    @Column({
        type: "enum",
        enum: ApplicantType,
        nullable: true,
    })
    applicantType: ApplicantType;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.title) this.title = encryption(this.title);
        if (this.description) this.description = encryption(this.description);
        if (this.currentNeed) this.currentNeed = encryption(this.currentNeed);
        if (this.proposedSolution) this.proposedSolution = encryption(this.proposedSolution);
        if (this.wonLostDescription) this.wonLostDescription = encryption(this.wonLostDescription);
        if (this.estimatedRevenue) this.estimatedRevenue = encryption(this.estimatedRevenue);
        if (this.actualRevenue) this.actualRevenue = encryption(this.actualRevenue);
    }
}