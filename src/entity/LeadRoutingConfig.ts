import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    Index,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
    BeforeUpdate
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Organisation } from "./Organisation";
import { routingOperator, routingAssignToType, routingAttribute, encryption } from "../common/utils";

@Entity()
export class LeadRoutingConfig extends CustomBaseEntity {
    constructor(payload?: Partial<LeadRoutingConfig>) {
        super();
        if (payload) {
            Object.assign(this, payload);
        }
    }

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({
        type: "enum",
        enum: routingAttribute,
        nullable: false,
    })
    attribute: routingAttribute;

    @Column({
        type: "enum",
        enum: routingOperator,
        nullable: false,
    })
    operator: routingOperator;

    @Column({
        type: "varchar",
        nullable: false,
    })
    value: string;

    @Column({
        type: "enum",
        enum: routingAssignToType,
        nullable: false,
    })
    assignToType: routingAssignToType;

    @Column({
        type: "varchar",
        nullable: false,
    })
    assignToId: string;

    @Index()
    @Column({
        type: "int",
        nullable: false,
    })
    priority: number;

    @Column({
        type: "varchar",
        nullable: false,
    })
    organizationId: string;

    @ManyToOne(() => Organisation, (organisation) => organisation.leadRoutingConfigs, {
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.value) {
            this.value = encryption(this.value);
        }
    }
}
