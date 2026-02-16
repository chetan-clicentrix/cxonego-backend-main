import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Case } from "./Case";
import { Technician } from "./Technician";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { assignmentStatus } from "../common/utils";

@Entity()
export class TicketAssignment extends CustomBaseEntity {
    constructor(payload: TicketAssignment) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn("uuid")
    assignmentId: string;

    @Column({
        type: "datetime",
        nullable: false,
    })
    assignedDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    acceptedDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    startedDate: Date;

    @Column({
        type: "datetime",
        nullable: true,
    })
    completedDate: Date;

    @Column({
        type: "enum",
        enum: assignmentStatus,
        default: assignmentStatus.PENDING,
    })
    status: assignmentStatus;

    @Column({
        type: "text",
        nullable: true,
    })
    assignmentNotes: string;

    @Column({
        type: "text",
        nullable: true,
    })
    rejectionReason: string;

    @ManyToOne(() => Case, (caseItem) => caseItem.assignments, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @ManyToOne(() => Case)
    @JoinColumn({ name: "caseId" })
    case: Case;

    @Column()
    caseId: string;

    @ManyToOne(() => Technician, (technician) => technician.assignmentHistory, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @ManyToOne(() => Technician)
    @JoinColumn({ name: "technicianId" })
    technician: Technician;

    @Column()
    technicianId: string;

    @ManyToOne(() => User, (user) => user.ticketAssignments, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "assignedById" })
    assignedBy: User;

    @ManyToOne(() => Organisation, (organisation) => organisation.ticketAssignments, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;
}
