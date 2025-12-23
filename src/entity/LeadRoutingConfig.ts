import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    Index,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { routingOperator, routingAssignToType, routingAttribute } from "../common/utils";

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

    @Index()
    @Column({
        type: "varchar",
        nullable: false,
    })
    organisationId: string;
}
