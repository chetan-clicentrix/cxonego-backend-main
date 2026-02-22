import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Organisation } from "./Organisation";
import { User } from "./User";
import { CustomBaseEntity } from "./CustomBaseEntity";

@Entity()
export class AgentSkill extends CustomBaseEntity {
    constructor(payload: Partial<AgentSkill>) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    skillId: string;

    @Column({
        type: "varchar",
        nullable: false
    })
    skillName: string;

    @Column({
        type: "text",
        nullable: true
    })
    description: string;

    @Column({
        type: "text",
        nullable: false,
        comment: "The learned instructions, recipes, or multi-step logic."
    })
    instructions: string;

    @Column({
        type: "varchar",
        nullable: true,
        comment: "Comma-separated keywords to trigger this skill."
    })
    triggerKeywords: string;

    @Column({
        type: "int",
        default: 0
    })
    usageCount: number;

    @Column({
        type: "float",
        default: 5.0,
        comment: "Average success rating 1-5"
    })
    rating: number;

    @Column({
        type: "json",
        nullable: true,
        comment: "Vector embedding of the skill (skillName + description)"
    })
    embedding: number[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "authorId" })
    author: User;

    @ManyToOne(() => Organisation, { nullable: true })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;
}
