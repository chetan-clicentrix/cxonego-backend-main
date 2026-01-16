import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { ActivityPlan } from "./ActivityPlan";
import { User } from "./User";
import { ActivityPlanActionStatus, encryption, decrypt } from "../common/utils";

@Entity()
export class ActivityPlanAction extends CustomBaseEntity {
    constructor(payload: ActivityPlanAction) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryGeneratedColumn("uuid")
    actionId: string;

    @ManyToOne(() => ActivityPlan, (plan) => plan.actions, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "planId" })
    plan: ActivityPlan;

    @Column({ type: "int", nullable: false })
    sequence: number;

    @Column({ nullable: false })
    stageName: string;

    @Column({ nullable: false })
    actionName: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ nullable: true })
    tat: string;

    @Column({ type: "datetime", nullable: true })
    dueDate: Date;

    @Column({
        type: "enum",
        enum: ActivityPlanActionStatus,
        default: ActivityPlanActionStatus.PENDING
    })
    status: ActivityPlanActionStatus;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "assignedTo" })
    assignedTo: User;

    @Column({ type: "datetime", nullable: true })
    completedAt: Date;

    @Column({ type: "text", nullable: true })
    remarks: string;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.actionName) this.actionName = encryption(this.actionName);
        if (this.stageName) this.stageName = encryption(this.stageName);
        if (this.description) this.description = encryption(this.description);
        if (this.remarks) this.remarks = encryption(this.remarks);
    }

    @AfterLoad()
    decrypt() {
        if (this.actionName) this.actionName = decrypt(this.actionName);
        if (this.stageName) this.stageName = decrypt(this.stageName);
        if (this.description) this.description = decrypt(this.description);
        if (this.remarks) this.remarks = decrypt(this.remarks);
    }
}
