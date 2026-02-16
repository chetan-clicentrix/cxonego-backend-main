import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad, OneToMany } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { ActivityPlan } from "./ActivityPlan";
import { User } from "./User";
import { ActivityPlanActionStatus, encryption, decrypt, ActivityPlanActionType } from "../common/utils";

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

    @Column({ type: "text", nullable: true })
    comments: string;

    @Column({
        type: "enum",
        enum: ActivityPlanActionType,
        default: ActivityPlanActionType.DEFAULT
    })
    actionType: ActivityPlanActionType;

    @Column({ type: "text", nullable: true })
    actionData: string; // JSON string storing user-submitted data (uploaded file info, selected values, etc.)

    @OneToMany(() => require("./SharePointDocument").SharePointDocument, (doc: any) => doc.activityPlanAction, {
        cascade: false
    })
    documents: any[]; // SharePoint documents uploaded for this action

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.actionName) this.actionName = encryption(this.actionName);
        if (this.stageName) this.stageName = encryption(this.stageName);
        if (this.description) this.description = encryption(this.description);
        if (this.remarks) this.remarks = encryption(this.remarks);
        if (this.comments) this.comments = encryption(this.comments);
        if (this.actionData) this.actionData = encryption(this.actionData);
    }

    @AfterLoad()
    decrypt() {
        if (this.actionName) this.actionName = decrypt(this.actionName);
        if (this.stageName) this.stageName = decrypt(this.stageName);
        if (this.description) this.description = decrypt(this.description);
        if (this.remarks) this.remarks = decrypt(this.remarks);
        if (this.comments) this.comments = decrypt(this.comments);
        if (this.actionData) this.actionData = decrypt(this.actionData);
    }
}
