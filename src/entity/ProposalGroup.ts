import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { Oppurtunity } from "./Oppurtunity";

@Entity("proposal_group")
export class ProposalGroup extends CustomBaseEntity {
    constructor(payload?: Partial<ProposalGroup>) {
        super();
        if (payload) Object.assign(this, payload);
    }

    @PrimaryColumn({ type: "varchar", length: 36 })
    proposalGroupId: string;

    @Column({ type: "varchar", length: 36, nullable: true })
    organizationId: string;

    @OneToMany(() => Oppurtunity, (opp) => opp.proposalGroup)
    opportunities: Oppurtunity[];
}
