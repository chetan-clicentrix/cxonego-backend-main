import Action from "../entity/Action";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { Account } from "../entity/Account";
import { Contact } from "../entity/Contact";
import { Lead } from "./Lead";
import { Oppurtunity } from "./Oppurtunity";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { User } from "./User";
import { encryption } from "../common/utils";
import { Organisation } from "./Organisation";
import { Activity } from "./Activity";
import { Case } from "./Case";


@Entity()
export class Note extends CustomBaseEntity {
    constructor(payload: Note) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    noteId: string;

    @Column({
        type: "text",
    })
    note: string;

    @Column({
        length: 500,
        nullable: true
    })
    tags: string;

    @ManyToOne(() => Account, (Account) => Account.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true,
    })
    @JoinColumn({ name: "accountId" })
    company: Account;

    @ManyToOne(() => Contact, (Contact) => Contact.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "contactId" })
    contact: Contact;

    @ManyToOne(() => Lead, (Lead) => Lead.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "leadId" })
    Lead: Lead;

    @ManyToOne(() => Oppurtunity, (Oppurtunity) => Oppurtunity.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "opportunityId" })
    opportunity: Oppurtunity;

    @ManyToOne(() => Activity, (Activity) => Activity.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "activityId" })
    activity: Activity;

    @ManyToOne(() => User, (User) => User.notes, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;


    @ManyToOne(() => Organisation, (Organisation) => Organisation.notes, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @ManyToOne(() => Case, (caseItem) => caseItem.notes, {
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        eager: true,
        nullable: true
    })
    @JoinColumn({ name: "caseId" })
    case: Case;

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.note) this.note = encryption(this.note);
        if (this.tags) this.tags = encryption(this.tags);
    }

}

