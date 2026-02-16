import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Case } from "./Case";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { ticketStatus } from "../common/utils";

@Entity()
export class TicketStatusHistory extends CustomBaseEntity {
    constructor(payload: TicketStatusHistory) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn("uuid")
    historyId: string;

    @Column({
        type: "enum",
        enum: ticketStatus,
        nullable: true,
    })
    previousStatus: ticketStatus;

    @Column({
        type: "enum",
        enum: ticketStatus,
        nullable: false,
    })
    newStatus: ticketStatus;

    @Column({
        type: "datetime",
        nullable: false,
    })
    changedDate: Date;

    @Column({
        type: "text",
        nullable: true,
    })
    reason: string;

    @Column({
        type: "text",
        nullable: true,
    })
    notes: string;

    @ManyToOne(() => Case, (caseItem) => caseItem.statusHistory, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "caseId" })
    case: Case;

    @ManyToOne(() => User, (user) => user.ticketStatusChanges, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "changedById" })
    changedBy: User;

    @ManyToOne(() => Organisation, (organisation) => organisation.ticketStatusHistory, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;
}
