import { Entity, PrimaryGeneratedColumn, Column, OneToMany, PrimaryColumn, JoinColumn, ManyToOne, OneToOne, BeforeInsert, BeforeUpdate } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Account } from "./Account";
import { Contact } from "./Contact";
import { Lead } from "./Lead";
import { activityPriority, activityType, activityStatus, encryption } from "../common/utils";
import { Oppurtunity } from "./Oppurtunity";
import { User } from "./User";
import { Calender } from "./Calender";
import { Organisation } from "./Organisation";
import { Note } from "./Note";
import { ActivityRemainder } from "./ActivityReminder";
import { Case } from "./Case";

@Entity()
export class Activity extends CustomBaseEntity {
    constructor(payload: Activity) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryColumn()
    activityId: string;

    @Column({
        length: 2500,
        nullable: false
    })
    subject: string;

    @Column({
        type: "enum",
        enum: activityType,
        default: activityType.TASK,
        nullable: false
    })
    activityType: activityType;

    @Column({
        type: "enum",
        enum: activityStatus,
        default: activityStatus.OPEN,
        nullable: false
    })
    activityStatus: activityStatus;

    @Column({
        type: "enum",
        enum: activityPriority,
        default: activityPriority.NORMAL,
        nullable: false
    })
    activityPriority: activityPriority;

    @Column({
        type: "datetime",
        nullable: true
    })
    startDate: Date;

    @Column({
        type: "datetime",
        nullable: false
    })
    dueDate: Date;

    @Column({
        type: "datetime",
        nullable: true
    })
    actualStartDate: Date;

    @Column({
        type: "datetime",
        nullable: true
    })
    actualEndDate: Date;

    @Column({
        type: "datetime",
        nullable: true
    })
    notificationDateTime: Date;

    @Column({
        type: "text",
        nullable: true
    })
    description: string;

    @ManyToOne(() => Account, (Account) => Account.activity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "accountId" })
    company: Account;

    @ManyToOne(() => Contact, (Contact) => Contact.activity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "contactId" })
    contact: Contact;

    @ManyToOne(() => Lead, (Lead) => Lead.activity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "leadId" })
    lead: Lead;

    @ManyToOne(() => Oppurtunity, (Oppurtunity) => Oppurtunity.activity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "opportunityId" })
    // oppurtunity :Oppurtunity;
    opportunity: Oppurtunity;

    @ManyToOne(() => User, (User) => User.activity, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @OneToOne(() => Calender, (Calender) => Calender.appointmentId, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
    })
    @JoinColumn({ name: "appointmentId" })
    appoinment: Calender;

    @ManyToOne(() => Organisation, (Organisation) => Organisation.activities, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @OneToMany(() => Note, (Note) => Note.activity)
    notes: Note[];

    @OneToMany(() => ActivityRemainder, (ActivityRemainder) => ActivityRemainder.activity)
    reminders: ActivityRemainder[];

    @ManyToOne(() => Case, (caseItem) => caseItem.activities, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
        nullable: true
    })
    @JoinColumn({ name: "caseId" })
    case: Case;

}