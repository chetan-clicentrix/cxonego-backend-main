import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Organisation } from "./Organisation";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { encryption, proficiencyLevel } from "../common/utils";

@Entity()
export class Skill extends CustomBaseEntity {
    constructor(payload: Partial<Skill>) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    skillId: string;

    @Column({
        type: "varchar",
        nullable: false
    })
    name: string;

    @Column({
        type: "varchar",
        nullable: true
    })
    category: string;

    @Column({
        type: "enum",
        enum: proficiencyLevel,
        default: proficiencyLevel.BEGINNER
    })
    proficiencyLevel: proficiencyLevel;

    @Column({
        type: "int",
        nullable: true,
        default: 0
    })
    yearsOfExperience: number;

    @Column({
        type: "boolean",
        default: false
    })
    isCertified: boolean;

    @Column({
        type: "varchar",
        nullable: true
    })
    certificationName: string;

    @Column({
        type: "date",
        nullable: true
    })
    lastUsedDate: Date;

    @ManyToOne(() => User, (user) => user.skills, {
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @ManyToOne(() => Organisation, (organisation) => organisation.skills, {
        cascade: true,
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @BeforeInsert()
    @BeforeUpdate()
    encryptFields() {
        if (this.name) this.name = encryption(this.name);
        if (this.category) this.category = encryption(this.category);
        if (this.certificationName) this.certificationName = encryption(this.certificationName);
    }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Skill:
 *       type: object
 *       properties:
 *         skillId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         proficiencyLevel:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced, Expert]
 *         yearsOfExperience:
 *           type: integer
 *         isCertified:
 *           type: boolean
 *         certificationName:
 *           type: string
 *         lastUsedDate:
 *           type: string
 *           format: date
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
