import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate, JoinColumn, OneToMany, Index, PrimaryColumn } from "typeorm";
import { CustomBaseEntity } from "./CustomBaseEntity";
import { contactType, favourite, status } from "../common/utils";
import { IsEmail, Matches } from "class-validator";
import { Account } from "./Account";
import { v4 } from "uuid";
import { encryption } from "../common/utils";
import { Lead } from "./Lead";
import { Oppurtunity } from "./Oppurtunity";
import { Activity } from "./Activity";
import { User } from "./User";
import { Note } from "./Note";
import { Organisation } from "./Organisation";
import { Document } from "./Document";
import { Case } from "./Case";
import { SharePointDocument } from "./SharePointDocument";

@Entity()
export class Contact extends CustomBaseEntity {
    constructor(payload: Contact) {
        super();
        Object.assign(this, { ...payload });
    }

    @PrimaryGeneratedColumn('uuid')
    contactId: string;

    @Column({
        nullable: true
    })
    contactIdForUsers: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({
        nullable: true
    })
    countryCode: string;

    @Column({
        // unique:true,
        nullable: false
    })
    phone: string;

    @Column({ nullable: true })
    @IsEmail()
    email: string;

    @Column({
        nullable: false,
    })
    addressLine: string;

    @Column({
        nullable: false,
    })
    area: string;

    @Column()
    city: string;

    @Column()
    state: string;

    @Column({
        default: "India",
        nullable: false,
    })
    country: string;

    @ManyToOne(() => Account, (Account) => Account.contacts, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
    })
    @JoinColumn()
    company: Account;

    @OneToMany(() => Lead, (lead) => lead.contact)
    leads: Lead[];

    @Column({
        nullable: false
    })
    industry: string;

    @Column({
        nullable: true
    })
    designation: string;

    @Column({
        type: "text",
        nullable: true
    })
    description: string;

    @Column({
        nullable: true
    })
    social: string;

    @Column({
        nullable: true,
        default: "Creater"
    })
    timeline: string;

    @Column({
        nullable: true
    })
    profilePhoto: string;

    @Column({
        type: "enum",
        enum: status,
        nullable: true,
    })
    status: status; //Active/Inactive

    @Column({
        type: "enum",
        enum: favourite,
        nullable: true,
    })
    favourite: favourite; //Yes/No

    @Column({
        type: "enum",
        enum: contactType,
    })
    contactType: contactType;

    @OneToMany(() => Oppurtunity, (Oppurtunity) => Oppurtunity.contact)
    oppurtunities: Oppurtunity[];

    @OneToMany(() => Activity, Activity => Activity.contact)
    activity: Activity[];

    @ManyToOne(() => User, (User) => User.contact, {
        // onDelete:"CASCADE",
        onUpdate: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "ownerId" })
    owner: User;

    @OneToMany(() => Note, (Note) => Note.contact)
    notes: Note[];

    @ManyToOne(() => Organisation, (Organisation) => Organisation.contacts, {
        cascade: true,
        // onDelete: "CASCADE",
        onUpdate: "CASCADE",
        nullable: true,
        eager: true
    })
    @JoinColumn({ name: "organizationId" })
    organization: Organisation;

    @OneToMany(() => Document, (document) => document.contact)
    documents: Document[];

    @OneToMany(() => Case, (caseItem) => caseItem.customer)
    cases: Case[];

    @OneToMany(() => SharePointDocument, (doc) => doc.contact)
    sharepointDocuments: SharePointDocument[];

    /**
     * Get a display name suitable for folder creation
     * Returns a combination of first and last name, or Contact-ID if names are not available
     */
    getDisplayName(): string {
        let displayName = '';

        if (this.firstName) {
            displayName += this.firstName;
        }

        if (this.lastName) {
            if (displayName) displayName += ' ';
            displayName += this.lastName;
        }

        if (!displayName.trim()) {
            displayName = `Contact-${this.contactId}`;
        }

        return displayName;
    }

    @BeforeInsert()
    @BeforeUpdate()
    encrypt() {
        if (this.firstName) this.firstName = encryption(this.firstName);
        if (this.lastName) this.lastName = encryption(this.lastName);
        if (this.countryCode) this.countryCode = encryption(this.countryCode);
        if (this.phone) this.phone = encryption(this.phone);
        if (this.area) this.area = encryption(this.area);
        if (this.city) this.city = encryption(this.city);
        if (this.state) this.state = encryption(this.state);
        if (this.country) this.country = encryption(this.country);
        if (this.email) this.email = encryption(this.email);
        if (this.addressLine) this.addressLine = encryption(this.addressLine);
        if (this.industry) this.industry = encryption(this.industry);
        if (this.designation) this.designation = encryption(this.designation);
        if (this.description) this.description = encryption(this.description);
        if (this.social) this.social = encryption(this.social);

    }

}
