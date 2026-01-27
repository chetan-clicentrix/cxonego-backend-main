import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { ActivityPlanTemplate } from "./ActivityPlanTemplate";
import { encryption, decrypt } from "../common/utils";

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

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.actionName) this.actionName = encryption(this.actionName);
        if (this.stageName) this.stageName = encryption(this.stageName);
        if (this.description) this.description = encryption(this.description);
    }

    @AfterLoad()
    decrypt() {
        if (this.actionName) this.actionName = decrypt(this.actionName);
        if (this.stageName) this.stageName = decrypt(this.stageName);
        if (this.description) this.description = decrypt(this.description);
    }
}
