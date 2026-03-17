import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BeforeInsert, BeforeUpdate, AfterLoad, JoinColumn, ManyToOne } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { ActivityPlanTemplateAction } from "./ActivityPlanTemplateAction";
import { encryption, decrypt } from "../common/utils";
import { Organisation } from "./Organisation";

@Entity()
export class ActivityPlanTemplate extends CustomBaseEntity {
    constructor(payload: ActivityPlanTemplate) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryGeneratedColumn("uuid")
    templateId: string;

    @Column({ nullable: false })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Column({ nullable: true })
    category: string;

    @Column({ nullable: true })
    segment: string;

    @ManyToOne(() => Organisation, {
        nullable: true, // Optional for global templates
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @OneToMany(() => ActivityPlanTemplateAction, (action: ActivityPlanTemplateAction) => action.template, {
        cascade: true,
        eager: true
    })
    actions: ActivityPlanTemplateAction[];

    @Column({ type: "boolean", default: false })
    isDefault: boolean;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.name) this.name = encryption(this.name);
        if (this.description) this.description = encryption(this.description);
        if (this.category) this.category = encryption(this.category);
        if (this.segment) this.segment = encryption(this.segment);
    }

    @AfterLoad()
    decrypt() {
        if (this.name) this.name = decrypt(this.name);
        if (this.description) this.description = decrypt(this.description);
        if (this.category) this.category = decrypt(this.category);
        if (this.segment) this.segment = decrypt(this.segment);
    }
}
