import {
    Entity,
    Column,
    PrimaryColumn,
    OneToMany,
    AfterInsert,
    AfterUpdate,
} from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Oppurtunity } from "./Oppurtunity";

@Entity()
export class OpportunityBatch extends CustomBaseEntity {

    constructor(payload?: Partial<OpportunityBatch>) {
        super();
        if (payload) {
            Object.assign(this, payload);
        }
    }

    @PrimaryColumn()
    batchId: string;

    @Column({
        type: "varchar",
        default: "Active",
    })
    status: string;

    @OneToMany(() => Oppurtunity, (opportunity) => opportunity.batch)
    opportunities: Oppurtunity[];

    @AfterInsert()
    auditHandlerAfterInsert() {
        console.log(this);
    }

    @AfterUpdate()
    auditHandlerAfterUpdate() {
        console.log(this);
    }
}
