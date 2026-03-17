import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Contact } from "./Contact";
import { Account } from "./Account";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { Note } from "./Note";
import { Activity } from "./Activity";
import { Technician } from "./Technician";
import { TicketAssignment } from "./TicketAssignment";
import { TicketStatusHistory } from "./TicketStatusHistory";
import {
    ticketStatus,
    ticketPriority,
    ticketCategory,
    warrantyStatus,
} from "../common/utils";

@Entity()
export class Case extends CustomBaseEntity {
    constructor(payload: Case) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryColumn()
    caseId: string;

    @Column({
        unique: true,
        nullable: false,
    })
    caseNumber: string;

    @Column({
        nullable: false,
    })
    title: string;

    @Column({
        type: "text",
        nullable: false,
    })
    description: string;

    @Column({
        type: "enum",
        enum: ticketCategory,
        nullable: false,
    })
    category: ticketCategory;

    @Column({
        type: "enum",
        enum: ticketPriority,
        default: ticketPriority.MEDIUM,
    })
    priority: ticketPriority;

    @Column({
        type: "enum",
        enum: ticketStatus,
        default: ticketStatus.NEW,
    })
    status: ticketStatus;

    @Column({
        nullable: false,
    })
    productName: string;

    @Column({
        nullable: true,
    })
    productModel: string;

    @Column({
        type: "enum",
        enum: warrantyStatus,
        default: warrantyStatus.OUT_OF_WARRANTY,
    })
    warrantyStatus: warrantyStatus;

    @Column({
        type: "datetime",
        nullable: false,
    })
    issueReportedDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    scheduledDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    completedDate: Date;

    @Column({
        type: "text",
        nullable: true,
    })
    resolutionNotes: string;

    @ManyToOne(() => Contact, (contact) => contact.cases, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "customerId" })
    customer: Contact;

    @ManyToOne(() => Account, (account) => account.cases, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "accountId" })
    account: Account;

    @ManyToOne(() => User, (user) => user.createdCases, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "createdById" })
    createdBy: User;

    @ManyToOne(() => Organisation, (organisation) => organisation.cases, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @ManyToOne(() => Technician, (technician) => technician.assignedCases, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "assignedTechnicianId" })
    assignedTechnician: Technician;

    @OneToMany(() => TicketAssignment, (assignment) => assignment.case)
    assignments: TicketAssignment[];

    @OneToMany(() => TicketStatusHistory, (history) => history.case)
    statusHistory: TicketStatusHistory[];

    @OneToMany(() => Note, (note) => note.case)
    notes: Note[];

    @OneToMany(() => Activity, (activity) => activity.case)
    activities: Activity[];
}
