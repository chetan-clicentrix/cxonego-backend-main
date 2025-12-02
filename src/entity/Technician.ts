import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { Case } from "./Case";
import {
    technicianStatus,
    technicianAvailability,
} from "../common/utils";

@Entity()
export class Technician extends CustomBaseEntity {
    constructor(payload: Technician) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryColumn()
    technicianId: string;

    @Column({
        nullable: false,
    })
    employeeId: string;

    @Column({
        nullable: false,
    })
    firstName: string;

    @Column({
        nullable: false,
    })
    lastName: string;

    @Column({
        nullable: false,
    })
    email: string;

    @Column({
        nullable: false,
    })
    phone: string;

    @Column({
        nullable: true,
    })
    countryCode: string;

    @Column({
        type: "json",
        nullable: true,
    })
    specialization: string[];

    @Column({
        type: "int",
        default: 0,
    })
    experienceYears: number;

    @Column({
        type: "enum",
        enum: technicianStatus,
        default: technicianStatus.ACTIVE,
    })
    status: technicianStatus;

    @Column({
        type: "enum",
        enum: technicianAvailability,
        default: technicianAvailability.AVAILABLE,
    })
    availability: technicianAvailability;

    @Column({
        type: "int",
        default: 0,
    })
    totalTicketsCompleted: number;

    @Column({
        type: "text",
        nullable: false,
    })
    address: string;

    @Column({
        nullable: false,
    })
    city: string;

    @Column({
        nullable: false,
    })
    state: string;

    @Column({
        nullable: false,
        default: "India",
    })
    country: string;

    @OneToOne(() => User, (user) => user.technician, {
        nullable: true,
    })
    @JoinColumn({ name: "userId" })
    user: User;

    @ManyToOne(() => Organisation, (organisation) => organisation.technicians, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true,
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @OneToMany(() => Case, (caseItem) => caseItem.assignedTechnician)
    assignedCases: Case[];

    @OneToMany("TicketAssignment", (assignment: any) => assignment.technician)
    assignmentHistory: any[];
}
