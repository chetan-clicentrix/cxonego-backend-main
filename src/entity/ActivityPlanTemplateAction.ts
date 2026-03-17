import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { ActivityPlanTemplate } from "./ActivityPlanTemplate";
import { encryption, decrypt, ActivityPlanActionType } from "../common/utils";

@Entity()
export class ActivityPlanTemplateAction extends CustomBaseEntity {
    constructor(payload: ActivityPlanTemplateAction) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryGeneratedColumn("uuid")
    actionId: string;

    @ManyToOne(() => ActivityPlanTemplate, (template) => template.actions, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "templateId" })
    template: ActivityPlanTemplate;

    @Column({ type: "int", nullable: false })
    sequence: number;

    @Column({ nullable: false })
    stageName: string;

    @Column({ nullable: false })
    actionName: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "int", default: 0 })
    tatDays: number;

    @Column({ type: "int", default: 0 })
    tatHours: number;

    @Column({
        type: "enum",
        enum: ActivityPlanActionType,
        default: ActivityPlanActionType.DEFAULT
    })
    actionType: ActivityPlanActionType;

    @Column({ type: "text", nullable: true })
    actionConfig: string; // JSON string for type-specific config (e.g., dropdown options, file types)

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.actionName) this.actionName = encryption(this.actionName);
        if (this.stageName) this.stageName = encryption(this.stageName);
        if (this.description) this.description = encryption(this.description);
        if (this.actionConfig) this.actionConfig = encryption(this.actionConfig);
    }

    @AfterLoad()
    decrypt() {
        if (this.actionName) this.actionName = decrypt(this.actionName);
        if (this.stageName) this.stageName = decrypt(this.stageName);
        if (this.description) this.description = decrypt(this.description);
        if (this.actionConfig) this.actionConfig = decrypt(this.actionConfig);
    }
}
