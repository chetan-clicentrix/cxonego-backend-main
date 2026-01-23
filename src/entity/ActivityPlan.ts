import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Oppurtunity } from "./Oppurtunity";
import { Lead } from "./Lead";
import { Organisation } from "./Organisation";
import { User } from "./User"; // Assuming there's a creator
import { ActivityPlanStatus, encryption, decrypt } from "../common/utils";
import { ActivityPlanAction } from "./ActivityPlanAction";

@Entity()
export class ActivityPlan extends CustomBaseEntity {
    constructor(payload: ActivityPlan) {
        super();
        Object.assign(this, payload);
    }

    @PrimaryGeneratedColumn("uuid")
    planId: string;

    @Column({ nullable: false })
    name: string;

    @ManyToOne(() => Oppurtunity, (opportunity) => opportunity.activityPlans, {
        nullable: true,
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "opportunityId" })
    opportunity: Oppurtunity;

    @ManyToOne(() => Lead, {
        nullable: true,
        onDelete: "SET NULL",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "leadId" })
    lead: Lead;

    @ManyToOne(() => Organisation, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @Column({
        type: "enum",
        enum: ActivityPlanStatus,
        default: ActivityPlanStatus.ACTIVE
    })
    status: ActivityPlanStatus;

    @OneToMany(() => ActivityPlanAction, (action) => action.plan, {
        cascade: true,
        eager: true
    })
    actions: ActivityPlanAction[];

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.name) this.name = encryption(this.name);
    }

    @AfterLoad()
    decrypt() {
        if (this.name) this.name = decrypt(this.name);
    }
}
